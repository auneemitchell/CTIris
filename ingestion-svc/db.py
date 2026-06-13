"""
Database connection and query helpers for the ingestion service.

The ingestion service now uses the shared ORM models from ``db-svc`` as
the single source of truth for table definitions. This keeps the DB contract
in one place while still letting the service build SQLAlchemy statements.
"""

import logging
import os
import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ctiris_db.models import Feed, IngestionLog, StixObject

logger = logging.getLogger(__name__)

# Seed values for the MITRE ATT&CK feed row.  The URL doubles as the unique
# key so running ensure_mitre_feed() multiple times is always safe (idempotent).
MITRE_FEED_NAME = "MITRE ATT&CK Enterprise"
MITRE_FEED_URL = "https://attack-taxii.mitre.org/taxii2/"
MITRE_POLL_FREQUENCY_MIN = 60  # value seeded into feeds.poll_frequency_min

# Number of STIX objects sent in a single INSERT statement. Larger batches
# are faster but consume more memory and risk hitting Postgres parameter limits
# (~65 k per statement).  500 rows × ~10 columns is well within safe bounds.
_CHUNK_SIZE = 500

# Shared ORM models are the source of truth; use their table metadata here.
feeds_table = Feed.__table__
stix_objects_table = StixObject.__table__
ingestion_log_table = IngestionLog.__table__

_engine: sa.Engine | None = None


def get_engine() -> sa.Engine:
    """Return the shared SQLAlchemy engine, creating it on first call.

    Caches the engine in a module-level singleton so all callers share one
    connection pool for the lifetime of the process.  Falls back to the
    Docker Compose service hostname when ``DATABASE_URL`` is not set.
    """
    global _engine
    if _engine is None:
        url = os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@postgres:5432/ctiris",
        )
        _engine = sa.create_engine(url, pool_pre_ping=True)
    return _engine


def _parse_ts(raw: object) -> datetime | None:
    """Parse a STIX timestamp string into a timezone-aware ``datetime``.

    STIX 2.1 timestamps use RFC 3339 / ISO 8601 format with a ``Z`` suffix
    (e.g. ``"2021-01-01T00:00:00.000Z"``).  Python's ``fromisoformat`` does
    not accept ``Z`` directly until 3.11, so we normalise it to ``+00:00``.

    Returns ``None`` for any input that is not a parseable string so that
    malformed STIX objects do not crash the upsert pipeline.
    """
    if not isinstance(raw, str):
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def ensure_mitre_feed(conn: sa.Connection) -> None:
    """Ensure the MITRE ATT&CK feed row exists in the ``feeds`` table.

    Uses ``INSERT … ON CONFLICT DO NOTHING`` so calling this function
    repeatedly is safe — the row is created on the first call and left
    untouched on all subsequent calls.

    This function seeds the one hardcoded MITRE feed that the ingestion
    service uses until the API/UI layer allows users to configure their own
    feeds.  At that point, feed rows will be inserted by the API and this
    function can be removed.

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).
    """
    stmt = (
        pg_insert(feeds_table)
        .values(
            name=MITRE_FEED_NAME,
            url=MITRE_FEED_URL,
            enabled=True,
            poll_frequency_min=MITRE_POLL_FREQUENCY_MIN,
            status="active",
        )
        .on_conflict_do_nothing(index_elements=["url"])
    )
    conn.execute(stmt)
    logger.debug("MITRE ATT&CK feed row ensured")


def get_enabled_feeds(conn: sa.Connection) -> list[dict]:
    """Return all enabled feeds from the ``feeds`` table.

    Each dict contains the fields needed by the sync runner:
    ``id``, ``name``, ``url``, and ``last_polled_at``.

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).

    Returns:
        List of feed dicts, one per enabled feed row.  Empty when no feeds
        are enabled.
    """
    rows = conn.execute(
        sa.select(
            feeds_table.c.id,
            feeds_table.c.name,
            feeds_table.c.url,
            feeds_table.c.last_polled_at,
            feeds_table.c.auth_credentials,
        ).where(feeds_table.c.enabled == sa.true())
    ).mappings().fetchall()
    return [dict(row) for row in rows]


def get_due_feeds(conn: sa.Connection) -> list[dict]:
    """Return enabled feeds that are due for their next poll.

    A feed is due when:
    - ``last_polled_at`` is ``NULL`` (never synced), or
    - ``last_polled_at`` + ``poll_frequency_min`` minutes <= now.

    Args:
        conn: An open SQLAlchemy connection.

    Returns:
        List of feed dicts for feeds that should be synced now.
    """
    due = sa.or_(
        feeds_table.c.last_polled_at.is_(None),
        feeds_table.c.last_polled_at
        + (feeds_table.c.poll_frequency_min * sa.text("INTERVAL '1 minute'"))
        <= sa.func.now(),
    )
    rows = conn.execute(
        sa.select(
            feeds_table.c.id,
            feeds_table.c.name,
            feeds_table.c.url,
            feeds_table.c.poll_frequency_min,
            feeds_table.c.last_polled_at,
            feeds_table.c.auth_credentials,
        ).where(feeds_table.c.enabled == sa.true(), due)
    ).mappings().fetchall()
    return [dict(row) for row in rows]


def get_feed_by_id(conn: sa.Connection, feed_id: uuid.UUID) -> dict | None:
    """Return a single feed row by its UUID, or ``None`` if not found.

    Includes ``auth_credentials`` so the sync runner can decrypt credentials
    for feeds that require Basic Auth.

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).
        feed_id: UUID of the feed to look up.

    Returns:
        Feed dict or ``None``.
    """
    row = conn.execute(
        sa.select(
            feeds_table.c.id,
            feeds_table.c.name,
            feeds_table.c.url,
            feeds_table.c.enabled,
            feeds_table.c.poll_frequency_min,
            feeds_table.c.last_polled_at,
            feeds_table.c.auth_credentials,
            feeds_table.c.status,
            feeds_table.c.created_at,
        ).where(feeds_table.c.id == feed_id)
    ).mappings().fetchone()
    return dict(row) if row is not None else None


def insert_feed(
    conn: sa.Connection,
    *,
    name: str,
    url: str,
    poll_frequency_min: int,
    enabled: bool = True,
    auth_credentials: bytes | None = None,
) -> dict | None:
    """Insert a new feed row and return it, or ``None`` on a URL conflict.

    Uses ``INSERT … ON CONFLICT DO NOTHING`` on the ``url`` unique index so
    duplicate submissions are handled cleanly without raising an exception.
    When the URL already exists the function returns ``None`` and the caller
    is responsible for returning an appropriate HTTP error (409).

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).
        name: Human-readable feed name.
        url: TAXII 2.1 discovery URL (must be unique).
        poll_frequency_min: How often to poll this feed, in minutes.
        enabled: Whether the feed is active on creation.
        auth_credentials: Optional Fernet-encrypted JSON bytes containing
            ``{"username": ..., "password": ...}`` for Basic Auth feeds.

    Returns:
        Inserted feed dict (all columns), or ``None`` if the URL already exists.
    """
    stmt = (
        pg_insert(feeds_table)
        .values(
            name=name,
            url=url,
            poll_frequency_min=poll_frequency_min,
            enabled=enabled,
            auth_credentials=auth_credentials,
            status="active",
        )
        .on_conflict_do_nothing(index_elements=["url"])
        .returning(
            feeds_table.c.id,
            feeds_table.c.name,
            feeds_table.c.url,
            feeds_table.c.enabled,
            feeds_table.c.poll_frequency_min,
            feeds_table.c.last_polled_at,
            feeds_table.c.status,
            feeds_table.c.created_at,
        )
    )
    row = conn.execute(stmt).mappings().fetchone()
    return dict(row) if row is not None else None


def _build_rows(objects: list[dict], feed_id: uuid.UUID) -> list[dict]:
    """Convert raw STIX object dicts into database row dicts.

    Malformed objects that are missing an ``id`` field are silently dropped
    so a single bad object cannot crash the entire upsert batch.

    Args:
        objects: Raw STIX 2.1 object dicts from the TAXII client.
        feed_id: UUID of the feed that sourced these objects.

    Returns:
        List of row dicts ready to pass to a SQLAlchemy INSERT statement.
    """
    rows: list[dict] = []
    for obj in objects:
        stix_id = obj.get("id")
        if not stix_id:
            continue
        rows.append(
            {
                "stix_id": stix_id,
                "type": obj.get("type", "unknown"),
                "feed_id": feed_id,
                "properties": obj,
                "stix_created": _parse_ts(obj.get("created")),
                "stix_modified": _parse_ts(obj.get("modified")),
            }
        )
    return rows


def upsert_objects(
    conn: sa.Connection,
    objects: list[dict],
    feed_id: uuid.UUID,
) -> tuple[int, int, int]:
    """Batch-upsert STIX objects into ``stix_objects``.

    Each object is inserted by its ``stix_id`` primary key.  When a conflict
    occurs (the object already exists) the row is updated **only if** the
    incoming ``stix_modified`` timestamp is strictly newer than what is stored.
    This prevents an older version of an object from overwriting a newer one
    if feeds are polled out of order.

    The PostgreSQL ``xmax`` system column is used to distinguish inserts from
    updates in the RETURNING clause:
    - ``xmax = 0``  → row was freshly inserted
    - ``xmax > 0``  → row was updated
    - row not returned → conflict existed but WHERE condition was false (skipped)

    ``skipped`` includes both objects that lost the timestamp comparison AND
    objects that were dropped by ``_build_rows`` for missing an ``id`` field,
    so ``new + updated + skipped`` always equals the length of the input
    ``objects`` list.

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).
        objects: Raw STIX object dicts as returned by the TAXII client.
        feed_id: UUID of the feed row that sourced these objects.

    Returns:
        ``(new, updated, skipped)`` counts.
    """
    if not objects:
        return 0, 0, 0

    rows = _build_rows(objects, feed_id)

    # Use len(objects) — not len(rows) — so that objects dropped by
    # _build_rows (missing id field) are counted in the skipped total.
    total_received = len(objects)

    if not rows:
        return 0, 0, total_received
    total_new = 0
    total_updated = 0

    for i in range(0, len(rows), _CHUNK_SIZE):
        chunk = rows[i : i + _CHUNK_SIZE]

        stmt = (
            pg_insert(stix_objects_table)
            .values(chunk)
            .on_conflict_do_update(
                index_elements=["stix_id"],
                set_={
                    "properties": sa.text("EXCLUDED.properties"),
                    "stix_modified": sa.text("EXCLUDED.stix_modified"),
                    "feed_id": sa.text("EXCLUDED.feed_id"),
                },
                # Only overwrite the stored row when the incoming object is
                # strictly newer.  Objects without a modified timestamp
                # (stix_modified IS NULL) are always overwritten.
                where=sa.text(
                    "stix_objects.stix_modified IS NULL "
                    "OR stix_objects.stix_modified < EXCLUDED.stix_modified"
                ),
            )
            .returning(sa.text("(xmax = 0)::int AS is_new"))
        )

        result = conn.execute(stmt)
        returned = result.fetchall()
        chunk_new = sum(r[0] for r in returned)
        chunk_updated = len(returned) - chunk_new
        total_new += chunk_new
        total_updated += chunk_updated

    total_skipped = max(0, total_received - total_new - total_updated)
    return total_new, total_updated, total_skipped


def write_log(  # pylint: disable=too-many-arguments
    conn: sa.Connection,
    *,
    feed_id: uuid.UUID,
    polled_at: datetime,
    items_received: int,
    items_new: int,
    items_updated: int,
    status: str,
    errors: dict | None = None,
) -> None:
    """Append a row to ``ingestion_log`` recording the outcome of a sync run.

    All arguments after ``conn`` are keyword-only to prevent accidental
    positional mismatches when the caller passes multiple integer counts.

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).
        feed_id: UUID of the feed that was synced.
        polled_at: Timestamp when the sync started (UTC).
        items_received: Total objects returned by the TAXII server.
        items_new: Objects inserted for the first time.
        items_updated: Objects that replaced an older stored version.
        status: One of ``"success"``, ``"partial"``, or ``"failed"``.
        errors: Optional dict with ``type`` and ``message`` keys when the
            sync encountered an exception.
    """
    conn.execute(
        ingestion_log_table.insert().values(
            feed_id=feed_id,
            polled_at=polled_at,
            items_received=items_received,
            items_new=items_new,
            items_updated=items_updated,
            status=status,
            errors=errors,
        )
    )


def update_feed_status(
    conn: sa.Connection,
    feed_id: uuid.UUID,
    polled_at: datetime,
    status: str,
) -> None:
    """Update ``last_polled_at`` and ``status`` on the feed row after a sync.

    ``last_polled_at`` is used by the next sync cycle as the ``added_after``
    parameter for incremental fetches, so it must always reflect the start
    time of the most recent attempt (even failed ones).

    Args:
        conn: An open SQLAlchemy connection (inside a transaction).
        feed_id: UUID of the feed to update.
        polled_at: Timestamp when the sync started (UTC).
        status: Either ``"active"`` (success) or ``"error"`` (failure).
    """
    conn.execute(
        feeds_table.update()
        .where(feeds_table.c.id == feed_id)
        .values(last_polled_at=polled_at, status=status)
    )

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


def get_engine() -> sa.Engine:
    """Create a SQLAlchemy engine from the ``DATABASE_URL`` environment variable.

    Falls back to the Docker Compose service hostname when the variable is not
    set, which is the common case when running inside the container.

    Note: this creates a new engine on every call.  For the ingestion service's
    usage pattern (one sync cycle per hour) the overhead is negligible, but
    callers that need connection pooling should cache the returned engine.
    """
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@postgres:5432/ctiris",
    )
    return sa.create_engine(url, pool_pre_ping=True)


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
        ).where(feeds_table.c.enabled == sa.true())
    ).mappings().fetchall()
    return [dict(row) for row in rows]


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

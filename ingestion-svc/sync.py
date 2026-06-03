"""
Sync orchestration: one full cycle per enabled feed.

``run_sync`` is called by the scheduler on each interval tick and on container
startup.  It queries all enabled feeds from the database, then calls
``sync_one_feed`` for each one independently so a failure on one feed does
not prevent the others from running.

Current state: only the MITRE ATT&CK feed exists (seeded automatically).
Future: when the API/UI allows users to add their own TAXII feeds, those rows
will appear in the ``feeds`` table and be picked up here automatically with
no code changes required — ``ensure_mitre_feed`` can be removed at that point.
"""

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import sqlalchemy as sa
from cryptography.fernet import Fernet, InvalidToken

from db import (
    ensure_mitre_feed,
    get_due_feeds,
    get_engine,
    update_feed_status,
    upsert_objects,
    write_log,
)
from taxii_client import fetch_stix_objects

logger = logging.getLogger(__name__)

# Maximum number of feeds synced concurrently.  Each worker makes blocking
# network calls (TAXII fetch) and DB writes, so I/O-bound threading scales
# well here.  Cap prevents runaway thread counts when many feeds are configured.
_MAX_SYNC_WORKERS = 10


def sync_one_feed(engine: sa.Engine, feed: dict) -> None:
    """Execute one complete ingestion cycle for a single feed.

    Steps:
        1. Fetch STIX objects from the feed's TAXII server.  On the first run
           (``last_polled_at`` is ``None``) the full collection is downloaded;
           on subsequent runs only objects modified since ``last_polled_at``
           are fetched (incremental).
        2. Batch-upsert objects into ``stix_objects``.
        3. Write an ``ingestion_log`` row and update ``feeds.last_polled_at``
           regardless of whether the sync succeeded or failed, so the next
           run starts from the correct checkpoint.

    Exceptions from the TAXII fetch or upsert are caught and recorded in
    ``ingestion_log.errors`` rather than propagated, so a single failing feed
    does not interrupt other feeds in the same sync cycle.

    Args:
        engine: SQLAlchemy engine (shared across all feeds in one sync cycle).
        feed: Dict with keys ``id``, ``name``, ``url``, ``last_polled_at``
            as returned by ``get_enabled_feeds``.
    """
    feed_id = feed["id"]
    started_at = datetime.now(tz=timezone.utc)

    status = "success"
    errors: dict | None = None
    items_received = items_new = items_updated = 0

    logger.info(
        "Starting sync — feed: %s, feed_id: %s, last_polled_at: %s",
        feed["name"],
        feed_id,
        feed["last_polled_at"],
    )

    user: str | None = None
    password: str | None = None
    if feed.get("auth_credentials"):
        enc_key = os.environ.get("CREDENTIALS_ENCRYPTION_KEY")
        if enc_key:
            try:
                f = Fernet(enc_key.encode())
                creds = json.loads(f.decrypt(feed["auth_credentials"]).decode())
                user = creds.get("username")
                password = creds.get("password")
            except (InvalidToken, KeyError, json.JSONDecodeError) as exc:
                logger.warning(
                    "Failed to decrypt credentials for feed %s: %s",
                    feed["name"],
                    exc,
                )
        else:
            logger.warning(
                "CREDENTIALS_ENCRYPTION_KEY not set — syncing feed %s without auth",
                feed["name"],
            )

    try:
        raw_objects = fetch_stix_objects(
            server_url=feed["url"],
            added_after=feed["last_polled_at"],
            user=user,
            password=password,
        )
        items_received = len(raw_objects)
        logger.info("Fetched %d STIX objects from %s", items_received, feed["name"])

        with engine.begin() as conn:
            items_new, items_updated, items_skipped = upsert_objects(
                conn, raw_objects, feed_id
            )

        logger.info(
            "Upsert complete — new: %d, updated: %d, skipped: %d",
            items_new,
            items_updated,
            items_skipped,
        )

    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("Sync failed for feed %s: %s", feed["name"], exc)
        status = "failed"
        errors = {"type": type(exc).__name__, "message": str(exc)}

    # Always persist the outcome so the next cycle has an accurate checkpoint.
    # Wrapped in its own try/except so a transient DB write failure here does
    # not prevent other feeds from being synced.
    feed_status = "error" if status == "failed" else "active"
    try:
        with engine.begin() as conn:
            update_feed_status(conn, feed_id, started_at, feed_status)
            write_log(
                conn,
                feed_id=feed_id,
                polled_at=started_at,
                items_received=items_received,
                items_new=items_new,
                items_updated=items_updated,
                status=status,
                errors=errors,
            )
    except Exception as persist_exc:  # pylint: disable=broad-exception-caught
        logger.error(
            "Failed to write checkpoint for feed %s — next run will re-sync: %s",
            feed["name"],
            persist_exc,
        )

    logger.info(
        "Sync %s — feed: %s, received: %d, new: %d, updated: %d%s",
        status,
        feed["name"],
        items_received,
        items_new,
        items_updated,
        f" | error: {errors['message']}" if errors else "",
    )


def run_sync() -> None:
    """Sync all enabled feeds.

    Queries the ``feeds`` table for enabled rows, seeds the MITRE ATT&CK feed
    if it does not yet exist, then calls ``sync_one_feed`` for each row.

    A failure to reach the database (e.g. Postgres is not yet ready) is caught
    and logged so the APScheduler job does not crash — it will retry on the
    next tick.
    """
    engine = get_engine()

    try:
        with engine.begin() as conn:
            ensure_mitre_feed(conn)
            feeds = get_due_feeds(conn)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("Failed to load feeds from database: %s", exc)
        return

    if not feeds:
        logger.warning("No enabled feeds found — nothing to sync")
        return

    logger.info("Syncing %d enabled feed(s)", len(feeds))
    workers = min(len(feeds), _MAX_SYNC_WORKERS)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(sync_one_feed, engine, feed): feed for feed in feeds}
        for future in as_completed(futures):
            feed = futures[future]
            try:
                future.result()
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.error(
                    "Unhandled error in sync thread for feed %s: %s",
                    feed["name"],
                    exc,
                )

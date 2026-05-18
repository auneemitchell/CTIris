"""
Entry point for the ingestion-svc Docker container.

Runs an immediate sync on startup so data is available as soon as the
container comes up, then hands off to APScheduler's ``BlockingScheduler``
which keeps the process alive and fires ``run_sync`` on a fixed interval.

``BlockingScheduler`` is used (rather than ``BackgroundScheduler``) because
this process has no other work to do between syncs — it can simply block the
main thread and let APScheduler own the event loop.
"""

import logging
import sys

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from sync import run_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# How often to run the sync cycle.  Hourly is sufficient for MITRE ATT&CK,
# which publishes updates periodically rather than in real-time.
#
# Future: when users can configure per-feed intervals via the UI, replace this
# fixed interval with a short tick (e.g. 1 minute) and have runner.py query
# the feeds table for rows where:
#   last_polled_at + (poll_frequency_min * interval '1 minute') <= NOW()
# That makes poll_frequency_min in the database the authoritative schedule for
# each feed, with no hardcoded interval needed here.
SYNC_INTERVAL_HOURS = 1


def main() -> None:
    """Start the ingestion service: run one sync immediately, then schedule."""
    logger.info("Ingestion service starting up")

    logger.info("Running initial sync...")
    run_sync()

    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_sync,
        trigger=IntervalTrigger(hours=SYNC_INTERVAL_HOURS),
        id="mitre_sync",
        name="MITRE ATT&CK sync",
        replace_existing=True,
    )

    logger.info(
        "Scheduler started — next sync in %d hour(s)", SYNC_INTERVAL_HOURS
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Ingestion service shutting down")


if __name__ == "__main__":
    main()

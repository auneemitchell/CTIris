# ingestion-svc

Polls all enabled TAXII 2.1 feeds on a 1-hour schedule and upserts STIX
objects into the shared PostgreSQL database. Currently seeded with one feed
(MITRE ATT&CK Enterprise); additional feeds are added via the API/UI.

## How it works

1. On startup, seeds a `feeds` row for MITRE ATT&CK Enterprise if one doesn't exist.
2. Queries the `feeds` table for all enabled rows.
3. Syncs each feed concurrently (up to 10 at a time) using a thread pool — each feed is independent, so a failure on one does not affect others.
4. Per feed: fetches STIX objects from the feed's TAXII server (full sync on first run, incremental thereafter using `last_polled_at`), with a 30-second request timeout.
5. Batch-upserts into `stix_objects` — only overwrites a row if the incoming object has a newer `modified` timestamp.
6. Logs each run to `ingestion_log` and updates `feeds.last_polled_at`.
7. Repeats every hour.

## File structure

| File | Purpose |
|------|---------|
| `scheduler.py` | Entry point — runs an immediate sync on startup, then schedules hourly repeats via APScheduler |
| `sync.py` | Orchestration — queries enabled feeds, runs `_sync_one_feed` concurrently via `ThreadPoolExecutor` |
| `taxii_client.py` | TAXII 2.1 client — generic, works with any TAXII server via `server_url` / `collection_title` parameters |
| `db.py` | Database helpers — mirrors Alembic schema for INSERT/UPDATE statements; owns no migrations |

## Testing

### Unit tests (no Docker or network required)

All TAXII and database calls are mocked — runs fully offline.

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
pytest tests/ --cov=. --cov-report=term-missing  # with coverage
```

### End-to-end test (Docker)

Runs the full pipeline: Postgres → schema migrations → TAXII fetch → upsert.

```bash
# From the project root:
docker compose up --build
```

Watch ingestion logs in a second terminal:
```bash
docker compose logs -f ingestion-svc
```

A successful first sync should show "Fetch complete" and "Sync success" in the logs.
The first full sync could take a couple minutes. Subsequent runs are incremental and much faster.

Verify data in Postgres:
```bash
# Object counts by STIX type
docker compose exec postgres psql -U postgres -d ctiris \
  -c "SELECT type, COUNT(*) FROM stix_objects GROUP BY type ORDER BY count DESC;"

# Recent ingestion log entries
docker compose exec postgres psql -U postgres -d ctiris \
  -c "SELECT status, items_received, items_new, items_updated, polled_at FROM ingestion_log ORDER BY polled_at DESC LIMIT 5;"

# 5 most recent malware objects
docker compose exec postgres psql -U postgres -d ctiris \
  -x -c "SELECT properties FROM stix_objects WHERE type = 'malware' ORDER BY ingested_at DESC LIMIT 5;"
```

## TO DO

When the API and frontend are ready, users will add TAXII feeds through the UI.
We'll need to remove the MITRE default constants and instead pull the feed list from the DB. 
The scheduler SYNC_INTERVAL_HOURS instead will need to updated to short time like 1 minute to check what rows are due using the feeds table:
  ```sql
  SELECT * FROM feeds
  WHERE enabled = true
    AND (last_polled_at IS NULL
         OR last_polled_at + (poll_frequency_min * interval '1 minute') <= NOW());
  ```
  This will makes each feed's `poll_frequency_min` the schedule, configurable
  per feed from the UI.

Currently db.py mirrors the Alembic table definitions manually, which isn't scalable if the schema changes. This makes it easier to run unit tests without a live database. Once the backend has SQLAlchemy ORM models, they can be moved into a shared package and imported into db.py to remove the manual mirror requirement.

Once the API allows adding credentials for feeds (if required), we'll need the auth_credentials column in the feeds table to encrypt at the application level (i.e. using .env encryption key), since the TAXII client will need to pass the username and password/auth object to Server().

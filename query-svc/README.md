# query-svc

Read-only API for accessing the CTIris database. Exposes STIX threat intelligence objects, feed configurations, and ingestion history over HTTP. Intended to be called by the API gateway, not directly by the frontend.

Interactive API docs (Swagger UI) are available at `http://localhost:8000/docs` when the service is running.

## How it works

The query service connects to the same shared Postgres instance as the ingestion service. It does not write any data — it only reads from three tables:

- `stix_objects` — STIX threat intelligence objects ingested from CTI feeds
- `feeds` — feed configurations and their current status
- `ingestion_log` — history of past ingestion runs

Requests come in via FastAPI, SQLAlchemy builds and runs the query, and results are returned as JSON.

## File structure

```
query-svc/
├── main.py                # FastAPI app and all route handlers
├── db.py                  # Database connection; imports shared ORM table definitions from ctiris_db
├── requirements.txt       # Python dependencies
├── requirements-dev.txt   # Dev/test dependencies
├── Dockerfile             # Container build instructions
├── .dockerignore
└── tests/
    ├── conftest.py        # Shared pytest fixtures (mock DB override)
    └── test_main.py       # Endpoint and serialization tests
```

## Running locally

With Docker Compose from the project root. To bring up only query-svc and its dependencies:

```bash
docker compose up postgres backend-migrations query-svc
```

Or to bring up the entire stack:

```bash
docker compose up
```

Add `--build` to either command if you have made code changes. The service will be available at `http://localhost:8000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Check if the service is up |
| GET | `/stix` | List STIX objects (filterable by type, paginated) |
| GET | `/stix/{stix_id}` | Get a single STIX object by ID |
| GET | `/feeds` | List all configured feeds |
| GET | `/feeds/{feed_id}` | Get a single feed by UUID |
| GET | `/ingestion-log` | List ingestion history (filterable by feed) |

See `/docs` for full parameter details and example responses.

## Testing

### Unit tests (no Docker or network required)

Install dev dependencies and run pytest:

```bash
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

The DB dependency is mocked in all tests, no Postgres connection needed.

Note: depending on your system, you may need `python3`/`pip3`, or `pytest` may be available directly as a command without the `python -m` prefix.

## TO DO

- Add `ALLOWED_ORIGIN=http://api-gateway:PORT` to `query-svc` environment in `docker-compose.yml` once the API gateway is ready

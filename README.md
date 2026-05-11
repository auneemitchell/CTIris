# CTIris
Capstone Project for North Seattle College CS BS Program

## Database migrations (Alembic + PostgreSQL)

The migration workspace lives in `backend/`.

### Automated setup with Docker

Simply run:

```bash
docker compose up
```

This automatically:
- Starts PostgreSQL
- Builds the backend container
- Waits for PostgreSQL to be ready
- Runs `alembic upgrade head` to apply all migrations

The containers will be running in the foreground. Press `Ctrl+C` to stop.

To run in the background:

```bash
docker compose up -d
```

To stop:

```bash
docker compose down
```

### Notes
- `DATABASE_URL` is passed via environment in Docker or loaded from `.env` for local development.
- Baseline schema creates `feeds`, `stix_objects`, and `ingestion_log`.
- `feeds.id` and `ingestion_log.id` use UUIDv7 defaults via `generate_uuid_v7()`.

## Run hello-docker using Docker Compose

In the base directory:

### Start
```bash
docker compose up -d
```

Notes:
- Runs all services in `docker-compose.yml` file
- `-d` runs the services in the background

### Stop
```bash
docker compose down
```

Notes:
- Automatically stops and removes all containers.

# CTIris
Capstone Project for North Seattle College CS BS Program

## Database migrations (Alembic + PostgreSQL)

The migration workspace lives in `backend/`.

### One-time setup

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

### Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
```

### Run migrations

From `backend/`:

```bash
alembic upgrade head
```

Rollback to base:

```bash
alembic downgrade base
```

Show current revision:

```bash
alembic current
```

### Notes
- `DATABASE_URL` is loaded from environment or `.env` (see `backend/.env.example`).
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
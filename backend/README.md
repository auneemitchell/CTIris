# Backend Migration Workspace

This directory owns database schema migrations for CTIris and will eventually contain the backend API service.

## Docker setup (recommended)

From the repository root, simply run:

```bash
docker compose up
```

The backend Dockerfile automatically:
1. Installs Python dependencies
2. Configures Alembic
3. Runs migrations against PostgreSQL

## Local development setup

If you prefer local development without Docker:

1. Create and activate a virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if needed.
4. Run `alembic upgrade head`.

## Alembic commands

```bash
alembic current
alembic upgrade head
alembic downgrade -1
alembic downgrade base
```

## UUIDv7

The baseline migration installs a PostgreSQL function named `generate_uuid_v7()`.
`feeds.id` and `ingestion_log.id` default to this function.

## Future API service

This Dockerfile can be extended to run the backend API server instead of just migrations.


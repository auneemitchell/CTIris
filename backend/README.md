# Backend Migration Workspace

This directory owns database schema migrations for CTIris.

## Quick start

1. Create and activate a virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if needed.
4. Run `alembic upgrade head`.

## Commands

```bash
alembic current
alembic upgrade head
alembic downgrade -1
alembic downgrade base
```

## UUIDv7

The baseline migration installs a PostgreSQL function named `generate_uuid_v7()`.
`feeds.id` and `ingestion_log.id` default to this function.

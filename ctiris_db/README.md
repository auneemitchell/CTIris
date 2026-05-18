"""CTIris — Self-Hosted STIX/TAXII Threat Intelligence Dashboard

This is a monorepo containing three Python packages:

1. **ctiris_db** — Shared ORM models and Alembic migrations
2. **api** — FastAPI microservice for feeds CRUD and dashboard queries
3. **ingestion** — TAXII polling and STIX ingestion service (sibling project)

## Local Development Setup

### Prerequisites
- Python >=3.11 (3.12 preferred)
- PostgreSQL 16+
- pip or uv (for dependency management)

### Install and Activate Environment

```bash
# Install packages
cd ctiris_db && pip install -e .
cd ../api && pip install -e ".[dev]"

# Or using uv (recommended)
cd api && uv sync
```

### Run Migrations

```bash
cd ctiris_db
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/ctiris"
alembic upgrade head
```

### Start the API Server

```bash
cd api
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/ctiris"
export FERNET_KEY="GbUSRMaQH_jCOXZ8ydcxB94FfU1st7y_IgvA1edUbBU="
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs for interactive API documentation.

### Docker Compose (All-in-One)

```bash
docker compose up --build
```

The API will be available at http://localhost:8000 after migrations complete.

## Architecture

### Monorepo Layout

```
ctiris/
├── ctiris_db/              # Shared package: ORM models + migrations
│   ├── src/ctiris_db/
│   │   ├── base.py         # DeclarativeBase
│   │   ├── models/         # ORM model definitions
│   │   └── __init__.py
│   ├── alembic/            # Alembic migrations for the shared schema
│   ├── alembic.ini
│   └── pyproject.toml
│
├── api/                    # FastAPI microservice
│   ├── app/
│   │   ├── main.py         # FastAPI app + lifespan
│   │   ├── config.py       # Settings (pydantic-settings)
│   │   ├── database.py     # Async engine + session factory
│   │   ├── deps.py         # Dependencies (get_db, pagination)
│   │   ├── services/       # Business logic (crypto, etc.)
│   │   ├── schemas/        # Pydantic models
│   │   ├── repositories/   # Data access layer
│   │   └── routers/        # HTTP endpoints
│   ├── tests/
│   ├── .env                # Development config (shared key)
│   ├── .env.example        # Template
│   ├── pyproject.toml
│   └── Dockerfile
│
└── ingestion/              # TAXII polling service (teammate-owned)
    └── ...
```

### Key Concepts

- **ORM Models**: Live only in `ctiris_db/src/ctiris_db/models/`. Both `api/` and `ingestion/` import from here.
- **Alembic**: Lives in `ctiris_db/`. Run migrations from the shared package; both services depend on the same schema.
- **Repositories**: All SQL queries live in `api/app/repositories/`. Routers call repos, get ORM objects, convert to Pydantic schemas.
- **Crypto**: Shared `FERNET_KEY` env var encrypts/decrypts `auth_credentials` at the application layer. Database stores opaque ciphertext.
- **Read-Only Tables**: `stix_objects` and `ingestion_log` are written only by the ingestion service; API serves read-only views.

## Environment Variables

See [api/.env.example](api/.env.example) for a complete list. Key variables:

- `DATABASE_URL` — PostgreSQL connection string (with `asyncpg` driver for API, `psycopg` for migrations)
- `FERNET_KEY` — Shared encryption key for credentials (must be the same in both services)
- `CORS_ORIGINS` — Comma-separated list of allowed origins for CORS
- `LOG_LEVEL` — Logging level (DEBUG, INFO, WARNING, ERROR)
- `DEBUG` — Enable debug mode and SQL echo (boolean)

## Testing

Run tests from the `api/` directory:

```bash
cd api
pytest
```

"""

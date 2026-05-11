# Backend Migration Workspace

This directory owns database schema migrations for CTIris and will eventually contain the backend API service.

## Docker setup

From the repository root, simply run:

```bash
docker compose up
```

The backend Dockerfile automatically:
1. Installs Python dependencies
2. Configures Alembic
3. Runs migrations against PostgreSQL

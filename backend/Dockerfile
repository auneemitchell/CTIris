FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (required for psycopg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy alembic configuration and migrations
COPY alembic.ini .
COPY alembic/ ./alembic/

# Default command: run migrations
CMD ["alembic", "upgrade", "head"]

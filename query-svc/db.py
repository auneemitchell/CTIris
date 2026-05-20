"""
Database connection and table definitions for the query service.

Read-only access to the shared CTIris Postgres instance. Table definitions
mirror the schema in backend/alembic/versions/20260509_01_initial_schema.py
and must be kept in sync with it if the schema changes.

TODO: once the backend adds SQLAlchemy ORM models (DeclarativeBase), import
those shared models here instead of maintaining this manual mirror.
"""

import os

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

_metadata = sa.MetaData()

feeds_table = sa.Table(
    "feeds",
    _metadata,
    sa.Column("id", UUID(as_uuid=True), primary_key=True),
    sa.Column("name", sa.String(255)),
    sa.Column("url", sa.String(2048)),
    sa.Column("auth_credentials", sa.LargeBinary, nullable=True),
    sa.Column("enabled", sa.Boolean),
    sa.Column("poll_frequency_min", sa.Integer),
    sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("status", sa.String(32)),
    sa.Column("created_at", sa.DateTime(timezone=True)),
)

stix_objects_table = sa.Table(
    "stix_objects",
    _metadata,
    sa.Column("stix_id", sa.String(128), primary_key=True),
    sa.Column("type", sa.String(64)),
    sa.Column("feed_id", UUID(as_uuid=True), nullable=True),
    sa.Column("properties", JSONB),
    sa.Column("stix_created", sa.DateTime(timezone=True), nullable=True),
    sa.Column("stix_modified", sa.DateTime(timezone=True), nullable=True),
    sa.Column("ingested_at", sa.DateTime(timezone=True)),
)

ingestion_log_table = sa.Table(
    "ingestion_log",
    _metadata,
    sa.Column("id", UUID(as_uuid=True), primary_key=True),
    sa.Column("feed_id", UUID(as_uuid=True)),
    sa.Column("polled_at", sa.DateTime(timezone=True)),
    sa.Column("items_received", sa.Integer),
    sa.Column("items_new", sa.Integer),
    sa.Column("items_updated", sa.Integer),
    sa.Column("status", sa.String(32)),
    sa.Column("errors", JSONB, nullable=True),
)

_engine: sa.Engine | None = None


def get_engine() -> sa.Engine:
    global _engine
    if _engine is None:
        url = os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@postgres:5432/ctiris",
        )
        _engine = sa.create_engine(url, pool_pre_ping=True)
    return _engine

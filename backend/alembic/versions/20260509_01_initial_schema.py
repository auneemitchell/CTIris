"""Initial CTIris schema with UUIDv7 IDs.

Revision ID: 20260509_01
Revises:
Create Date: 2026-05-09 00:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260509_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UUID_V7_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION generate_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    unix_ts_ms bigint;
    random_bytes bytea;
    bytes bytea;
BEGIN
    unix_ts_ms := floor(extract(epoch FROM clock_timestamp()) * 1000);
    random_bytes := gen_random_bytes(10);
    bytes := decode(lpad(to_hex(unix_ts_ms), 12, '0'), 'hex') || random_bytes;

    -- Set RFC 9562 UUID version to 7 (0b0111xxxx).
    bytes := set_byte(bytes, 6, (get_byte(bytes, 6) & 15) | 112);

    -- Set RFC 4122 variant (0b10xxxxxx).
    bytes := set_byte(bytes, 8, (get_byte(bytes, 8) & 63) | 128);

    RETURN encode(bytes, 'hex')::uuid;
END;
$$;
"""


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(UUID_V7_FUNCTION_SQL)

    op.create_table(
        "feeds",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("generate_uuid_v7()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("auth_credentials", sa.LargeBinary(), nullable=True),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("poll_frequency_min", sa.Integer(), nullable=False),
        sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "status IN ('active', 'paused', 'error')",
            name="ck_feeds_status",
        ),
        sa.CheckConstraint("poll_frequency_min > 0", name="ck_feeds_poll_frequency_min_positive"),
    )

    op.create_table(
        "stix_objects",
        sa.Column("stix_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("feed_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("stix_created", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stix_modified", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["feed_id"], ["feeds.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("stix_id"),
    )

    op.create_table(
        "ingestion_log",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("generate_uuid_v7()"),
        ),
        sa.Column("feed_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "polled_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("items_received", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("items_new", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("items_updated", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("errors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["feed_id"], ["feeds.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "status IN ('success', 'partial', 'failed')",
            name="ck_ingestion_log_status",
        ),
        sa.CheckConstraint("items_received >= 0", name="ck_ingestion_log_items_received_nonnegative"),
        sa.CheckConstraint("items_new >= 0", name="ck_ingestion_log_items_new_nonnegative"),
        sa.CheckConstraint("items_updated >= 0", name="ck_ingestion_log_items_updated_nonnegative"),
    )

    op.create_index("ix_feeds_status", "feeds", ["status"], unique=False)
    op.create_index("ix_feeds_last_polled_at", "feeds", ["last_polled_at"], unique=False)

    op.create_index("ix_stix_objects_type", "stix_objects", ["type"], unique=False)
    op.create_index("ix_stix_objects_feed_id", "stix_objects", ["feed_id"], unique=False)
    op.create_index(
        "ix_stix_objects_properties_gin",
        "stix_objects",
        ["properties"],
        unique=False,
        postgresql_using="gin",
    )

    op.create_index("ix_ingestion_log_feed_id", "ingestion_log", ["feed_id"], unique=False)
    op.create_index("ix_ingestion_log_polled_at", "ingestion_log", ["polled_at"], unique=False)
    op.create_index("ix_ingestion_log_status", "ingestion_log", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ingestion_log_status", table_name="ingestion_log")
    op.drop_index("ix_ingestion_log_polled_at", table_name="ingestion_log")
    op.drop_index("ix_ingestion_log_feed_id", table_name="ingestion_log")

    op.drop_index("ix_stix_objects_properties_gin", table_name="stix_objects")
    op.drop_index("ix_stix_objects_feed_id", table_name="stix_objects")
    op.drop_index("ix_stix_objects_type", table_name="stix_objects")

    op.drop_index("ix_feeds_last_polled_at", table_name="feeds")
    op.drop_index("ix_feeds_status", table_name="feeds")

    op.drop_table("ingestion_log")
    op.drop_table("stix_objects")
    op.drop_table("feeds")

    op.execute("DROP FUNCTION IF EXISTS generate_uuid_v7()")

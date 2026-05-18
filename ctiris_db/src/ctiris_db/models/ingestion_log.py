"""Ingestion log ORM model for the shared CTIris schema."""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ctiris_db.base import Base


class IngestionLog(Base):
	"""Checkpoint and outcome record for a feed sync."""

	__tablename__ = "ingestion_log"
	__table_args__ = (
		CheckConstraint("status IN ('success', 'partial', 'failed')", name="ck_ingestion_log_status"),
		CheckConstraint("items_received >= 0", name="ck_ingestion_log_items_received_nonnegative"),
		CheckConstraint("items_new >= 0", name="ck_ingestion_log_items_new_nonnegative"),
		CheckConstraint("items_updated >= 0", name="ck_ingestion_log_items_updated_nonnegative"),
		Index("ix_ingestion_log_feed_id", "feed_id"),
		Index("ix_ingestion_log_polled_at", "polled_at"),
		Index("ix_ingestion_log_status", "status"),
	)

	id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		primary_key=True,
		server_default=text("uuidv7()"),
	)
	feed_id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("feeds.id", ondelete="CASCADE"),
		nullable=False,
	)
	polled_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
	items_received: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
	items_new: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
	items_updated: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
	status: Mapped[str] = mapped_column(String(32), nullable=False)
	errors: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

	feed = relationship("Feed", back_populates="ingestion_logs")

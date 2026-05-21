"""Feed ORM model for the shared CTIris schema."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Integer, LargeBinary, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ctiris_db.base import Base


class Feed(Base):
	"""TAXII feed configuration."""

	__tablename__ = "feeds"
	__table_args__ = (
		CheckConstraint("status IN ('active', 'paused', 'error')", name="ck_feeds_status"),
		CheckConstraint("poll_frequency_min > 0", name="ck_feeds_poll_frequency_min_positive"),
		Index("ix_feeds_status", "status"),
		Index("ix_feeds_last_polled_at", "last_polled_at"),
	)

	id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		primary_key=True,
		server_default=text("uuidv7()"),
	)
	name: Mapped[str] = mapped_column(String(255), nullable=False)
	auth_credentials: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
	url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
	enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
	poll_frequency_min: Mapped[int] = mapped_column(Integer, nullable=False)
	last_polled_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
	status: Mapped[str] = mapped_column(String(32), nullable=False)
	created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

	stix_objects = relationship("StixObject", back_populates="feed")
	ingestion_logs = relationship("IngestionLog", back_populates="feed")

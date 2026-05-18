"""STIX object ORM model for the shared CTIris schema."""

from __future__ import annotations

import uuid

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ctiris_db.base import Base


class StixObject(Base):
	"""Stored STIX object payload."""

	__tablename__ = "stix_objects"
	__table_args__ = (
		Index("ix_stix_objects_type", "type"),
		Index("ix_stix_objects_feed_id", "feed_id"),
		Index("ix_stix_objects_properties_gin", "properties", postgresql_using="gin"),
	)

	stix_id: Mapped[str] = mapped_column(String(128), primary_key=True)
	type: Mapped[str] = mapped_column(String(64), nullable=False)
	feed_id: Mapped[uuid.UUID | None] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("feeds.id", ondelete="SET NULL"),
		nullable=True,
	)
	properties: Mapped[dict] = mapped_column(JSONB, nullable=False)
	stix_created: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
	stix_modified: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
	ingested_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

	feed = relationship("Feed", back_populates="stix_objects")

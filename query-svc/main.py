import os
import uuid

import sqlalchemy as sa
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from db import (
    feeds_table,
    get_engine,
    ingestion_log_table,
    stix_objects_table,
)

app = FastAPI(title="CTIris Query Service")

# Requests should come from the API gateway, not directly from the frontend.
# Set ALLOWED_ORIGIN to the gateway's URL when it is deployed.
# TODO: add ALLOWED_ORIGIN=http://api-gateway:PORT to query-svc environment in docker-compose.yml
_allowed_origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_allowed_origin],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def get_db():
    with get_engine().connect() as conn:
        yield conn


# Converts UUID to String so JSON can handle them (JSON has no UUID type)
def _serialize(row: dict) -> dict:
    return {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in row.items()}


@app.get("/health")
def health():
    """Check if the service is up.

    Returns:
        {"status": "ok"}
    """
    return {"status": "ok"}


@app.get("/stix")
def list_stix(
    # Query is a FastAPI helper that tells FastAPI that the parameter comes from the
    # URL query string (the ?key=value part), not the path or request body.
    # We use it here to set default values and validation rules (ge, le).
    # Incoming params without Query() are assumed to come from the query string anyway.
    type: str | None = Query(None),
    # This is limiting the number of request to be between 1 and 1000 with a
    # default of 100. Change le if we want a smaller upper limit.
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    # This opens the DB and passes the result in as conn. It yields the
    # connection for use inside the function then closes it when function is done.
    conn=Depends(get_db),
):
    """Return a paginated list of STIX objects from the database.

    Args:
        type: Filter by STIX type (e.g. "attack-pattern", "malware"). Optional.
        limit: Max results to return. Default 100, max 1000.
        offset: Number of results to skip for pagination. Default 0.

    Returns:
        List of STIX objects as JSON.

    Example:
        GET /stix?type=attack-pattern&limit=50&offset=100
    """
    # Builds the SQL query using SQLAlchemy
    stmt = (
        sa.select(stix_objects_table)
        .order_by(stix_objects_table.c.stix_id)
        .limit(limit)
        .offset(offset)
    )
    # Appends a WHERE clause to the query if a type was specified
    # This will filter the query to just this type.
    if type:
        stmt = stmt.where(stix_objects_table.c.type == type)
    # Executes the statement and returns all matching rows as a list.
    # .mappings() returns each row as a dictionary-like object instead of a tuple
    rows = conn.execute(stmt).mappings().fetchall()
    # dict(row) converts the SQL alchemy mapping into a plain Python dictionary
    # _serialize is a method defined above: converts uuid to strings for the JSON
    return [_serialize(dict(row)) for row in rows]


@app.get("/stix/{stix_id}")
def get_stix(stix_id: str, conn=Depends(get_db)):
    """Return a single STIX object by its ID.

    Args:
        stix_id: The STIX object ID (e.g. "attack-pattern--4e57a4d2-...").

    Returns:
        Single STIX object as JSON.

    Raises:
        404: If no object with that ID exists.

    Example:
        GET /stix/attack-pattern--4e57a4d2-1a5b-4f8e-8f2e-3c3e7d1f2b1a
    """
    row = conn.execute(
        sa.select(stix_objects_table).where(stix_objects_table.c.stix_id == stix_id)
    ).mappings().fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="STIX object not found")
    return _serialize(dict(row))


@app.get("/feeds")
def list_feeds(conn=Depends(get_db)):
    """Return all configured CTI feeds and their current status.

    Returns:
        List of feed objects as JSON.
    """
    rows = conn.execute(
        sa.select(
            feeds_table.c.id,
            feeds_table.c.name,
            feeds_table.c.url,
            feeds_table.c.enabled,
            feeds_table.c.poll_frequency_min,
            feeds_table.c.last_polled_at,
            feeds_table.c.status,
            feeds_table.c.created_at,
        ).order_by(feeds_table.c.created_at)
    ).mappings().fetchall()
    return [_serialize(dict(row)) for row in rows]


@app.get("/feeds/{feed_id}")
def get_feed(feed_id: str, conn=Depends(get_db)):
    """Return a single feed by its UUID.

    Args:
        feed_id: UUID of the feed (e.g. "018f1e4a-...").

    Returns:
        Single feed object as JSON.

    Raises:
        400: If feed_id is not a valid UUID.
        404: If no feed with that ID exists.

    Example:
        GET /feeds/018f1e4a-1234-7abc-8def-000000000000
    """
    try:
        feed_uuid = uuid.UUID(feed_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid feed ID")
    row = conn.execute(
        sa.select(
            feeds_table.c.id,
            feeds_table.c.name,
            feeds_table.c.url,
            feeds_table.c.enabled,
            feeds_table.c.poll_frequency_min,
            feeds_table.c.last_polled_at,
            feeds_table.c.status,
            feeds_table.c.created_at,
        ).where(feeds_table.c.id == feed_uuid)
    ).mappings().fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Feed not found")
    return _serialize(dict(row))


@app.get("/ingestion-log")
def list_ingestion_log(
    feed_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    conn=Depends(get_db),
):
    """Return a log of past ingestion runs, ordered most recent first.

    Args:
        feed_id: UUID to filter logs to a specific feed. Optional.
        limit: Max results to return. Default 50, max 500.

    Returns:
        List of ingestion log entries as JSON.

    Raises:
        400: If feed_id is not a valid UUID.

    Example:
        GET /ingestion-log?feed_id=018f1e4a-1234-7abc-8def-000000000000&limit=10
    """
    stmt = (
        sa.select(ingestion_log_table)
        .order_by(ingestion_log_table.c.polled_at.desc())
        .limit(limit)
    )
    if feed_id:
        try:
            stmt = stmt.where(ingestion_log_table.c.feed_id == uuid.UUID(feed_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid feed ID")
    rows = conn.execute(stmt).mappings().fetchall()
    return [_serialize(dict(row)) for row in rows]

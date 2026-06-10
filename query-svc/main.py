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
_allowed_origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost")

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


@app.get("/stix/counts")
def count_stix(conn=Depends(get_db)):
    """Return the total number of STIX objects in the database, grouped by type.

    Returns:
        Dict mapping each STIX type to its count, e.g. {"malware": 729, "relationship": 21025}.

    Example:
        GET /stix/counts
    """
    rows = conn.execute(
        sa.select(stix_objects_table.c.type, sa.func.count().label("count"))
        .group_by(stix_objects_table.c.type)
    ).mappings().fetchall()
    return {row["type"]: row["count"] for row in rows}


@app.get("/stix/top-by-relationships")
def top_by_relationships(
    type: list[str] = Query(...),
    limit: int = Query(8, ge=1, le=50),
    conn=Depends(get_db),
):
    """Return the top STIX entities ranked by relationship count.

    Counts every relationship object that references the entity as source_ref
    or target_ref. Runs a single SQL self-join across all relationship rows —
    no client-side cap. Accepts one or more types so callers can rank across
    multiple entity types in a single globally-correct query.

    Args:
        type: STIX type(s) to rank. Repeat the param for multiple types, e.g.
              ?type=threat-actor&type=intrusion-set
        limit: Number of top entries to return. Default 8, max 50.

    Returns:
        List of {stix_id, type, name, relationship_count} dicts, descending order.

    Example:
        GET /stix/top-by-relationships?type=malware&limit=10
        GET /stix/top-by-relationships?type=threat-actor&type=intrusion-set&limit=10
    """
    stmt = sa.text("""
        SELECT
            entity.stix_id,
            entity.type,
            entity.properties->>'name' AS name,
            COUNT(rel.stix_id)         AS relationship_count
        FROM stix_objects entity
        JOIN stix_objects rel ON (
            rel.type = 'relationship'
            AND (
                rel.properties->>'source_ref' = entity.stix_id
                OR rel.properties->>'target_ref' = entity.stix_id
            )
        )
        WHERE entity.type = ANY(:types)
        GROUP BY entity.stix_id, entity.type, entity.properties->>'name'
        ORDER BY relationship_count DESC
        LIMIT :limit
    """)
    rows = conn.execute(stmt, {"types": type, "limit": limit}).mappings().fetchall()
    return [dict(row) for row in rows]


@app.get("/stix/{stix_id}/relationships")
def get_stix_relationships(stix_id: str, conn=Depends(get_db)):
    """Return all STIX relationship objects involving the given STIX ID.

        Returns two relationship lists and one property-reference lookup:
    - references: relationship objects where stix_id is source_ref (what this object points to).
      Each entry includes the resolved name and type of the target object.
    - referenced_by: relationship objects where stix_id is target_ref (what points to this object).
      Each entry includes the resolved name and type of the source object.
        - property_refs: direct object references found in this object's JSON properties,
            such as created_by_ref and x_mitre_modified_by_ref. These are not relationship
            objects, but they let the UI resolve display names for referenced STIX IDs.

        Unknown refs are still returned. When the referenced object is not in the local
        database, name/type are null and the corresponding *_present flag is false.

    Returns empty lists if no relationships exist — never 404.

    Args:
        stix_id: The STIX object ID (e.g. "malware--uuid").

    Returns:
        { references: [...], referenced_by: [...], property_refs: [...] }

    Example:
        GET /stix/malware--4e57a4d2-.../relationships
    """
    references_stmt = sa.text("""
        SELECT
            rel.properties->>'relationship_type' AS relationship_type,
            rel.properties->>'target_ref'        AS target_ref,
            target.properties->>'name'           AS target_name,
            target.type                          AS target_type,
            (target.stix_id IS NOT NULL)         AS target_present
        FROM stix_objects rel
        LEFT JOIN stix_objects target ON target.stix_id = rel.properties->>'target_ref'
        WHERE rel.type = 'relationship'
          AND rel.properties->>'source_ref' = :stix_id
        ORDER BY relationship_type, target_name NULLS LAST, target_ref
    """)
    referenced_by_stmt = sa.text("""
        SELECT
            rel.properties->>'relationship_type' AS relationship_type,
            rel.properties->>'source_ref'        AS source_ref,
            source.properties->>'name'           AS source_name,
            source.type                          AS source_type,
            (source.stix_id IS NOT NULL)         AS source_present
        FROM stix_objects rel
        LEFT JOIN stix_objects source ON source.stix_id = rel.properties->>'source_ref'
        WHERE rel.type = 'relationship'
          AND rel.properties->>'target_ref' = :stix_id
        ORDER BY relationship_type, source_name NULLS LAST, source_ref
    """)
    property_refs_stmt = sa.text("""
        WITH current_object AS (
            SELECT properties
            FROM stix_objects
            WHERE stix_id = :stix_id
        ), property_refs AS (
            SELECT entry.key AS property_name, entry.value #>> '{}' AS ref
            FROM current_object
            CROSS JOIN LATERAL jsonb_each(properties) AS entry(key, value)
            WHERE entry.key LIKE '%\\_ref' ESCAPE '\\'
              AND jsonb_typeof(entry.value) = 'string'

            UNION

            SELECT entry.key AS property_name, array_ref.ref
            FROM current_object
            CROSS JOIN LATERAL jsonb_each(properties) AS entry(key, value)
            CROSS JOIN LATERAL jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof(entry.value) = 'array' THEN entry.value
                    ELSE '[]'::jsonb
                END
            ) AS array_ref(ref)
            WHERE entry.key LIKE '%\\_refs' ESCAPE '\\'
        )
        SELECT
            property_refs.property_name,
            property_refs.ref,
            referenced.properties->>'name' AS name,
            referenced.type                AS type,
            (referenced.stix_id IS NOT NULL) AS present
        FROM property_refs
        LEFT JOIN stix_objects referenced ON referenced.stix_id = property_refs.ref
        ORDER BY property_refs.property_name, name NULLS LAST, property_refs.ref
    """)
    references = conn.execute(references_stmt, {"stix_id": stix_id}).mappings().fetchall()
    referenced_by = conn.execute(referenced_by_stmt, {"stix_id": stix_id}).mappings().fetchall()
    property_refs = conn.execute(property_refs_stmt, {"stix_id": stix_id}).mappings().fetchall()
    return {
        "references": [dict(row) for row in references],
        "referenced_by": [dict(row) for row in referenced_by],
        "property_refs": [dict(row) for row in property_refs],
    }


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

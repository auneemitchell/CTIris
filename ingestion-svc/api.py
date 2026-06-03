"""HTTP API for the ingestion service.

Exposes endpoints for managing TAXII feeds and triggering manual syncs.
The APScheduler background scheduler is started as part of the FastAPI
lifespan so scheduled syncs continue to run inside the same process as
uvicorn.
"""

import json
import logging
import os
import sys
import threading
import uuid
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from cryptography.fernet import Fernet
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl

from db import get_engine, get_feed_by_id, insert_feed
from sync import sync_one_feed, run_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the background scheduler alongside uvicorn, shut it down on exit."""
    # Fire the initial sync in a daemon thread so uvicorn starts immediately
    # without blocking on the (potentially slow) first full download.
    threading.Thread(target=run_sync, daemon=True, name="initial-sync").start()

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_sync,
        trigger=IntervalTrigger(minutes=5),
        id="feed_sync",
        name="Feed due-check sync",
        replace_existing=True,
        coalesce=True,
        misfire_grace_time=300,
    )
    scheduler.start()
    logger.info("Background scheduler started — checking for due feeds every 5 minutes")

    yield

    scheduler.shutdown(wait=False)
    logger.info("Background scheduler stopped")


app = FastAPI(title="CTIris Ingestion Service", lifespan=lifespan)

_allowed_origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_allowed_origin],
    allow_methods=["POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CredentialsIn(BaseModel):
    username: str
    password: str


class FeedIn(BaseModel):
    name: str
    url: HttpUrl
    poll_frequency_min: int = Field(..., ge=1)
    enabled: bool = True
    credentials: CredentialsIn | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _encrypt_credentials(creds: CredentialsIn) -> bytes:
    """Fernet-encrypt a username/password pair for storage.

    Raises:
        HTTPException 500: If CREDENTIALS_ENCRYPTION_KEY is not set in the
            environment, which would leave credentials unencryptable.
    """
    key = os.environ.get("CREDENTIALS_ENCRYPTION_KEY")
    if not key:
        raise HTTPException(
            status_code=500,
            detail=(
                "CREDENTIALS_ENCRYPTION_KEY is not configured — "
                "cannot store credentials securely"
            ),
        )
    try:
        f = Fernet(key.encode())
    except ValueError:
        raise HTTPException(status_code=500, detail="CREDENTIALS_ENCRYPTION_KEY is invalid")  
    payload = json.dumps({"username": creds.username, "password": creds.password})
    return f.encrypt(payload.encode())


def _serialize(row: dict) -> dict:
    """Convert UUID values to strings and strip auth_credentials from responses."""
    return {
        k: str(v) if isinstance(v, uuid.UUID) else v
        for k, v in row.items()
        if k != "auth_credentials"
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/feeds", status_code=201)
def create_feed(body: FeedIn):
    """Register a new TAXII feed.

    The feed URL must be unique. If credentials are supplied they are
    Fernet-encrypted before being written to the database — the plaintext
    is never persisted.

    Returns:
        201: Feed created. Response body is the new feed row (no credentials).
        409: A feed with the same URL already exists.
        500: CREDENTIALS_ENCRYPTION_KEY not set but credentials were supplied.
    """
    auth_bytes: bytes | None = None
    if body.credentials is not None:
        auth_bytes = _encrypt_credentials(body.credentials)

    with get_engine().begin() as conn:
        row = insert_feed(
            conn,
            name=body.name,
            url=str(body.url),
            poll_frequency_min=body.poll_frequency_min,
            enabled=body.enabled,
            auth_credentials=auth_bytes,
        )

    if row is None:
        raise HTTPException(
            status_code=409, detail="A feed with that URL already exists"
        )

    return _serialize(row)


@app.post("/feeds/{feed_id}/sync", status_code=202)
def trigger_sync(feed_id: str, background_tasks: BackgroundTasks):
    """Trigger an immediate out-of-band sync for a specific feed.

    The sync runs in a background task so this endpoint returns immediately
    (202 Accepted) while the work happens asynchronously.

    Returns:
        202: Sync triggered.
        400: feed_id is not a valid UUID.
        404: No feed with that ID exists.
    """
    try:
        fid = uuid.UUID(feed_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid feed ID")

    engine = get_engine()
    with engine.connect() as conn:
        feed = get_feed_by_id(conn, fid)

    if feed is None:
        raise HTTPException(status_code=404, detail="Feed not found")

    background_tasks.add_task(sync_one_feed, engine, feed)
    return {"status": "triggered", "feed_id": feed_id}

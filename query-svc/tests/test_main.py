"""
Tests for main.py — API endpoints and serialization helper.

Uses FastAPI's TestClient with dependency overrides so no Postgres or Docker
is needed. The get_db dependency is replaced with a mock connection for each
test. A default empty mock is always active (see conftest.py); tests that need
specific return values override it inline.
"""

import uuid
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from main import app, get_db, _serialize

client = TestClient(app)

FEED_ID = uuid.UUID("018f1e4a-1234-7abc-8def-000000000001")
STIX_ID = "attack-pattern--4e57a4d2-1a5b-4f8e-8f2e-3c3e7d1f2b1a"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_conn(fetchall_rows=None, fetchone_row=None):
    """Build a mock SQLAlchemy connection that returns the given rows."""
    result = MagicMock()
    result.mappings.return_value.fetchall.return_value = fetchall_rows or []
    result.mappings.return_value.fetchone.return_value = fetchone_row
    conn = MagicMock()
    conn.execute.return_value = result
    return conn


def _override(conn):
    """Return a get_db override that yields the given mock connection."""
    def _dep():
        yield conn
    return _dep


# ---------------------------------------------------------------------------
# _serialize  (pure function — no mocks needed)
# ---------------------------------------------------------------------------

class TestSerialize:
    def test_converts_uuid_to_string(self):
        row = {"id": FEED_ID, "name": "MITRE"}
        result = _serialize(row)
        assert result["id"] == str(FEED_ID)
        assert isinstance(result["id"], str)

    def test_non_uuid_values_pass_through(self):
        row = {"name": "MITRE", "enabled": True, "count": 42}
        assert _serialize(row) == row

    def test_mixed_row(self):
        row = {"id": FEED_ID, "name": "MITRE", "enabled": True}
        result = _serialize(row)
        assert isinstance(result["id"], str)
        assert result["name"] == "MITRE"
        assert result["enabled"] is True


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /stix
# ---------------------------------------------------------------------------

class TestListStix:
    def test_returns_empty_list_when_no_results(self):
        response = client.get("/stix")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_serialized_rows(self):
        rows = [{"stix_id": STIX_ID, "type": "attack-pattern", "feed_id": FEED_ID}]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["stix_id"] == STIX_ID
        assert data[0]["feed_id"] == str(FEED_ID)

    def test_rejects_limit_below_1(self):
        response = client.get("/stix?limit=0")
        assert response.status_code == 422

    def test_rejects_limit_above_1000(self):
        response = client.get("/stix?limit=1001")
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /stix/{stix_id}
# ---------------------------------------------------------------------------

class TestGetStix:
    def test_returns_404_when_not_found(self):
        response = client.get(f"/stix/{STIX_ID}")
        assert response.status_code == 404

    def test_returns_object_when_found(self):
        row = {"stix_id": STIX_ID, "type": "attack-pattern", "feed_id": FEED_ID}
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchone_row=row))
        response = client.get(f"/stix/{STIX_ID}")
        assert response.status_code == 200
        assert response.json()["stix_id"] == STIX_ID


# ---------------------------------------------------------------------------
# GET /feeds
# ---------------------------------------------------------------------------

class TestListFeeds:
    def test_returns_empty_list_when_no_feeds(self):
        response = client.get("/feeds")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_serialized_feeds(self):
        rows = [{"id": FEED_ID, "name": "MITRE ATT&CK", "status": "active"}]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/feeds")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(FEED_ID)


# ---------------------------------------------------------------------------
# GET /feeds/{feed_id}
# ---------------------------------------------------------------------------

class TestGetFeed:
    def test_returns_400_for_invalid_uuid(self):
        response = client.get("/feeds/not-a-uuid")
        assert response.status_code == 400

    def test_returns_404_when_not_found(self):
        response = client.get(f"/feeds/{FEED_ID}")
        assert response.status_code == 404

    def test_returns_feed_when_found(self):
        row = {"id": FEED_ID, "name": "MITRE ATT&CK", "status": "active"}
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchone_row=row))
        response = client.get(f"/feeds/{FEED_ID}")
        assert response.status_code == 200
        assert response.json()["id"] == str(FEED_ID)


# ---------------------------------------------------------------------------
# GET /ingestion-log
# ---------------------------------------------------------------------------

class TestListIngestionLog:
    def test_returns_empty_list_when_no_logs(self):
        response = client.get("/ingestion-log")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_400_for_invalid_feed_id(self):
        response = client.get("/ingestion-log?feed_id=not-a-uuid")
        assert response.status_code == 400

    def test_rejects_limit_above_500(self):
        response = client.get("/ingestion-log?limit=501")
        assert response.status_code == 422

    def test_returns_logs(self):
        rows = [{"id": uuid.uuid4(), "feed_id": FEED_ID, "status": "success", "items_new": 10}]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/ingestion-log")
        assert response.status_code == 200
        assert len(response.json()) == 1

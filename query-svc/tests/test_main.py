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


def _mock_conn_multi(*fetchall_rows_list):
    """Build a mock connection where successive execute() calls return different rows.

    Useful for endpoints that run more than one SQL query per request.
    Each positional argument is the fetchall return value for the Nth execute call.
    """
    conn = MagicMock()
    results = []
    for rows in fetchall_rows_list:
        result = MagicMock()
        result.mappings.return_value.fetchall.return_value = rows
        results.append(result)
    conn.execute.side_effect = results
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

    def test_rejects_negative_offset(self):
        response = client.get("/stix?offset=-1")
        assert response.status_code == 422

    def test_filters_by_type(self):
        rows = [{"stix_id": STIX_ID, "type": "malware", "feed_id": FEED_ID}]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix?type=malware")
        assert response.status_code == 200
        assert response.json()[0]["type"] == "malware"


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
# GET /stix/geo-heatmap
# ---------------------------------------------------------------------------

class TestGeoHeatmap:
    def test_returns_empty_list_when_no_data(self):
        response = client.get("/stix/geo-heatmap")
        assert response.status_code == 200
        assert response.json() == []

    def test_defaults_to_targets(self):
        response = client.get("/stix/geo-heatmap")
        assert response.status_code == 200

    def test_accepts_valid_relationship_types(self):
        for rel_type in ["targets", "located-at", "originates-from"]:
            response = client.get(f"/stix/geo-heatmap?relationship_type={rel_type}")
            assert response.status_code == 200

    def test_rejects_invalid_relationship_type(self):
        response = client.get("/stix/geo-heatmap?relationship_type=uses")
        assert response.status_code == 400

    def test_returns_aggregated_rows(self):
        rows = [
            {"country": "US", "location_name": "United States", "relationship_type": "targets", "count": 12},
            {"country": "UA", "location_name": "Ukraine", "relationship_type": "targets", "count": 5},
        ]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix/geo-heatmap")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0] == rows[0]
        assert data[1] == rows[1]

    def test_returns_null_country_when_location_has_no_country_field(self):
        rows = [
            {"country": None, "location_name": "Eastern Europe", "relationship_type": "targets", "count": 3},
        ]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix/geo-heatmap")
        assert response.status_code == 200
        data = response.json()
        assert data[0]["country"] is None
        assert data[0]["location_name"] == "Eastern Europe"
        assert data[0]["count"] == 3


# ---------------------------------------------------------------------------
# GET /stix/{stix_id}/relationships
# ---------------------------------------------------------------------------

class TestGetStixRelationships:
    def test_returns_references(self):
        ref_row = {
            "relationship_type": "uses",
            "target_ref": "tool--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "target_name": "Cobalt Strike",
            "target_type": "tool",
            "target_present": True,
        }
        app.dependency_overrides[get_db] = _override(_mock_conn_multi([ref_row], [], []))
        response = client.get(f"/stix/{STIX_ID}/relationships")
        assert response.status_code == 200
        data = response.json()
        assert len(data["references"]) == 1
        assert data["references"][0]["relationship_type"] == "uses"
        assert data["references"][0]["target_ref"] == "tool--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert data["references"][0]["target_name"] == "Cobalt Strike"
        assert data["references"][0]["target_type"] == "tool"
        assert data["references"][0]["target_present"] is True
        assert data["referenced_by"] == []
        assert data["property_refs"] == []

    def test_returns_referenced_by(self):
        back_row = {
            "relationship_type": "uses",
            "source_ref": "threat-actor--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "source_name": "APT28",
            "source_type": "threat-actor",
            "source_present": True,
        }
        app.dependency_overrides[get_db] = _override(_mock_conn_multi([], [back_row], []))
        response = client.get(f"/stix/{STIX_ID}/relationships")
        assert response.status_code == 200
        data = response.json()
        assert data["references"] == []
        assert len(data["referenced_by"]) == 1
        assert data["referenced_by"][0]["source_ref"] == "threat-actor--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert data["referenced_by"][0]["source_name"] == "APT28"
        assert data["referenced_by"][0]["source_type"] == "threat-actor"
        assert data["referenced_by"][0]["source_present"] is True
        assert data["property_refs"] == []

    def test_returns_property_refs_for_name_resolution(self):
        property_ref_row = {
            "property_name": "created_by_ref",
            "ref": "identity--aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "name": "MITRE ATT&CK",
            "type": "identity",
            "present": True,
        }
        app.dependency_overrides[get_db] = _override(_mock_conn_multi([], [], [property_ref_row]))
        response = client.get(f"/stix/{STIX_ID}/relationships")
        assert response.status_code == 200
        data = response.json()
        assert data["references"] == []
        assert data["referenced_by"] == []
        assert data["property_refs"] == [property_ref_row]

    def test_returns_unresolved_refs(self):
        unresolved_ref_row = {
            "relationship_type": "uses",
            "target_ref": "tool--ffffffff-1111-2222-3333-444444444444",
            "target_name": None,
            "target_type": None,
            "target_present": False,
        }
        unresolved_property_ref_row = {
            "property_name": "created_by_ref",
            "ref": "identity--ffffffff-1111-2222-3333-444444444444",
            "name": None,
            "type": None,
            "present": False,
        }
        app.dependency_overrides[get_db] = _override(
            _mock_conn_multi([unresolved_ref_row], [], [unresolved_property_ref_row])
        )

        response = client.get(f"/stix/{STIX_ID}/relationships")
        assert response.status_code == 200
        data = response.json()
        assert data["references"] == [unresolved_ref_row]
        assert data["referenced_by"] == []
        assert data["property_refs"] == [unresolved_property_ref_row]

    def test_returns_empty_when_no_relationships(self):
        app.dependency_overrides[get_db] = _override(_mock_conn_multi([], [], []))
        response = client.get(f"/stix/{STIX_ID}/relationships")
        assert response.status_code == 200
        assert response.json() == {"references": [], "referenced_by": [], "property_refs": []}


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

    def test_filters_by_valid_feed_id(self):
        rows = [{"id": uuid.uuid4(), "feed_id": FEED_ID, "status": "success", "items_new": 5}]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get(f"/ingestion-log?feed_id={FEED_ID}")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_rejects_limit_below_1(self):
        response = client.get("/ingestion-log?limit=0")
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /stix/counts
# ---------------------------------------------------------------------------

class TestCountStix:
    def test_returns_empty_dict_when_no_data(self):
        response = client.get("/stix/counts")
        assert response.status_code == 200
        assert response.json() == {}

    def test_returns_counts_by_type(self):
        rows = [
            {"type": "malware", "count": 729},
            {"type": "relationship", "count": 21025},
        ]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix/counts")
        assert response.status_code == 200
        data = response.json()
        assert data["malware"] == 729
        assert data["relationship"] == 21025


# ---------------------------------------------------------------------------
# GET /stix/top-by-relationships
# ---------------------------------------------------------------------------

class TestTopByRelationships:
    def test_requires_type_param(self):
        response = client.get("/stix/top-by-relationships")
        assert response.status_code == 422

    def test_returns_top_entities(self):
        rows = [
            {"stix_id": STIX_ID, "type": "malware", "name": "Cobalt Strike", "relationship_count": 42},
        ]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix/top-by-relationships?type=malware")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["stix_id"] == STIX_ID
        assert data[0]["relationship_count"] == 42

    def test_accepts_multiple_types(self):
        rows = [
            {"stix_id": STIX_ID, "type": "malware", "name": "X", "relationship_count": 10},
        ]
        app.dependency_overrides[get_db] = _override(_mock_conn(fetchall_rows=rows))
        response = client.get("/stix/top-by-relationships?type=malware&type=threat-actor")
        assert response.status_code == 200

    def test_rejects_limit_above_50(self):
        response = client.get("/stix/top-by-relationships?type=malware&limit=51")
        assert response.status_code == 422

    def test_rejects_limit_below_1(self):
        response = client.get("/stix/top-by-relationships?type=malware&limit=0")
        assert response.status_code == 422

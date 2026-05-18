"""
Tests for taxii_client.py — all TAXII network calls are mocked so these
run offline with no real server connection needed.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from taxii_client import (
    _find_collection,
    _next_marker,
    _objects_from_response,
    fetch_stix_objects,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_collection(title: str) -> MagicMock:
    col = MagicMock()
    col.title = title
    return col


def _make_server(*collection_titles: str) -> MagicMock:
    """Build a mock Server with one API root containing the given collections."""
    collections = [_make_collection(t) for t in collection_titles]
    api_root = MagicMock()
    api_root.collections = collections
    server = MagicMock()
    server.api_roots = [api_root]
    return server


SAMPLE_OBJECTS = [
    {
        "type": "malware",
        "id": "malware--aaaaaaaa-0000-0000-0000-000000000001",
        "created": "2021-01-01T00:00:00.000Z",
        "modified": "2022-06-01T00:00:00.000Z",
        "name": "FakeMalware",
        "is_family": False,
    },
    {
        "type": "indicator",
        "id": "indicator--bbbbbbbb-0000-0000-0000-000000000002",
        "created": "2021-03-01T00:00:00.000Z",
        "modified": "2022-09-01T00:00:00.000Z",
        "name": "Malicious IP",
        "pattern": "[ipv4-addr:value = '1.2.3.4']",
        "pattern_type": "stix",
        "valid_from": "2021-03-01T00:00:00Z",
    },
    {
        "type": "attack-pattern",
        "id": "attack-pattern--cccccccc-0000-0000-0000-000000000003",
        "created": "2020-01-01T00:00:00.000Z",
        "modified": "2021-01-01T00:00:00.000Z",
        "name": "Spearphishing",
    },
]


# ---------------------------------------------------------------------------
# _find_collection
# ---------------------------------------------------------------------------

class TestFindCollection:
    def test_finds_collection_by_title_hint(self):
        server = _make_server("Mobile ATT&CK", "Enterprise ATT&CK", "ICS ATT&CK")
        col = _find_collection(server, title_hint="enterprise")
        assert col.title == "Enterprise ATT&CK"

    def test_match_is_case_insensitive(self):
        server = _make_server("ENTERPRISE att&ck")
        col = _find_collection(server, title_hint="enterprise")
        assert col.title == "ENTERPRISE att&ck"

    def test_falls_back_to_first_collection_when_no_match(self):
        """Any server whose collections don't match the hint still works."""
        server = _make_server("Mobile ATT&CK", "ICS ATT&CK")
        col = _find_collection(server, title_hint="enterprise")
        assert col.title == "Mobile ATT&CK"

    def test_empty_hint_always_falls_back_to_first(self):
        """An empty hint skips the title search and returns the first collection.

        This will be useful when users add feeds without specifying a
        collection title — the service picks the first available one.
        """
        server = _make_server("Some Collection", "Another Collection")
        col = _find_collection(server, title_hint="")
        assert col.title == "Some Collection"

    def test_raises_when_no_collections(self):
        server = MagicMock()
        server.url = "https://example.com/taxii2/"
        api_root = MagicMock()
        api_root.collections = []
        server.api_roots = [api_root]
        with pytest.raises(RuntimeError, match="No TAXII collections found"):
            _find_collection(server, title_hint="anything")


# ---------------------------------------------------------------------------
# _objects_from_response / _next_marker
# ---------------------------------------------------------------------------

class TestResponseHelpers:
    def test_objects_from_dict_response(self):
        response = {"objects": SAMPLE_OBJECTS}
        assert _objects_from_response(response) == SAMPLE_OBJECTS

    def test_objects_from_dict_missing_key(self):
        assert _objects_from_response({}) == []

    def test_objects_from_object_with_attribute(self):
        response = MagicMock()
        response.objects = SAMPLE_OBJECTS
        assert _objects_from_response(response) == SAMPLE_OBJECTS

    def test_next_marker_from_dict(self):
        assert _next_marker({"next": "abc123"}) == "abc123"
        assert _next_marker({}) is None

    def test_next_marker_from_object(self):
        response = MagicMock()
        response.next = "page2token"
        assert _next_marker(response) == "page2token"

    def test_next_marker_none_when_exhausted(self):
        response = MagicMock()
        response.next = None
        assert _next_marker(response) is None


# ---------------------------------------------------------------------------
# fetch_stix_objects
# ---------------------------------------------------------------------------

class TestFetchStixObjects:
    def _make_response(self, objects: list[dict], next_marker=None) -> dict:
        r = {"objects": objects}
        if next_marker:
            r["next"] = next_marker
        return r

    @patch("taxii_client.Server")
    def test_full_sync_single_page(self, MockServer):
        server = _make_server("Enterprise ATT&CK")  # title matches MITRE_COLLECTION_TITLE hint
        MockServer.return_value = server

        response = self._make_response(SAMPLE_OBJECTS)
        server.api_roots[0].collections[0].get_objects.return_value = response

        objects = fetch_stix_objects()

        assert len(objects) == len(SAMPLE_OBJECTS)
        # No added_after means full sync — called without that kwarg
        server.api_roots[0].collections[0].get_objects.assert_called_once_with()

    @patch("taxii_client.Server")
    def test_incremental_sync_passes_added_after(self, MockServer):
        server = _make_server("Enterprise ATT&CK")  # title matches MITRE_COLLECTION_TITLE hint
        MockServer.return_value = server

        collection = server.api_roots[0].collections[0]
        collection.get_objects.return_value = self._make_response([SAMPLE_OBJECTS[0]])

        cutoff = datetime(2022, 1, 1, tzinfo=timezone.utc)
        fetch_stix_objects(added_after=cutoff)

        call_kwargs = collection.get_objects.call_args.kwargs
        assert "added_after" in call_kwargs
        assert call_kwargs["added_after"].startswith("2022-01-01")

    @patch("taxii_client.Server")
    def test_pagination_follows_next_marker(self, MockServer):
        server = _make_server("Enterprise ATT&CK")  # title matches MITRE_COLLECTION_TITLE hint
        MockServer.return_value = server

        page1 = self._make_response(SAMPLE_OBJECTS[:1], next_marker="token-page2")
        page2 = self._make_response(SAMPLE_OBJECTS[1:], next_marker=None)

        collection = server.api_roots[0].collections[0]
        collection.get_objects.side_effect = [page1, page2]

        objects = fetch_stix_objects()

        assert len(objects) == len(SAMPLE_OBJECTS)
        assert collection.get_objects.call_count == 2
        # Second call should include the next marker
        second_call_kwargs = collection.get_objects.call_args_list[1].kwargs
        assert second_call_kwargs.get("next") == "token-page2"

    @patch("taxii_client.Server")
    def test_returns_empty_list_when_no_objects(self, MockServer):
        server = _make_server("Enterprise ATT&CK")  # title matches MITRE_COLLECTION_TITLE hint
        MockServer.return_value = server
        server.api_roots[0].collections[0].get_objects.return_value = {}

        assert fetch_stix_objects() == []

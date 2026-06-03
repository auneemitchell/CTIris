"""
Tests for api.py — HTTP endpoints for feed management and manual sync triggering.

Uses FastAPI's TestClient so no real uvicorn server is started.  The lifespan
(BackgroundScheduler + initial sync thread) is suppressed so tests run
instantly with no background threads or network calls.

All DB helpers and sync functions are mocked at the ``api.*`` namespace.
"""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Suppress lifespan so no scheduler threads or initial sync fire during tests.
# We import the app *after* patching so the lifespan context is never entered.
@pytest.fixture()
def client():
    with patch("api.run_sync"), \
         patch("api.BackgroundScheduler") as MockSched:
        MockSched.return_value.start = MagicMock()
        MockSched.return_value.shutdown = MagicMock()
        from api import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


FEED_ID = str(uuid.uuid4())
SAMPLE_FEED = {
    "id": FEED_ID,
    "name": "Test Feed",
    "url": "https://taxii.example.com/taxii2/",
    "enabled": True,
    "poll_frequency_min": 60,
    "last_polled_at": None,
    "status": "active",
    "created_at": datetime(2026, 6, 1, tzinfo=timezone.utc).isoformat(),
}


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /feeds — success cases
# ---------------------------------------------------------------------------

class TestCreateFeed:
    def _post(self, client, body: dict):
        return client.post("/feeds", json=body)

    def test_returns_201_on_success(self, client):
        with patch("api.get_engine"), \
             patch("api.insert_feed", return_value=SAMPLE_FEED):
            resp = self._post(client, {
                "name": "Test Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 60,
            })
        assert resp.status_code == 201

    def test_response_body_contains_feed_fields(self, client):
        with patch("api.get_engine"), \
             patch("api.insert_feed", return_value=SAMPLE_FEED):
            resp = self._post(client, {
                "name": "Test Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 60,
            })
        data = resp.json()
        assert data["name"] == "Test Feed"
        assert data["url"] == "https://taxii.example.com/taxii2/"
        assert data["status"] == "active"

    def test_auth_credentials_not_in_response(self, client):
        """auth_credentials bytes must never be serialised into the response."""
        feed_with_creds = {**SAMPLE_FEED, "auth_credentials": b"encrypted-bytes"}
        with patch("api.get_engine"), \
             patch("api.insert_feed", return_value=feed_with_creds):
            resp = self._post(client, {
                "name": "Test Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 60,
            })
        assert "auth_credentials" not in resp.json()

    def test_enabled_defaults_to_true(self, client):
        captured = {}

        def fake_insert(conn, *, name, url, poll_frequency_min, enabled, auth_credentials):
            captured["enabled"] = enabled
            return SAMPLE_FEED

        with patch("api.get_engine"), patch("api.insert_feed", side_effect=fake_insert):
            self._post(client, {
                "name": "Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 30,
            })

        assert captured["enabled"] is True

    def test_enabled_can_be_set_false(self, client):
        captured = {}

        def fake_insert(conn, *, name, url, poll_frequency_min, enabled, auth_credentials):
            captured["enabled"] = enabled
            return SAMPLE_FEED

        with patch("api.get_engine"), patch("api.insert_feed", side_effect=fake_insert):
            self._post(client, {
                "name": "Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 30,
                "enabled": False,
            })

        assert captured["enabled"] is False

    def test_poll_frequency_forwarded_to_insert(self, client):
        captured = {}

        def fake_insert(conn, *, name, url, poll_frequency_min, enabled, auth_credentials):
            captured["poll_frequency_min"] = poll_frequency_min
            return SAMPLE_FEED

        with patch("api.get_engine"), patch("api.insert_feed", side_effect=fake_insert):
            self._post(client, {
                "name": "Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 120,
            })

        assert captured["poll_frequency_min"] == 120


# ---------------------------------------------------------------------------
# POST /feeds — error cases
# ---------------------------------------------------------------------------

class TestCreateFeedErrors:
    def _post(self, client, body: dict):
        return client.post("/feeds", json=body)

    def test_returns_409_on_duplicate_url(self, client):
        with patch("api.get_engine"), \
             patch("api.insert_feed", return_value=None):
            resp = self._post(client, {
                "name": "Duplicate",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 60,
            })
        assert resp.status_code == 409

    def test_returns_422_when_poll_frequency_below_1(self, client):
        resp = self._post(client, {
            "name": "Bad",
            "url": "https://taxii.example.com/taxii2/",
            "poll_frequency_min": 0,
        })
        assert resp.status_code == 422

    def test_returns_422_when_url_missing(self, client):
        resp = self._post(client, {"name": "No URL", "poll_frequency_min": 60})
        assert resp.status_code == 422

    def test_returns_422_when_name_missing(self, client):
        resp = self._post(client, {
            "url": "https://taxii.example.com/taxii2/",
            "poll_frequency_min": 60,
        })
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /feeds — credentials
# ---------------------------------------------------------------------------

class TestCreateFeedWithCredentials:
    FERNET_KEY = "tveKrs6wQb5BqXW7FMdgvYJu546OIL6GfHY8nlCzl94="

    def _post_with_creds(self, client, username="alice", password="s3cret"):
        return client.post("/feeds", json={
            "name": "Private Feed",
            "url": "https://private-taxii.example.com/taxii2/",
            "poll_frequency_min": 60,
            "credentials": {"username": username, "password": password},
        })

    def test_encrypts_credentials_before_storing(self, client, monkeypatch):
        """auth_credentials bytes passed to insert_feed must be Fernet-encrypted."""
        monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", self.FERNET_KEY)
        captured = {}

        def fake_insert(conn, *, name, url, poll_frequency_min, enabled, auth_credentials):
            captured["auth_credentials"] = auth_credentials
            return SAMPLE_FEED

        with patch("api.get_engine"), patch("api.insert_feed", side_effect=fake_insert):
            resp = self._post_with_creds(client)

        assert resp.status_code == 201
        # Must be bytes (encrypted), not plaintext
        assert isinstance(captured["auth_credentials"], bytes)
        # Must not contain the plaintext password
        assert b"s3cret" not in captured["auth_credentials"]

    def test_encrypted_credentials_are_decryptable(self, client, monkeypatch):
        """The stored bytes must decrypt back to the original username/password."""
        from cryptography.fernet import Fernet
        monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", self.FERNET_KEY)
        captured = {}

        def fake_insert(conn, *, name, url, poll_frequency_min, enabled, auth_credentials):
            captured["auth_credentials"] = auth_credentials
            return SAMPLE_FEED

        with patch("api.get_engine"), patch("api.insert_feed", side_effect=fake_insert):
            self._post_with_creds(client, username="alice", password="s3cret")

        f = Fernet(self.FERNET_KEY.encode())
        decrypted = json.loads(f.decrypt(captured["auth_credentials"]).decode())
        assert decrypted["username"] == "alice"
        assert decrypted["password"] == "s3cret"

    def test_no_credentials_stores_none(self, client, monkeypatch):
        monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", self.FERNET_KEY)
        captured = {}

        def fake_insert(conn, *, name, url, poll_frequency_min, enabled, auth_credentials):
            captured["auth_credentials"] = auth_credentials
            return SAMPLE_FEED

        with patch("api.get_engine"), patch("api.insert_feed", side_effect=fake_insert):
            client.post("/feeds", json={
                "name": "Public Feed",
                "url": "https://taxii.example.com/taxii2/",
                "poll_frequency_min": 60,
            })

        assert captured["auth_credentials"] is None

    def test_returns_500_when_key_missing(self, client, monkeypatch):
        """Submitting credentials without CREDENTIALS_ENCRYPTION_KEY set → 500."""
        monkeypatch.delenv("CREDENTIALS_ENCRYPTION_KEY", raising=False)
        with patch("api.get_engine"):
            resp = self._post_with_creds(client)
        assert resp.status_code == 500

    def test_credentials_require_both_fields(self, client, monkeypatch):
        monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", self.FERNET_KEY)
        resp = client.post("/feeds", json={
            "name": "Feed",
            "url": "https://taxii.example.com/taxii2/",
            "poll_frequency_min": 60,
            "credentials": {"username": "alice"},  # missing password
        })
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /feeds/{feed_id}/sync
# ---------------------------------------------------------------------------

class TestTriggerSync:
    def test_returns_202_for_valid_feed(self, client):
        with patch("api.get_engine"), \
             patch("api.get_feed_by_id", return_value=SAMPLE_FEED), \
             patch("api.sync_one_feed"):
            resp = client.post(f"/feeds/{FEED_ID}/sync")
        assert resp.status_code == 202

    def test_response_contains_feed_id(self, client):
        with patch("api.get_engine"), \
             patch("api.get_feed_by_id", return_value=SAMPLE_FEED), \
             patch("api.sync_one_feed"):
            resp = client.post(f"/feeds/{FEED_ID}/sync")
        data = resp.json()
        assert data["feed_id"] == FEED_ID
        assert data["status"] == "triggered"

    def test_returns_404_for_unknown_feed(self, client):
        with patch("api.get_engine"), \
             patch("api.get_feed_by_id", return_value=None):
            resp = client.post(f"/feeds/{FEED_ID}/sync")
        assert resp.status_code == 404

    def test_returns_400_for_invalid_uuid(self, client):
        resp = client.post("/feeds/not-a-uuid/sync")
        assert resp.status_code == 400

    def test_sync_is_dispatched_as_background_task(self, client):
        """sync_one_feed must be registered with BackgroundTasks, not called inline."""
        with patch("api.get_engine"), \
             patch("api.get_feed_by_id", return_value=SAMPLE_FEED), \
             patch("api.sync_one_feed") as mock_sync:
            resp = client.post(f"/feeds/{FEED_ID}/sync")
        assert resp.status_code == 202
        # TestClient runs background tasks synchronously, so the mock is called
        mock_sync.assert_called_once()

    def test_sync_receives_correct_feed(self, client):
        """sync_one_feed must be called with the feed dict returned by get_feed_by_id."""
        with patch("api.get_engine") as mock_engine, \
             patch("api.get_feed_by_id", return_value=SAMPLE_FEED), \
             patch("api.sync_one_feed") as mock_sync:
            client.post(f"/feeds/{FEED_ID}/sync")
        _, feed_arg = mock_sync.call_args.args
        assert feed_arg == SAMPLE_FEED

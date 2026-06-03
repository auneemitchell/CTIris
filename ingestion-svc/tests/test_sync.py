"""
Tests for sync.py — the sync orchestration layer.

All external dependencies (DB helpers, TAXII client) are mocked so these
tests run offline with no real database or network connection.

Patching targets use the ``sync.*`` namespace because that is where the
names are bound after ``from db import ...`` and ``from taxii_client import ...``.

Tests are split into two classes:
- ``TestSyncOneFeed``: unit tests for ``sync_one_feed``, the per-feed core logic.
- ``TestRunSync``: integration-level tests for ``run_sync``, the outer loop.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, call, patch

import pytest

from sync import sync_one_feed, run_sync

FEED_ID = uuid.uuid4()
LAST_POLLED_AT = datetime(2024, 1, 1, tzinfo=timezone.utc)
FEED_URL = "https://attack-taxii.mitre.org/taxii2/"

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
]


FERNET_KEY = "tveKrs6wQb5BqXW7FMdgvYJu546OIL6GfHY8nlCzl94="


def _make_feed(last_polled_at=None, name="MITRE ATT&CK Enterprise", url=FEED_URL, auth_credentials=None):
    return {"id": FEED_ID, "name": name, "url": url, "last_polled_at": last_polled_at, "auth_credentials": auth_credentials}


def _make_engine():
    """Return a mock engine whose begin() context manager yields a mock conn."""
    conn = MagicMock()
    engine = MagicMock()
    engine.begin.return_value.__enter__ = MagicMock(return_value=conn)
    engine.begin.return_value.__exit__ = MagicMock(return_value=False)
    return engine, conn


# ---------------------------------------------------------------------------
# sync_one_feed
# ---------------------------------------------------------------------------

class TestSyncOneFeed:
    def _run(self, feed, fetch_return=None, upsert_return=(2, 0, 0), fetch_raises=None, env=None):
        """Helper: run sync_one_feed with all dependencies mocked."""
        engine, conn = _make_engine()
        fetch_mock = MagicMock(
            side_effect=fetch_raises,
            return_value=fetch_return if fetch_return is not None else SAMPLE_OBJECTS,
        )
        upsert_mock = MagicMock(return_value=upsert_return)
        update_mock = MagicMock()
        log_mock = MagicMock()

        extra_patches = {}
        if env is not None:
            extra_patches["sync.os"] = patch("sync.os")

        with patch("sync.fetch_stix_objects", fetch_mock), \
             patch("sync.upsert_objects", upsert_mock), \
             patch("sync.update_feed_status", update_mock), \
             patch("sync.write_log", log_mock):
            sync_one_feed(engine, feed)

        return fetch_mock, upsert_mock, update_mock, log_mock

    def test_passes_server_url_to_fetch(self):
        """fetch_stix_objects must receive the feed's URL, not a hardcoded constant."""
        custom_url = "https://custom-taxii.example.com/taxii2/"
        feed = _make_feed(url=custom_url)
        fetch_mock, *_ = self._run(feed)
        assert fetch_mock.call_args.kwargs["server_url"] == custom_url

    def test_full_sync_when_no_last_polled_at(self):
        """On first run, added_after=None triggers a full collection download."""
        feed = _make_feed(last_polled_at=None)
        fetch_mock, *_ = self._run(feed)
        assert fetch_mock.call_args.kwargs["added_after"] is None

    def test_incremental_sync_passes_last_polled_at(self):
        """On subsequent runs, last_polled_at is forwarded to the TAXII client."""
        feed = _make_feed(last_polled_at=LAST_POLLED_AT)
        fetch_mock, *_ = self._run(feed)
        assert fetch_mock.call_args.kwargs["added_after"] == LAST_POLLED_AT

    def test_write_log_receives_correct_counts(self):
        """Counts returned by upsert_objects are forwarded to write_log."""
        feed = _make_feed()
        _, _, _, log_mock = self._run(feed, upsert_return=(5, 3, 2))
        _, kwargs = log_mock.call_args
        assert kwargs["items_received"] == len(SAMPLE_OBJECTS)
        assert kwargs["items_new"] == 5
        assert kwargs["items_updated"] == 3
        assert kwargs["status"] == "success"

    def test_failed_fetch_sets_error_status(self):
        """When the TAXII fetch raises, status 'failed' is written to the log."""
        feed = _make_feed()
        _, _, _, log_mock = self._run(feed, fetch_raises=RuntimeError("timeout"))
        _, kwargs = log_mock.call_args
        assert kwargs["status"] == "failed"
        assert kwargs["errors"]["type"] == "RuntimeError"
        assert "timeout" in kwargs["errors"]["message"]

    def test_failed_fetch_marks_feed_as_error(self):
        """Feed status is set to 'error' when the sync fails."""
        feed = _make_feed()
        _, _, update_mock, _ = self._run(feed, fetch_raises=ValueError("bad response"))
        status_arg = update_mock.call_args.args[-1]
        assert status_arg == "error"

    def test_successful_sync_marks_feed_as_active(self):
        """Feed status is set to 'active' when the sync succeeds."""
        feed = _make_feed()
        _, _, update_mock, _ = self._run(feed)
        status_arg = update_mock.call_args.args[-1]
        assert status_arg == "active"

    def test_write_log_always_called_even_on_failure(self):
        """write_log and update_feed_status must run even when the fetch fails."""
        feed = _make_feed()
        _, _, update_mock, log_mock = self._run(
            feed, fetch_raises=RuntimeError("network error")
        )
        log_mock.assert_called_once()
        update_mock.assert_called_once()

    def test_upsert_not_called_when_fetch_fails(self):
        """upsert_objects should not be called if the TAXII fetch raises."""
        feed = _make_feed()
        _, upsert_mock, _, _ = self._run(feed, fetch_raises=RuntimeError("timeout"))
        upsert_mock.assert_not_called()

    def test_persist_failure_does_not_raise(self):
        """If writing the checkpoint fails, sync_one_feed must not propagate."""
        feed = _make_feed()
        engine, _ = _make_engine()
        # Make both engine.begin() calls raise to simulate DB unavailable for persist
        engine.begin.return_value.__enter__ = MagicMock(
            side_effect=[MagicMock(), RuntimeError("DB gone")]
        )
        engine.begin.return_value.__exit__ = MagicMock(return_value=False)

        with patch("sync.fetch_stix_objects", return_value=SAMPLE_OBJECTS), \
             patch("sync.upsert_objects", return_value=(2, 0, 0)), \
             patch("sync.update_feed_status"), \
             patch("sync.write_log"):
            # Should log an error but not raise
            sync_one_feed(engine, feed)

    # ------------------------------------------------------------------
    # Credential decryption
    # ------------------------------------------------------------------

    def test_no_credentials_passes_none_to_fetch(self, monkeypatch):
        """Feeds without auth_credentials call fetch with user=None, password=None."""
        feed = _make_feed(auth_credentials=None)
        fetch_mock, *_ = self._run(feed)
        assert fetch_mock.call_args.kwargs.get("user") is None
        assert fetch_mock.call_args.kwargs.get("password") is None

    def test_valid_credentials_decrypted_and_passed_to_fetch(self, monkeypatch):
        """Encrypted credentials are decrypted and forwarded to fetch_stix_objects."""
        import json
        from cryptography.fernet import Fernet
        f = Fernet(FERNET_KEY.encode())
        encrypted = f.encrypt(json.dumps({"username": "alice", "password": "s3cret"}).encode())

        monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", FERNET_KEY)
        feed = _make_feed(auth_credentials=encrypted)
        fetch_mock, *_ = self._run(feed)

        assert fetch_mock.call_args.kwargs.get("user") == "alice"
        assert fetch_mock.call_args.kwargs.get("password") == "s3cret"

    def test_missing_encryption_key_syncs_without_auth(self, monkeypatch):
        """If CREDENTIALS_ENCRYPTION_KEY is absent, sync proceeds without credentials."""
        import json
        from cryptography.fernet import Fernet
        f = Fernet(FERNET_KEY.encode())
        encrypted = f.encrypt(json.dumps({"username": "alice", "password": "s3cret"}).encode())

        monkeypatch.delenv("CREDENTIALS_ENCRYPTION_KEY", raising=False)
        feed = _make_feed(auth_credentials=encrypted)
        fetch_mock, *_ = self._run(feed)

        # Should still run — just without credentials (logged as warning)
        assert fetch_mock.call_args.kwargs.get("user") is None
        assert fetch_mock.call_args.kwargs.get("password") is None

    def test_corrupted_credentials_syncs_without_auth(self, monkeypatch):
        """Corrupted encrypted bytes are handled gracefully — sync still runs."""
        monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", FERNET_KEY)
        feed = _make_feed(auth_credentials=b"not-valid-fernet-data")
        fetch_mock, *_ = self._run(feed)

        assert fetch_mock.call_args.kwargs.get("user") is None
        assert fetch_mock.call_args.kwargs.get("password") is None


# ---------------------------------------------------------------------------
# run_sync
# ---------------------------------------------------------------------------

class TestRunSync:
    def _make_engine_mock(self):
        engine = MagicMock()
        conn = MagicMock()
        engine.begin.return_value.__enter__ = MagicMock(return_value=conn)
        engine.begin.return_value.__exit__ = MagicMock(return_value=False)
        return engine, conn

    def test_calls_ensure_mitre_feed(self):
        """run_sync must seed the MITRE feed row before querying enabled feeds."""
        engine, _ = self._make_engine_mock()

        with patch("sync.get_engine", return_value=engine), \
             patch("sync.ensure_mitre_feed") as ensure_mock, \
             patch("sync.get_due_feeds", return_value=[]), \
             patch("sync.sync_one_feed"):
            run_sync()

        ensure_mock.assert_called_once()

    def test_calls_get_due_feeds(self):
        """run_sync must query the feeds table to discover what to sync."""
        engine, _ = self._make_engine_mock()

        with patch("sync.get_engine", return_value=engine), \
             patch("sync.ensure_mitre_feed"), \
             patch("sync.get_due_feeds", return_value=[]) as feeds_mock, \
             patch("sync.sync_one_feed"):
            run_sync()

        feeds_mock.assert_called_once()

    def test_syncs_each_enabled_feed(self):
        """sync_one_feed is called once per feed returned by get_enabled_feeds."""
        engine, _ = self._make_engine_mock()
        feed1 = _make_feed(name="Feed A")
        feed2 = _make_feed(name="Feed B")

        with patch("sync.get_engine", return_value=engine), \
             patch("sync.ensure_mitre_feed"), \
             patch("sync.get_due_feeds", return_value=[feed1, feed2]), \
             patch("sync.sync_one_feed") as sync_mock:
            run_sync()

        assert sync_mock.call_count == 2
        synced_feeds = [c.args[1] for c in sync_mock.call_args_list]
        assert feed1 in synced_feeds
        assert feed2 in synced_feeds

    def test_no_sync_when_no_enabled_feeds(self):
        """When no feeds are enabled, sync_one_feed should not be called."""
        engine, _ = self._make_engine_mock()

        with patch("sync.get_engine", return_value=engine), \
             patch("sync.ensure_mitre_feed"), \
             patch("sync.get_due_feeds", return_value=[]), \
             patch("sync.sync_one_feed") as sync_mock:
            run_sync()

        sync_mock.assert_not_called()

    def test_db_failure_is_caught_and_logged(self):
        """A DB error loading feeds must be caught — the scheduler must keep running."""
        engine, _ = self._make_engine_mock()
        engine.begin.return_value.__enter__ = MagicMock(
            side_effect=RuntimeError("connection refused")
        )

        with patch("sync.get_engine", return_value=engine), \
             patch("sync.sync_one_feed") as sync_mock:
            run_sync()  # must not raise

        sync_mock.assert_not_called()

    def test_one_feed_failure_does_not_prevent_others(self):
        """Both feeds run even if sync_one_feed raises for one.

        ThreadPoolExecutor submits all feeds before checking results, so an
        exception on one thread does not prevent the others from executing.
        The exception is caught by run_sync's as_completed loop and logged.
        """
        engine, _ = self._make_engine_mock()
        feed1 = _make_feed(name="Failing Feed")
        feed2 = _make_feed(name="Healthy Feed")

        call_count = 0

        def maybe_raise(eng, feed):
            nonlocal call_count
            call_count += 1
            if feed["name"] == "Failing Feed":
                raise RuntimeError("unexpected failure")

        with patch("sync.get_engine", return_value=engine), \
             patch("sync.ensure_mitre_feed"), \
             patch("sync.get_due_feeds", return_value=[feed1, feed2]), \
             patch("sync.sync_one_feed", side_effect=maybe_raise):
            run_sync()  # must not raise — exception is caught in the futures loop

        # Both feeds were submitted and executed despite feed1 raising
        assert call_count == 2

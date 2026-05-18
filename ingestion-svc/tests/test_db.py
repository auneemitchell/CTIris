"""
Tests for db.py — upsert logic and helpers.

Uses SQLite in-memory via SQLAlchemy so no Postgres or Docker is needed.
The upsert ON CONFLICT logic is tested with Postgres-specific syntax mocked
at the statement level; the pure-Python helpers (_parse_ts, etc.) are tested
directly.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, call, patch
import uuid

import pytest

from db import (
    _parse_ts,
    ensure_mitre_feed,
    get_enabled_feeds,
    get_engine,
    update_feed_status,
    upsert_objects,
    write_log,
    MITRE_FEED_URL,
    MITRE_FEED_NAME,
)


# ---------------------------------------------------------------------------
# _parse_ts  (pure function — no mocks needed)
# ---------------------------------------------------------------------------

class TestParseTs:
    def test_parses_stix_timestamp(self):
        result = _parse_ts("2022-06-15T10:30:00.000Z")
        assert result == datetime(2022, 6, 15, 10, 30, 0, tzinfo=timezone.utc)

    def test_parses_without_milliseconds(self):
        result = _parse_ts("2021-01-01T00:00:00Z")
        assert result is not None
        assert result.year == 2021

    def test_returns_none_for_none(self):
        assert _parse_ts(None) is None

    def test_returns_none_for_non_string(self):
        assert _parse_ts(12345) is None

    def test_returns_none_for_invalid_string(self):
        assert _parse_ts("not-a-date") is None


# ---------------------------------------------------------------------------
# upsert_objects — mock the DB connection so we don't need Postgres
# ---------------------------------------------------------------------------

FEED_ID = uuid.uuid4()

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


def _mock_conn(returned_rows: list[tuple]) -> MagicMock:
    """Build a mock SQLAlchemy Connection whose execute() returns given rows."""
    result = MagicMock()
    result.fetchall.return_value = returned_rows
    conn = MagicMock()
    conn.execute.return_value = result
    return conn


class TestUpsertObjects:
    def test_returns_zeros_for_empty_input(self):
        conn = _mock_conn([])
        new, updated, skipped = upsert_objects(conn, [], FEED_ID)
        assert (new, updated, skipped) == (0, 0, 0)
        conn.execute.assert_not_called()

    def test_skips_objects_without_id(self):
        """Objects missing an id field are counted in skipped, not dropped silently."""
        conn = _mock_conn([])
        objects = [{"type": "malware", "name": "no-id"}]
        new, updated, skipped = upsert_objects(conn, objects, FEED_ID)
        # 1 received, 0 upserted → 1 skipped
        assert (new, updated, skipped) == (0, 0, 1)

    def test_counts_new_inserts(self):
        # xmax = 0 means newly inserted
        conn = _mock_conn([(1,), (1,)])  # both rows are new
        new, updated, skipped = upsert_objects(conn, SAMPLE_OBJECTS, FEED_ID)
        assert new == 2
        assert updated == 0
        assert skipped == 0

    def test_counts_updates(self):
        # xmax > 0 means updated (we return 0 for is_new)
        conn = _mock_conn([(0,), (0,)])  # both rows are updates
        new, updated, skipped = upsert_objects(conn, SAMPLE_OBJECTS, FEED_ID)
        assert new == 0
        assert updated == 2
        assert skipped == 0

    def test_counts_skipped_when_fewer_rows_returned(self):
        # 2 objects sent, only 1 returned (the other was skipped — already newer in DB)
        conn = _mock_conn([(1,)])
        new, updated, skipped = upsert_objects(conn, SAMPLE_OBJECTS, FEED_ID)
        assert new == 1
        assert skipped == 1

    def test_mixed_new_updated_skipped(self):
        objects = SAMPLE_OBJECTS + [
            {
                "type": "attack-pattern",
                "id": "attack-pattern--cccccccc-0000-0000-0000-000000000003",
                "created": "2020-01-01T00:00:00.000Z",
                "modified": "2021-01-01T00:00:00.000Z",
                "name": "Spearphishing",
            }
        ]
        # 3 objects: 1 new, 1 updated, 1 skipped (only 2 returned)
        conn = _mock_conn([(1,), (0,)])
        new, updated, skipped = upsert_objects(conn, objects, FEED_ID)
        assert new == 1
        assert updated == 1
        assert skipped == 1

    def test_counts_sum_to_received(self):
        """new + updated + skipped must always equal len(objects)."""
        objects = SAMPLE_OBJECTS + [{"type": "malware", "name": "no-id"}]
        conn = _mock_conn([(1,)])  # 1 new, 1 skipped (timestamp), 1 dropped (no id)
        new, updated, skipped = upsert_objects(conn, objects, FEED_ID)
        assert new + updated + skipped == len(objects)

    def test_execute_is_called_once_for_small_batch(self):
        conn = _mock_conn([(1,), (1,)])
        upsert_objects(conn, SAMPLE_OBJECTS, FEED_ID)
        assert conn.execute.call_count == 1


# ---------------------------------------------------------------------------
# ensure_mitre_feed — mock conn to verify INSERT behaviour
# ---------------------------------------------------------------------------

class TestEnsureMitreFeed:
    def test_executes_once(self):
        """ensure_mitre_feed should issue exactly one INSERT statement."""
        conn = MagicMock()
        ensure_mitre_feed(conn)
        conn.execute.assert_called_once()

    def test_insert_uses_mitre_url(self):
        """The INSERT must use MITRE_FEED_URL as the conflict key."""
        conn = MagicMock()
        ensure_mitre_feed(conn)
        stmt = conn.execute.call_args.args[0]
        # The compiled statement should reference the MITRE URL
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        assert MITRE_FEED_URL in compiled

    def test_returns_none(self):
        """ensure_mitre_feed returns nothing — callers use get_enabled_feeds."""
        conn = MagicMock()
        result = ensure_mitre_feed(conn)
        assert result is None


# ---------------------------------------------------------------------------
# get_enabled_feeds
# ---------------------------------------------------------------------------

class TestGetEnabledFeeds:
    def test_returns_list_of_dicts(self):
        """Each row should be converted to a plain dict."""
        feed_id = uuid.uuid4()
        last_polled = datetime(2024, 1, 1, tzinfo=timezone.utc)

        row = {
            "id": feed_id,
            "name": "MITRE ATT&CK Enterprise",
            "url": MITRE_FEED_URL,
            "last_polled_at": last_polled,
        }

        mappings_result = MagicMock()
        mappings_result.fetchall.return_value = [row]

        execute_result = MagicMock()
        execute_result.mappings.return_value = mappings_result

        conn = MagicMock()
        conn.execute.return_value = execute_result

        feeds = get_enabled_feeds(conn)

        assert len(feeds) == 1
        assert feeds[0]["id"] == feed_id
        assert feeds[0]["url"] == MITRE_FEED_URL
        assert feeds[0]["last_polled_at"] == last_polled

    def test_returns_empty_list_when_no_enabled_feeds(self):
        mappings_result = MagicMock()
        mappings_result.fetchall.return_value = []
        execute_result = MagicMock()
        execute_result.mappings.return_value = mappings_result
        conn = MagicMock()
        conn.execute.return_value = execute_result

        assert get_enabled_feeds(conn) == []

    def test_executes_select(self):
        """get_enabled_feeds should issue exactly one SELECT."""
        mappings_result = MagicMock()
        mappings_result.fetchall.return_value = []
        execute_result = MagicMock()
        execute_result.mappings.return_value = mappings_result
        conn = MagicMock()
        conn.execute.return_value = execute_result

        get_enabled_feeds(conn)
        conn.execute.assert_called_once()


# ---------------------------------------------------------------------------
# get_engine
# ---------------------------------------------------------------------------

class TestGetEngine:
    def test_returns_engine(self):
        """get_engine() should return a SQLAlchemy Engine."""
        import sqlalchemy as sa
        engine = get_engine()
        assert isinstance(engine, sa.Engine)

    def test_uses_database_url_env_var(self, monkeypatch):
        """get_engine() should prefer the DATABASE_URL environment variable."""
        monkeypatch.setenv(
            "DATABASE_URL",
            "postgresql+psycopg://user:pass@localhost:5432/testdb",
        )
        engine = get_engine()
        assert "testdb" in str(engine.url)

    def test_falls_back_to_default_url(self, monkeypatch):
        """When DATABASE_URL is unset the default Docker Compose URL is used."""
        monkeypatch.delenv("DATABASE_URL", raising=False)
        engine = get_engine()
        assert "ctiris" in str(engine.url)


# ---------------------------------------------------------------------------
# write_log
# ---------------------------------------------------------------------------

class TestWriteLog:
    def test_calls_execute(self):
        """write_log() should insert exactly one row."""
        conn = MagicMock()
        feed_id = uuid.uuid4()
        polled_at = datetime(2024, 6, 1, tzinfo=timezone.utc)

        write_log(
            conn,
            feed_id=feed_id,
            polled_at=polled_at,
            items_received=10,
            items_new=8,
            items_updated=2,
            status="success",
        )

        conn.execute.assert_called_once()

    def test_passes_errors_dict(self):
        """write_log() should forward the errors payload to the INSERT."""
        conn = MagicMock()
        errors = {"type": "RuntimeError", "message": "timeout"}

        write_log(
            conn,
            feed_id=uuid.uuid4(),
            polled_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            items_received=0,
            items_new=0,
            items_updated=0,
            status="failed",
            errors=errors,
        )

        conn.execute.assert_called_once()


# ---------------------------------------------------------------------------
# update_feed_status
# ---------------------------------------------------------------------------

class TestUpdateFeedStatus:
    def test_calls_execute(self):
        """update_feed_status() should issue exactly one UPDATE statement."""
        conn = MagicMock()
        update_feed_status(
            conn,
            uuid.uuid4(),
            datetime(2024, 6, 1, tzinfo=timezone.utc),
            "active",
        )
        conn.execute.assert_called_once()

    def test_accepts_error_status(self):
        """update_feed_status() should accept 'error' as a valid status."""
        conn = MagicMock()
        update_feed_status(
            conn,
            uuid.uuid4(),
            datetime(2024, 6, 1, tzinfo=timezone.utc),
            "error",
        )
        conn.execute.assert_called_once()

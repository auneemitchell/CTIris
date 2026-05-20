"""
Shared pytest fixtures for query-svc tests.

Test configuration file that pytest looks for at the start of testing.
"""

import pytest
from unittest.mock import MagicMock

from main import app, get_db

# autouse=True means this will run before every unit test
# This is ensuring that if a method would call get_db while testing main, it
# calls the test DB instead, and clears the override after.
@pytest.fixture(autouse=True)
def mock_db_default():
    """Always override get_db with an empty mock so tests never hit Postgres.

    Individual tests that need specific return values can call
    app.dependency_overrides[get_db] = _override(...) to replace this.
    The fixture clears all overrides after each test.
    """
    conn = MagicMock()
    result = MagicMock()
    result.mappings.return_value.fetchall.return_value = []
    result.mappings.return_value.fetchone.return_value = None
    conn.execute.return_value = result

    def _dep():
        yield conn

    app.dependency_overrides[get_db] = _dep
    #Some tests will do their own override of get_db, but this yield ensure if
    #they do, this method will still do the cleanup for them.
    yield
    app.dependency_overrides.clear()

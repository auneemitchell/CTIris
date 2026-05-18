"""
Tests for scheduler.py — APScheduler setup and container entry point.

``main()`` is tested by mocking ``run_sync`` and ``BlockingScheduler`` so no
real scheduler threads are started and no sync actually runs.
"""

from unittest.mock import MagicMock, call, patch

import pytest


class TestMain:
    def test_runs_initial_sync_before_scheduler_starts(self):
        """run_sync() must be called once immediately on startup, before the
        scheduler loop begins, so data is available as soon as the container
        is healthy.
        """
        mock_scheduler = MagicMock()
        # Raise KeyboardInterrupt so BlockingScheduler.start() exits cleanly
        mock_scheduler.start.side_effect = KeyboardInterrupt

        with patch("scheduler.run_sync") as mock_run_sync, \
             patch("scheduler.BlockingScheduler", return_value=mock_scheduler):
            from scheduler import main
            main()

        mock_run_sync.assert_called_once()

    def test_initial_sync_happens_before_scheduler_start(self):
        """The initial run_sync() call must precede BlockingScheduler.start()."""
        call_order = []
        mock_scheduler = MagicMock()

        def fake_start():
            call_order.append("start")
            raise KeyboardInterrupt

        mock_scheduler.start.side_effect = fake_start

        def fake_run_sync():
            call_order.append("sync")

        with patch("scheduler.run_sync", side_effect=fake_run_sync), \
             patch("scheduler.BlockingScheduler", return_value=mock_scheduler):
            from scheduler import main
            main()

        assert call_order.index("sync") < call_order.index("start")

    def test_scheduler_job_added_with_correct_id(self):
        """APScheduler job must be registered with id='mitre_sync'."""
        mock_scheduler = MagicMock()
        mock_scheduler.start.side_effect = KeyboardInterrupt

        with patch("scheduler.run_sync"), \
             patch("scheduler.BlockingScheduler", return_value=mock_scheduler):
            from scheduler import main
            main()

        mock_scheduler.add_job.assert_called_once()
        _, kwargs = mock_scheduler.add_job.call_args
        assert kwargs.get("id") == "mitre_sync"

    def test_scheduler_job_targets_run_sync(self):
        """The scheduled job function must be run_sync."""
        mock_scheduler = MagicMock()
        mock_scheduler.start.side_effect = KeyboardInterrupt

        with patch("scheduler.run_sync") as mock_run_sync, \
             patch("scheduler.BlockingScheduler", return_value=mock_scheduler):
            from scheduler import main
            main()

        first_positional_arg = mock_scheduler.add_job.call_args.args[0]
        assert first_positional_arg is mock_run_sync

    def test_handles_keyboard_interrupt_gracefully(self):
        """KeyboardInterrupt (Ctrl-C / docker stop) must not propagate."""
        mock_scheduler = MagicMock()
        mock_scheduler.start.side_effect = KeyboardInterrupt

        with patch("scheduler.run_sync"), \
             patch("scheduler.BlockingScheduler", return_value=mock_scheduler):
            from scheduler import main
            main()  # should not raise

    def test_handles_system_exit_gracefully(self):
        """SystemExit (e.g. from signal handlers) must not propagate."""
        mock_scheduler = MagicMock()
        mock_scheduler.start.side_effect = SystemExit

        with patch("scheduler.run_sync"), \
             patch("scheduler.BlockingScheduler", return_value=mock_scheduler):
            from scheduler import main
            main()  # should not raise

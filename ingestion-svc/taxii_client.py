"""
TAXII 2.1 client.

Hardcoded to MITRE TAXII server for now.

When the API and feed management are ready, the runner will pass the server
URL and collection hints from the feeds table so users can configure their
own servers through the UI.  At that point, ``fetch_stix_objects`` already
accepts ``server_url`` and ``collection_title`` parameters — the constants
below simply serve as the defaults while only MITRE is configured.
"""

import logging
from datetime import datetime

from taxii2client.common import _HTTPConnection
from taxii2client.v21 import Server

logger = logging.getLogger(__name__)

# Defaults used until the API/UI allows users to configure their own feeds.
MITRE_DISCOVERY_URL = "https://attack-taxii.mitre.org/taxii2/"
MITRE_COLLECTION_TITLE = "enterprise"  # matched case-insensitively

# Seconds to wait for any single TAXII HTTP response before giving up.
# Without a timeout, a hung server would freeze the ingestion service
# indefinitely since APScheduler's BlockingScheduler runs on the main thread.
TAXII_TIMEOUT = 30


def _make_conn() -> _HTTPConnection:
    """Return a TAXII connection with TAXII_TIMEOUT pre-applied.

    Constructs ``_HTTPConnection`` and patches its session *before* the conn
    is passed to ``Server``, so the discovery request is covered from the
    very first call — not just subsequent requests.

    Wrapped in a try/except so that if taxii2client's internals ever change,
    the service degrades (no timeout) rather than crashing.
    """
    conn = _HTTPConnection(user=None, password=None, verify=True, proxies=None, version="2.1")
    try:
        _orig_send = conn.session.send

        def send_with_timeout(request, **kwargs):
            kwargs.setdefault("timeout", TAXII_TIMEOUT)
            return _orig_send(request, **kwargs)

        conn.session.send = send_with_timeout
    except AttributeError:
        logger.warning(
            "Could not inject request timeout — taxii2client internals may have changed"
        )
    return conn


def _find_collection(server: Server, title_hint: str):
    """Return the best-matching collection from a TAXII server.

    Walks all API roots and does a case-insensitive substring match of
    ``title_hint`` against each collection's title.  Falls back to the first
    available collection when nothing matches so the service degrades
    gracefully rather than crashing.

    This function is intentionally generic so it works for any TAXII server,
    not just MITRE.  When users can add their own feeds via the UI, the runner
    will pass each feed's stored collection title as ``title_hint``.

    Args:
        server: An authenticated ``taxii2client.v21.Server`` instance.
        title_hint: Substring to search for in collection titles
            (case-insensitive).  Pass an empty string to always use the
            first available collection.

    Returns:
        A ``taxii2client.v21.Collection`` ready to call ``get_objects()`` on.

    Raises:
        RuntimeError: If the server exposes no collections at all.
    """
    if title_hint:
        for api_root in server.api_roots:
            for collection in api_root.collections:
                title = getattr(collection, "title", "") or ""
                if title_hint.lower() in title.lower():
                    logger.info("Using collection: %s", title)
                    return collection

    # No title matched (or no hint given) — fall back to the first collection
    for api_root in server.api_roots:
        cols = api_root.collections
        if cols:
            logger.warning(
                "No collection matched title hint %r; falling back to: %s",
                title_hint,
                getattr(cols[0], "title", str(cols[0])),
            )
            return cols[0]

    raise RuntimeError(
        f"No TAXII collections found on server: {server.url}"
    )


def _objects_from_response(response) -> list[dict]:
    """Extract the STIX object list from a TAXII envelope response.

    ``taxii2client`` may return either a plain ``dict`` (the raw envelope) or
    a response object with an ``.objects`` attribute depending on the version
    and the endpoint.  This helper normalises both cases.
    """
    if isinstance(response, dict):
        return list(response.get("objects") or [])
    return list(getattr(response, "objects", None) or [])


def _next_marker(response) -> str | None:
    """Return the pagination continuation token, or ``None`` if exhausted.

    TAXII 2.1 uses a ``next`` field in the envelope to indicate more pages.
    When it is absent or ``None`` the caller should stop paginating.
    """
    if isinstance(response, dict):
        return response.get("next")
    return getattr(response, "next", None)


def fetch_stix_objects(
    server_url: str = MITRE_DISCOVERY_URL,
    collection_title: str = MITRE_COLLECTION_TITLE,
    added_after: datetime | None = None,
) -> list[dict]:
    """Fetch all STIX objects from the given TAXII collection.

    On the first run ``added_after`` is ``None``, so the full collection is
    downloaded (~25 k objects for MITRE Enterprise ATT&CK).  On subsequent
    runs the runner passes ``last_polled_at`` from the database, limiting the
    response to objects changed since the previous sync (incremental mode).

    This function is intentionally synchronous.  APScheduler's
    ``BlockingScheduler`` runs jobs on the main thread, so there is no event
    loop to block.

    Args:
        server_url: TAXII 2.1 discovery URL.  Defaults to the MITRE ATT&CK
            server; pass a different URL for user-configured feeds.
        collection_title: Case-insensitive substring to match against
            collection titles.  Defaults to ``"enterprise"`` for MITRE; pass
            an empty string to use the first available collection.
        added_after: Restrict results to objects modified after this UTC
            timestamp.  Pass ``None`` for a full initial sync.

    Returns:
        List of raw STIX 2.1 object dicts exactly as returned by the server.
    """
    logger.info("Connecting to TAXII server: %s", server_url)
    server = Server(server_url, conn=_make_conn())
    collection = _find_collection(server, title_hint=collection_title)

    kwargs: dict = {}
    if added_after is not None:
        # TAXII 2.1 timestamps must be RFC 3339 with millisecond precision
        kwargs["added_after"] = (
            added_after.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        )
        logger.info("Incremental sync — added_after: %s", kwargs["added_after"])
    else:
        logger.info("Full sync (no added_after filter)")

    all_objects: list[dict] = []
    page = 1

    response = collection.get_objects(**kwargs)
    batch = _objects_from_response(response)
    all_objects.extend(batch)
    logger.info("Page %d: %d objects", page, len(batch))

    # Follow TAXII pagination until the server stops returning a next marker
    while marker := _next_marker(response):
        page += 1
        response = collection.get_objects(next=marker, **kwargs)
        batch = _objects_from_response(response)
        all_objects.extend(batch)
        logger.info(
            "Page %d: +%d objects (running total: %d)",
            page,
            len(batch),
            len(all_objects),
        )

    logger.info("Fetch complete — %d total STIX objects", len(all_objects))
    return all_objects

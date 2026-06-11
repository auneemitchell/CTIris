"""
seed_locations.py — Import all STIX location objects from the OASIS Open
cti-stix-common-objects repository into the stix_objects table. This adds every
country, US state, and some regions as location STIX objects to the DB. 

Downloads the repo as a tar.gz archive (one HTTP request, no API key or
rate-limit risk) and upserts every file found under objects/location/.
Existing rows are left untouched (ON CONFLICT DO NOTHING).

Usage:
    docker compose run --rm db-svc python seed_locations.py

The DATABASE_URL environment variable is read automatically from the
docker compose environment, so no extra flags are needed when run this way.
To run from the host, set DATABASE_URL explicitly:
    DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ctiris \\
        python db-svc/seed_locations.py
"""

import io
import json
import os
import sys
import tarfile
import urllib.request
from datetime import datetime, timezone

import sqlalchemy as sa

ARCHIVE_URL = (
    "https://github.com/oasis-open/cti-stix-common-objects"
    "/archive/refs/heads/main.tar.gz"
)
# Path prefix inside the archive for location objects
LOCATION_PREFIX = "cti-stix-common-objects-main/objects/location/"

_INSERT = sa.text("""
    INSERT INTO stix_objects
        (stix_id, type, feed_id, properties, stix_created, stix_modified)
    VALUES
        (:stix_id, :type, NULL, CAST(:properties AS jsonb), :stix_created, :stix_modified)
    ON CONFLICT (stix_id) DO NOTHING
""")


def _get_engine() -> sa.Engine:
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@postgres:5432/ctiris",
    )
    return sa.create_engine(url, pool_pre_ping=True)


def _parse_ts(raw: object) -> datetime | None:
    if not isinstance(raw, str):
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def download_locations() -> list[dict]:
    """Download the OASIS repo archive and return all location objects."""
    print(f"Downloading archive from GitHub…", flush=True)
    req = urllib.request.Request(
        ARCHIVE_URL,
        headers={"User-Agent": "CTIris/seed_locations"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        archive_bytes = resp.read()

    print(f"Download complete ({len(archive_bytes) // 1024} KB). Extracting…", flush=True)

    objects: list[dict] = []
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as tf:
        for member in tf.getmembers():
            if (
                member.name.startswith(LOCATION_PREFIX)
                and member.name.endswith(".json")
                and not member.isdir()
            ):
                f = tf.extractfile(member)
                if f is None:
                    continue
                try:
                    obj = json.loads(f.read())
                except json.JSONDecodeError as exc:
                    print(f"  Skipping {member.name}: JSON parse error — {exc}", file=sys.stderr)
                    continue

                # Each file may be a raw STIX object or a STIX bundle wrapper.
                if obj.get("type") == "bundle":
                    for item in obj.get("objects", []):
                        if item.get("type") == "location" and item.get("id"):
                            objects.append(item)
                elif obj.get("type") == "location" and obj.get("id"):
                    objects.append(obj)
                else:
                    print(f"  Skipping {member.name}: unrecognised structure (type={obj.get('type')!r})", file=sys.stderr)

    return objects


def upsert(engine: sa.Engine, objects: list[dict]) -> int:
    """Upsert location objects into stix_objects. Returns number inserted."""
    rows = [
        {
            "stix_id": obj["id"],
            "type": obj["type"],
            "properties": json.dumps(obj),
            "stix_created": _parse_ts(obj.get("created")),
            "stix_modified": _parse_ts(obj.get("modified")),
        }
        for obj in objects
    ]

    stix_ids = [obj["id"] for obj in objects]
    with engine.begin() as conn:
        # Count by stix_id rather than type so this works for any object type.
        before: int = conn.execute(
            sa.text("SELECT COUNT(*) FROM stix_objects WHERE stix_id = ANY(:ids)"),
            {"ids": stix_ids},
        ).scalar_one()

        # SQLAlchemy 2.x executes a list of dicts in executemany mode
        conn.execute(_INSERT, rows)

        after: int = conn.execute(
            sa.text("SELECT COUNT(*) FROM stix_objects WHERE stix_id = ANY(:ids)"),
            {"ids": stix_ids},
        ).scalar_one()

    return after - before


def _already_seeded(engine: sa.Engine) -> bool:
    with engine.connect() as conn:
        count: int = conn.execute(
            sa.text("SELECT COUNT(*) FROM stix_objects WHERE type = 'location'")
        ).scalar_one()
    return count > 0


_SAMPLE_BUNDLE = os.path.join(os.path.dirname(__file__), "seeds", "sample_relationships.json")


def seed_local_bundle(engine: sa.Engine, path: str) -> None:
    """Upsert every object in a local STIX bundle JSON file.

    Safe to call on every startup — ON CONFLICT DO NOTHING means existing
    objects are silently skipped and only new ones are inserted.
    """
    if not os.path.exists(path):
        return

    with open(path) as f:
        bundle = json.load(f)

    objects = bundle.get("objects", [])
    if not objects:
        return

    inserted = upsert(engine, objects)
    skipped = len(objects) - inserted
    print(f"Sample bundle: {inserted} inserted, {skipped} already existed (skipped).")


def main() -> None:
    engine = _get_engine()

    if _already_seeded(engine):
        print("Location objects already present — skipping location download.")
    else:
        objects = download_locations()
        if not objects:
            print("No location objects found in the archive — check LOCATION_PREFIX.", file=sys.stderr)
            sys.exit(1)

        print(f"Found {len(objects)} location objects. Inserting…", flush=True)
        inserted = upsert(engine, objects)
        skipped = len(objects) - inserted
        print(f"Locations: {inserted} inserted, {skipped} already existed (skipped).")

    seed_local_bundle(engine, _SAMPLE_BUNDLE)


if __name__ == "__main__":
    main()

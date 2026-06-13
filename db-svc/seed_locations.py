"""
seed_locations.py — Seed the stix_objects table with reference data on startup.

Does three things in order:
1. Downloads the oasis-open/cti-stix-common-objects repo as a tar.gz archive
   and upserts every file found under objects/location/ (countries, US states,
   regions). Existing rows are left untouched (ON CONFLICT DO NOTHING).
2. Upserts the canonical industry-sector-ov identity objects from
   seeds/sector_identities.json (one identity per sector, identity_class=class).
3. Upserts any additional seed data from seeds/sample_relationships.json.

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
ARCHIVE_ROOT = "cti-stix-common-objects-main/objects/"

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


def _download_archive() -> bytes:
    print("Downloading archive from GitHub…", flush=True)
    req = urllib.request.Request(
        ARCHIVE_URL,
        headers={"User-Agent": "CTIris/seed_locations"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    print(f"Download complete ({len(data) // 1024} KB).", flush=True)
    return data


def extract_objects(archive_bytes: bytes, stix_type: str) -> list[dict]:
    """Extract all objects of a given STIX type from the archive."""
    prefix = f"{ARCHIVE_ROOT}{stix_type}/"
    objects: list[dict] = []
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as tf:
        for member in tf.getmembers():
            if not (member.name.startswith(prefix) and member.name.endswith(".json") and not member.isdir()):
                continue
            f = tf.extractfile(member)
            if f is None:
                continue
            try:
                obj = json.loads(f.read())
            except json.JSONDecodeError as exc:
                print(f"  Skipping {member.name}: JSON parse error — {exc}", file=sys.stderr)
                continue

            if obj.get("type") == "bundle":
                for item in obj.get("objects", []):
                    if item.get("type") == stix_type and item.get("id"):
                        objects.append(item)
            elif obj.get("type") == stix_type and obj.get("id"):
                objects.append(obj)
            else:
                print(f"  Skipping {member.name}: unrecognized structure (type={obj.get('type')!r})", file=sys.stderr)

    return objects


def upsert(engine: sa.Engine, objects: list[dict]) -> int:
    """Insert STIX objects into stix_objects, skipping duplicates. Returns number inserted."""
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


_SAMPLE_BUNDLE = os.path.join(os.path.dirname(__file__), "seeds", "sample_relationships.json")
_SECTOR_IDENTITIES = os.path.join(os.path.dirname(__file__), "seeds", "sector_identities.json")


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


def seed_sector_identities(engine: sa.Engine, path: str) -> None:
    """Upsert the canonical sector identity set. Idempotent — existing rows are skipped."""
    if not os.path.exists(path):
        print(f"Sector identities file not found: {path}", file=sys.stderr)
        return

    with open(path) as f:
        bundle = json.load(f)

    objects = bundle.get("objects", [])
    if not objects:
        return

    inserted = upsert(engine, objects)
    skipped = len(objects) - inserted
    print(f"Sector identities: {inserted} inserted, {skipped} already existed (skipped).")


def _seed_type(engine: sa.Engine, archive_bytes: bytes, stix_type: str) -> None:
    """Upsert all objects of a given STIX type from the archive. Always runs — idempotent."""
    objects = extract_objects(archive_bytes, stix_type)
    if not objects:
        print(f"No {stix_type} objects found in the archive.", file=sys.stderr)
        return

    print(f"Found {len(objects)} {stix_type} objects. Inserting…", flush=True)
    inserted = upsert(engine, objects)
    skipped = len(objects) - inserted
    print(f"{stix_type}: {inserted} inserted, {skipped} already existed (skipped).")


def main() -> None:
    engine = _get_engine()
    archive_bytes = _download_archive()

    _seed_type(engine, archive_bytes, "location")
    seed_sector_identities(engine, _SECTOR_IDENTITIES)
    seed_local_bundle(engine, _SAMPLE_BUNDLE)


if __name__ == "__main__":
    main()

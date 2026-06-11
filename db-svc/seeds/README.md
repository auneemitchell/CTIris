# db-svc/seeds

Hand-crafted STIX bundles loaded into the database on every `db-svc` startup via `seed_locations.py`.

## Files

| File | Description |
|---|---|
| `sample_relationships.json` | `targets` relationship objects linking campaign STIX objects to OASIS location objects. Used to populate the heatmap widget with sample data. |

## Adding your own relationships

Each object in the bundle is a STIX 2.1 relationship. To add a `targets` relationship:

1. **Find a source object** — any campaign, threat-actor, malware, etc. already in the database.
   Open the dashboard at `http://localhost:5173`, go to the **STIX Objects** tab, and filter by type.
   Click an object to open its detail view — read the description to see which countries or regions
   it is known to operate in or target, then check the relationships list to see if a `targets`
   relationship to that country already exists. If it doesn't, that's a good candidate to add.
   Copy the STIX ID (e.g. `campaign--uuid`) from the detail view.

2. **Find a target location** — go to the **STIX Objects** tab and filter by type `location`.
   Each location shows its country name and STIX ID. Copy the ID of the country you want to target.

3. **Generate a UUID** for the new relationship:
   ```bash
   python3 -c "import uuid; print('relationship--' + str(uuid.uuid4()))"
   ```

4. **Add the object** to the `objects` array in `sample_relationships.json`:
   ```json
   {
     "type": "relationship",
     "spec_version": "2.1",
     "id": "relationship--<your-uuid>",
     "created": "2026-06-10T00:00:00.000Z",
     "modified": "2026-06-10T00:00:00.000Z",
     "relationship_type": "targets",
     "source_ref": "<campaign-or-threat-actor-stix-id>",
     "target_ref": "<location-stix-id>"
   }
   ```

5. **Reload** — new objects are picked up automatically on next startup. If the ID already exists, see the section below.

6. **Consider other relationship types** — the heatmap currently displays `targets` relationships, but
   the API also supports `located-at` (where a threat actor is based) and `originates-from` (where an
   attack originates). The full list of STIX relationship types and which object pairs they can connect
   is documented in the [STIX 2.1 specification](https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html).
   Adding relationships of different types can make the sample data more representative and support
   future map views beyond just targeted countries.

## Editing the bundle

Because the seed script uses `ON CONFLICT DO NOTHING`, changes to existing objects will not apply automatically — the row is already in the database and will be skipped.

To apply edits, delete the affected rows first, then restart `db-svc` (or re-run the script manually):

```bash
# Delete one specific object
docker compose exec postgres psql -U postgres -d ctiris \
  -c "DELETE FROM stix_objects WHERE stix_id = 'relationship--<uuid>';"

# Wipe and reload all sample relationships at once
docker compose exec postgres psql -U postgres -d ctiris \
  -c "DELETE FROM stix_objects WHERE type = 'relationship' AND feed_id IS NULL;"

# Re-run the seed script
docker compose run --rm db-svc python seed_locations.py
```

/**
 * Typed fetch wrappers for the CTIris query API.
 *
 * The interfaces below (StixObject, Feed, IngestionLog) manually mirror the
 * database models defined in db-svc/src/ctiris_db/models/. The Python services
 * share those models directly via the ctiris_db package, but the frontend is
 * TypeScript and cannot import from a Python package, so these must be kept
 * in sync by hand.
 *
 * ⚠️ If the database schema changes, update the matching interface here.
 */

/** Base URL for all API requests. Routes through the nginx gateway on port 80. */
export const BASE = 'http://localhost/api';

/**
 * A STIX object as stored in the database.
 * The full STIX 2.1 payload lives inside `properties` as raw JSON.
 * Other fields are extracted columns for querying and sorting.
 */
export interface StixObject {
  /** Primary key — e.g. `malware--4e57a4d2-...` */
  stix_id: string;
  /** STIX type string — e.g. `malware`, `indicator`, `threat-actor` */
  type: string;
  /** UUID of the feed this object was ingested from, or null if the feed was deleted */
  feed_id: string | null;
  /** Full STIX 2.1 JSON payload. Use `properties.name` for the display name. */
  properties: Record<string, unknown>;
  stix_created: string | null;
  stix_modified: string | null;
  /** Timestamp of when CTIris ingested this object */
  ingested_at: string;
}

/** A configured TAXII feed that CTIris polls for STIX data. */
export interface Feed {
  id: string;
  name: string;
  /** TAXII 2.1 discovery URL */
  url: string;
  enabled: boolean;
  /** How often the ingestion service polls this feed, in minutes */
  poll_frequency_min: number;
  last_polled_at: string | null;
  status: 'active' | 'paused' | 'error';
  created_at: string;
}

/** One entry in the "references" list — an object that this STIX object points to via a relationship. */
export interface StixRelationshipRef {
  /** The STIX relationship verb, e.g. `uses`, `targets`, `mitigates`. */
  relationship_type: string;
  /** STIX ID of the referenced (target) object. */
  target_ref: string;
  /** Display name of the target object, or null if unavailable. */
  target_name: string | null;
  /** STIX type of the target object, null when unresolved. */
  target_type: string | null;
  /** Whether the target object exists in the local database. */
  target_present: boolean;
}

/** One entry in the "referenced_by" list — an object that points to this STIX object via a relationship. */
export interface StixRelationshipBackRef {
  /** The STIX relationship verb, e.g. `uses`, `targets`, `mitigates`. */
  relationship_type: string;
  /** STIX ID of the referencing (source) object. */
  source_ref: string;
  /** Display name of the source object, or null if unavailable. */
  source_name: string | null;
  /** STIX type of the source object, null when unresolved. */
  source_type: string | null;
  /** Whether the source object exists in the local database. */
  source_present: boolean;
}

/** One direct STIX ID reference found in an object's JSON properties. */
export interface StixPropertyRef {
  /** Property containing the reference, e.g. `created_by_ref`. */
  property_name: string;
  /** Referenced STIX ID. */
  ref: string;
  /** Display name of the referenced object, or null if unavailable. */
  name: string | null;
  /** STIX type of the referenced object, null when unresolved. */
  type: string | null;
  /** Whether the referenced object exists in the local database. */
  present: boolean;
}

/** Relationship data for a single STIX object — two directional lists plus direct property refs. */
export interface StixRelationships {
  /** Objects that this object references as source_ref. */
  references: StixRelationshipRef[];
  /** Objects that reference this object as target_ref. */
  referenced_by: StixRelationshipBackRef[];
  /** Direct references found in object properties, used for name resolution. */
  property_refs: StixPropertyRef[];
}

/**
 * One row from the geo-heatmap endpoint.
 * Aggregated counts of location-bearing relationships, grouped by country and relationship type.
 */
export interface GeoHeatmapEntry {
  /** ISO 3166-1 alpha-2 country code from the STIX location object, or null if absent. */
  country: string | null;
  /** Display name of the location object. */
  location_name: string | null;
  /** STIX relationship type — one of: located-at, originates-from, targets. */
  relationship_type: string;
  /** Number of relationships of this type pointing at this location. */
  count: number;
}

/** One ingestion run record — written after every poll attempt, success or failure. */
export interface IngestionLog {
  id: string;
  feed_id: string;
  polled_at: string;
  items_received: number;
  items_new: number;
  items_updated: number;
  status: 'success' | 'partial' | 'failed';
  /** Error details if the run failed, null otherwise */
  errors: Record<string, unknown> | null;
}

/**
 * Internal fetch wrapper used by all API methods.
 * Throws on non-2xx responses so callers can use `.catch()` for error handling.
 * Pass an AbortSignal to cancel the request (used by StixBrowser to avoid
 * stale responses when the type filter changes quickly).
 */
async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** Response with pagination metadata from X-Total-Count header. */
export interface PaginatedResponse<T> {
  data: T;
  totalCount: number;
}

/** Typed fetch wrappers for every CTIris API endpoint. */
export const api = {
  /**
   * Fetch a page of STIX objects.
   * @param type - Optional STIX type filter (e.g. `'malware'`). Omit for all types.
   * @param limit - Max objects to return. API hard cap is 1000.
   * @param offset - Number of objects to skip, for pagination.
   * @param signal - Optional AbortSignal to cancel the request.
   * @returns Array of STIX objects.
   */
  stix: (type?: string, limit = 1000, offset = 0, signal?: AbortSignal) => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (type) p.set('type', type);
    return get<StixObject[]>(`/stix?${p}`, signal);
  },

  /**
   * Fetch a page of STIX objects with pagination metadata.
   * Supports server-side search and returns total count via X-Total-Count header.
   * @param type - Optional STIX type filter (e.g. `'malware'`). Omit for all types.
   * @param search - Optional search term to filter by STIX ID or name.
   * @param limit - Max objects to return. API hard cap is 1000.
   * @param offset - Number of objects to skip, for pagination.
   * @param signal - Optional AbortSignal to cancel the request.
   * @returns Object with `data` (array of STIX objects) and `totalCount` (from X-Total-Count header).
   */
  stixWithCount: async (type?: string, search?: string, limit = 1000, offset = 0, signal?: AbortSignal): Promise<PaginatedResponse<StixObject[]>> => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (type) p.set('type', type);
    if (search) p.set('search', search);
    const res = await fetch(`${BASE}/stix?${p}`, { signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json() as StixObject[];
    const totalCount = parseInt(res.headers.get('X-Total-Count') || '0', 10);
    return { data, totalCount };
  },

  /** Fetch object counts grouped by STIX type — one DB query, no limit. */
  stixCounts: () => get<Record<string, number>>('/stix/counts'),

  /**
   * Fetch the top entities ranked by relationship count.
   * Accepts one type or an array to rank across multiple types in one query.
   * Runs a full SQL join — not capped by the 1000-object limit.
   * @param type - STIX type or array of types (e.g. ['threat-actor', 'intrusion-set']).
   * @param limit - Number of top entries. Default 8, max 50.
   */
  topByRelationships: (type: string | string[], limit = 8) => {
    const p = new URLSearchParams({ limit: String(limit) });
    (Array.isArray(type) ? type : [type]).forEach(t => p.append('type', t));
    return get<{ stix_id: string; type: string; name: string | null; relationship_count: number }[]>(
      `/stix/top-by-relationships?${p}`
    );
  },

  /** Fetch a single STIX object by its full ID (e.g. `malware--uuid`). */
  stixById: (id: string, signal?: AbortSignal) => get<StixObject>(`/stix/${encodeURIComponent(id)}`, signal),

  /** Fetch all relationships involving a STIX object, split into two directional lists. */
  stixRelationships: (id: string, signal?: AbortSignal) =>
    get<StixRelationships>(`/stix/${encodeURIComponent(id)}/relationships`, signal),

  /** Fetch all configured TAXII feeds and their current status. */
  feeds: () => get<Feed[]>('/feeds'),

  /** Liveness check — returns `{ status: 'ok' }` if the API is reachable. */
  health: () => get<{ status: string }>('/health'),

  /**
   * Fetch ingestion run history, most recent first.
   * @param feedId - Optional feed UUID to filter logs to a single feed.
   * @param limit - Max entries to return. API hard cap is 500.
   */
  ingestionLog: (feedId?: string, limit = 50) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (feedId) p.set('feed_id', feedId);
    return get<IngestionLog[]>(`/ingestion-log?${p}`);
  },

  locations: (limit = 1000, signal?: AbortSignal) => {
    return api.stix('location', limit, 0, signal);
  },

  /**
   * Fetch pre-aggregated geographic relationship counts for the heatmap widget.
   * Returns one row per (country, relationship_type) pair — no client-side join needed.
   * @param relationshipType - Which relationship type to map. Defaults to "targets".
   *   Pass "originates-from" or "located-at" for origin/presence maps.
   */
  geoHeatmap: (relationshipType = 'targets', signal?: AbortSignal) => {
    const p = new URLSearchParams({ relationship_type: relationshipType });
    return get<GeoHeatmapEntry[]>(`/stix/geo-heatmap?${p}`, signal);
  },
};

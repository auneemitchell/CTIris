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
const BASE = 'http://localhost/api';

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

/** Typed fetch wrappers for every CTIris API endpoint. */
export const api = {
  /**
   * Fetch a page of STIX objects.
   * @param type - Optional STIX type filter (e.g. `'malware'`). Omit for all types.
   * @param limit - Max objects to return. API hard cap is 1000.
   * @param offset - Number of objects to skip, for pagination.
   * @param signal - Optional AbortSignal to cancel the request.
   */
  stix: (type?: string, limit = 1000, offset = 0, signal?: AbortSignal) => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (type) p.set('type', type);
    return get<StixObject[]>(`/stix?${p}`, signal);
  },

  /** Fetch a single STIX object by its full ID (e.g. `malware--uuid`). */
  stixById: (id: string) => get<StixObject>(`/stix/${encodeURIComponent(id)}`),

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
};

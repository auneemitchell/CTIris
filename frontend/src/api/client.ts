const BASE = 'http://localhost/api';

export interface StixObject {
  stix_id: string;
  type: string;
  feed_id: string | null;
  properties: Record<string, unknown>;
  stix_created: string | null;
  stix_modified: string | null;
  ingested_at: string;
}

export interface Feed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  poll_frequency_min: number;
  last_polled_at: string | null;
  status: 'active' | 'paused' | 'error';
  created_at: string;
}

export interface IngestionLog {
  id: string;
  feed_id: string;
  polled_at: string;
  items_received: number;
  items_new: number;
  items_updated: number;
  status: 'success' | 'partial' | 'failed';
  errors: Record<string, unknown> | null;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  stix: (type?: string, limit = 1000, offset = 0, signal?: AbortSignal) => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (type) p.set('type', type);
    return get<StixObject[]>(`/stix?${p}`, signal);
  },
  stixById: (id: string) => get<StixObject>(`/stix/${encodeURIComponent(id)}`),
  feeds: () => get<Feed[]>('/feeds'),
  health: () => get<{ status: string }>('/health'),
  ingestionLog: (feedId?: string, limit = 50) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (feedId) p.set('feed_id', feedId);
    return get<IngestionLog[]>(`/ingestion-log?${p}`);
  },
};

import type { StixObject } from '../api/client';

/**
 * Counts how many relationship objects reference each entity in the provided map.
 *
 * Both source_ref and target_ref are counted — an entity is "active" whether
 * it is the subject or the object of a relationship (e.g. both "uses" and
 * "targets" contribute to an intrusion set's score).
 *
 * @param entityMap - Map of stix_id → StixObject for the entity types you care about.
 *   Only IDs present in this map are counted; relationships between other types are ignored.
 * @param relationships - Relationship objects to scan (type === 'relationship').
 * @returns Record of stix_id → relationship count, sorted by count descending.
 */
export function countByRelationships(
  entityMap: Map<string, StixObject>,
  relationships: StixObject[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const rel of relationships) {
    const p = rel.properties as { source_ref?: string; target_ref?: string };
    if (p.source_ref && entityMap.has(p.source_ref))
      counts[p.source_ref] = (counts[p.source_ref] ?? 0) + 1;
    if (p.target_ref && entityMap.has(p.target_ref))
      counts[p.target_ref] = (counts[p.target_ref] ?? 0) + 1;
  }
  return counts;
}

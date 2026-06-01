import { useEffect, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { api } from '../api/client';
import type { StixObject } from '../api/client';
import { COLORS } from '../constants/themeColors';
import { countByRelationships } from '../utils/countByRelationships';

interface Props {
  /** Relationship objects fetched by DashboardTab and shared with this widget. */
  relationships: StixObject[];
}

/** Shape of one ranked entry after counting. */
interface ThreatEntry {
  stix_id: string;
  name: string;
  type: string;
  count: number;
}

/** Bar color per entity type. */
const TYPE_COLORS: Record<string, string> = {
  'threat-actor':  '#ff6b6b',
  'intrusion-set': '#ffa94d',
};

function typeColor(type: string) {
  return TYPE_COLORS[type] ?? COLORS.accentSecondary;
}

/**
 * Ranked list of the most relationship-connected threat actors and intrusion sets.
 *
 * How the ranking works:
 * 1. Fetch all threat-actor and intrusion-set entities from the API.
 * 2. For each relationship in the prop, check if source_ref or target_ref
 *    matches a known entity and increment its count.
 * 3. Sort descending, take top 10.
 *
 * The inline bar width is count/maxCount so the top entry always fills
 * the bar completely and everything else scales relative to it.
 *
 * Relationships are passed as a prop from DashboardTab rather than fetched
 * here to avoid a duplicate network request (MostActiveMalware needs the
 * same data).
 */
export default function MostActiveThreats({ relationships }: Props) {
  const [entities, setEntities] = useState<StixObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.stix('threat-actor', 1000),
      api.stix('intrusion-set', 1000),
    ])
      .then(([actors, sets]) => setEntities([...actors, ...sets]))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  if (!relationships.length) {
    return (
      <Typography variant="body2" sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
        No relationship data available.
      </Typography>
    );
  }

  const entityMap = new Map(entities.map(e => [e.stix_id, e]));
  const counts = countByRelationships(entityMap, relationships);

  const top: ThreatEntry[] = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, count]) => {
      const entity = entityMap.get(id)!;
      const name = (entity.properties as { name?: string }).name ?? id;
      return { stix_id: id, name, type: entity.type, count };
    });

  if (!top.length) {
    return (
      <Typography variant="body2" sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
        No linked threat actors or intrusion sets found.
      </Typography>
    );
  }

  const maxCount = top[0].count;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {top.map((entry, i) => (
        <Box
          key={entry.stix_id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 0.75,
            px: 1.5,
            borderRadius: 1,
            bgcolor: COLORS.headerBackground,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.7rem', minWidth: 22 }}>
            #{i + 1}
          </Typography>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: COLORS.textPrimary, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </Typography>
            <Box sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.07)' }}>
              <Box sx={{
                height: '100%',
                borderRadius: 2,
                bgcolor: typeColor(entry.type),
                width: `${(entry.count / maxCount) * 100}%`,
                transition: 'width 0.5s ease',
                opacity: 0.8,
              }} />
            </Box>
          </Box>

          <Chip
            label={entry.type}
            size="small"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.6rem',
              height: 18,
              bgcolor: 'transparent',
              color: typeColor(entry.type),
              border: `1px solid ${typeColor(entry.type)}55`,
              flexShrink: 0,
            }}
          />

          <Typography sx={{ color: COLORS.accentSecondary, fontFamily: 'monospace', fontSize: '0.8rem', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>
            {entry.count}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

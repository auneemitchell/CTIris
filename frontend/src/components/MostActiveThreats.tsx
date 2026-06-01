import { useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { api } from '../api/client';
import type { StixObject } from '../api/client';
import { COLORS } from '../constants/themeColors';

interface ThreatEntry {
  stix_id: string;
  name: string;
  type: string;
  count: number;
}

const TYPE_COLORS: Record<string, string> = {
  'threat-actor':  '#ff6b6b',
  'intrusion-set': '#ffa94d',
};

function typeColor(type: string) {
  return TYPE_COLORS[type] ?? COLORS.accentSecondary;
}

export default function MostActiveThreats() {
  const [relationships, setRelationships] = useState<StixObject[]>([]);
  const [entities, setEntities] = useState<StixObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stix('relationship', 1000),
      api.stix('threat-actor', 1000),
      api.stix('intrusion-set', 1000),
    ])
      .then(([rels, actors, sets]) => {
        setRelationships(rels);
        setEntities([...actors, ...sets]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: COLORS.accentSecondary }} /></Box>;

  if (!relationships.length) {
    return (
      <Typography variant="body2" sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
        No relationship data available.
      </Typography>
    );
  }

  const entityMap = new Map(entities.map(e => [e.stix_id, e]));

  const counts: Record<string, number> = {};
  for (const rel of relationships) {
    const p = rel.properties as { source_ref?: string; target_ref?: string };
    if (p.source_ref && entityMap.has(p.source_ref)) counts[p.source_ref] = (counts[p.source_ref] ?? 0) + 1;
    if (p.target_ref && entityMap.has(p.target_ref)) counts[p.target_ref] = (counts[p.target_ref] ?? 0) + 1;
  }

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

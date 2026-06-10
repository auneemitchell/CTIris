import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Typography } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { api } from '../api/client';
import { COLORS } from '../constants/themeColors';

interface ThreatEntry {
  stix_id: string;
  name: string;
  type: string;
  count: number;
}

const TYPE_COLORS: Record<string, string> = {
  'threat-actor': '#ff6b6b',
  'intrusion-set': '#ffa94d',
};

function typeColor(type: string) {
  return TYPE_COLORS[type] ?? COLORS.textQuaternary;
}

export default function MostActiveThreats() {
  const navigate = useNavigate();
  const [top, setTop] = useState<ThreatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.topByRelationships(['threat-actor', 'intrusion-set'], 10)
      .then(rows => setTop(
        rows.map(r => ({ stix_id: r.stix_id, name: r.name ?? r.stix_id, type: r.type, count: r.relationship_count }))
      ))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  if (!top.length) {
    return (
      <Typography variant="body2" sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
        No linked threat actors or intrusion sets found.
      </Typography>
    );
  }

  const maxCount = top[0].count;

  function handleRowClick(entry: ThreatEntry) {
    navigate('/stix/' + encodeURIComponent(entry.stix_id));
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {top.map((entry, i) => (
          <Box
            key={entry.stix_id}
            onClick={() => handleRowClick(entry)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 0.75,
              px: 1.5,
              borderRadius: 1,
              bgcolor: COLORS.headerBackground,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${COLORS.dataContainerBorder}`,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: COLORS.cardBackground,
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 20px ${COLORS.hoverBoxShadow}`,
                borderColor: COLORS.dataContainerBorderHover,
              },
            }}
          >
            <Typography sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.7rem', minWidth: 22 }}>
              #{i + 1}
            </Typography>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: COLORS.textPrimary, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </Typography>
              <Box sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: COLORS.dataContainerBackground }}>
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

            <Typography sx={{ color: COLORS.textQuaternary, fontFamily: 'monospace', fontSize: '0.8rem', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>
              {entry.count}
            </Typography>
          </Box>

        ))}
      </Box>

    </Box>
  );
}

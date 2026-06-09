import { useEffect, useState } from 'react';
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { api } from '../api/client';
import { COLORS } from '../constants/themeColors';
import PopUpModal from './PopUpModal';

interface CampaignData {
  stix_id: string;
  name: string;
  type: string;
  first_seen?: string;
  last_seen?: string;
}

interface RawStixData {
  stix_id: string;
  type: string;
  properties?: {
    name?: string;
    first_seen?: string;
    last_seen?: string;
  };
}

/**
 * Functional component to display the top 10 most recent STIX campaign objects, sorted by last_seen descending.
 * When a campaign object is clicked, a pop up modal appears with campaign information using the PopUpModal component.
 * @returns top 10 most active STIX campaign objects
 */
export default function MostRecentCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const rows = await api.stix('campaign', 1000, 0, controller.signal);

        const rawRows = (rows as RawStixData[]) || [];

        const formatted: CampaignData[] = rawRows.map((r) => {
          const props = r.properties || {};
          return {
            stix_id: r.stix_id,
            name: props.name || r.stix_id,
            type: r.type,
            first_seen: props.first_seen,
            last_seen: props.last_seen,
          };
        });

        const topTen = formatted
          // only keep campaigns that contain last_seen
          .filter((c) => c.last_seen)
          // convert to timestamp, then sort by newest date first (descending)
          .sort((a, b) => new Date(b.last_seen!).getTime() - new Date(a.last_seen!).getTime())
          //keep only the top 10 results
          .slice(0, 10);

        setCampaigns(topTen);
        setError(null);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') {
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
    return () => controller.abort();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  if (!campaigns.length) {
    return (
      <Typography sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>
        No campaigns found.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.72rem',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        height: '52vh',
        overflow: 'hidden',
        bgcolor: COLORS.headerBackground,
        border: `1px solid ${COLORS.dataContainerBorder}`,
        borderRadius: 2,
      }}
    >
      <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
        {campaigns.map((c) => {
          const firstSeen = c.first_seen
            ? new Date(c.first_seen).toISOString().split('T')[0]
            : 'N/A';

          const lastSeen = c.last_seen
            ? new Date(c.last_seen).toISOString().split('T')[0]
            : 'N/A';

          return (
            <ListItemButton
              key={c.stix_id}
              onClick={() => setSelectedId(c.stix_id)}
              sx={{
                py: 0.2,
                border: `1px solid ${COLORS.dataContainerBorder}`,
                borderRadius: 1,
                bgcolor: COLORS.headerBackground,
                '&:hover': {
                  bgcolor: COLORS.cardBackground,
                  borderColor: COLORS.dataContainerBorderHover,
                  boxShadow: `0 4px 20px ${COLORS.hoverBoxShadow}`
                },
              }}
            >
              <ListItemText
                primary={c.name}
                secondary={`${firstSeen} → ${lastSeen}`}
                primaryTypographyProps={{
                  fontSize: 12,
                  color: COLORS.textPrimary,
                  noWrap: true
                }}
                secondaryTypographyProps={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: COLORS.textMuted
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <PopUpModal
        stixId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Box>
  );
}
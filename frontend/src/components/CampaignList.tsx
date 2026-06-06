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
 * Functional component to display a  list of alphabetically sorted STIX campaign objects in a scrollable container. 
 * When a campaign object is clicked, a pop up modal appears with campaign information using the PopUpModal component.
 * @returns a sorted STIX 
 * 
 * campaign objects
 */
export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const rows = await api.stix('campaign', 500, 0, controller.signal);
        
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

        formatted.sort((a, b) => a.name.localeCompare(b.name));
        setCampaigns(formatted);
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
        No active campaigns found.
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
        height: 464,
        overflow: 'hidden',
        bgcolor: COLORS.headerBackground,
        border: `1px solid ${COLORS.dataContainerBorder}`,
        borderRadius: 2,
      }}
    >
      <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
        {campaigns.map((c) => {
          const firstSeen = c.first_seen
            ? new Date(c.first_seen).toLocaleDateString('sv-SE')
            : 'Unknown';

          const lastSeen = c.last_seen
            ? new Date(c.last_seen).toLocaleDateString('sv-SE')
            : 'N/A';

          return (
            <ListItemButton
              key={c.stix_id}
              onClick={() => setSelectedId(c.stix_id)}
              sx={{
                py: 0.25,
                border: `1px solid ${COLORS.dataContainerBorder}`,
                borderRadius: 1,
                bgcolor: COLORS.headerBackground,
                '&:hover': {
                  bgcolor: COLORS.cardBackground,
                  borderColor: COLORS.dataContainerBorderHover,
                },
              }}
            >
              <ListItemText
                primary={c.name}
                secondary={`${firstSeen} → ${lastSeen}`}
                primaryTypographyProps={{
                  fontSize: 12,
                  color: '#fff',
                  noWrap: true
                }}
                secondaryTypographyProps={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.5)'
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
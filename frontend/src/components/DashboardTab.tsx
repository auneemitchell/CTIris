import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { api } from '../api/client';
import { COLORS } from '../constants/themeColors';
import { STIX_TYPES } from '../constants/stixTypes';
import HelpBadge from './HelpBadge';
import SectionHeader from './SectionHeader';
import MostActiveThreats from './MostActiveThreats';
import MostActiveMalware from './MostActiveMalware';

interface Props {
  /** Called when a stat card is clicked. Switches to the STIX browser filtered to that type. */
  onTypeClick: (type: string) => void;
}

/**
 * Dashboard tab — stat cards and activity widgets.
 *
 */
export default function DashboardTab({ onTypeClick }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stixCounts()
      .then(setCounts)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  const total = Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString();

  return (
    <Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 3, fontFamily: 'monospace' }}>
        {total} objects across {STIX_TYPES.length} key types
      </Typography>

      {/* ── STAT CARDS ────────────────────────────────────────────────────────
          One card per STIX type. Clicking navigates to the STIX browser
          pre-filtered to that type via the onTypeClick prop.
          stopPropagation on the ? badge prevents the tooltip hover from
          triggering the card's click handler.
      ──────────────────────────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        {STIX_TYPES.map(t => (
          <Grid item xs={6} sm={4} md={3} key={t.key}>
            <Card
              onClick={() => onTypeClick(t.key)}
              sx={{
                background: 'linear-gradient(105deg, #402e68 0%, #7f5bce 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 2,
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(127,91,206,0.4)',
                },
              }}
            >
              {/* stopPropagation prevents the tooltip hover from triggering the card click */}
              <Box onClick={e => e.stopPropagation()} sx={{ position: 'absolute', top: 8, right: 8 }}>
                <HelpBadge
                  tooltip={t.def}
                  size="sm"
                  placement="top"
                  sx={{ color: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.12)' }}
                />
              </Box>
              <CardContent>
                <Typography variant="h4" sx={{ color: COLORS.textPrimary, fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {counts[t.key] ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', letterSpacing: 0.5, mt: 0.5 }}>
                  {t.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── WIDGETS ─────────────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Most Active Threats — ranked list of threat-actors and intrusion-sets */}
        <Grid item xs={12} md={6}>
          <SectionHeader
            title="MOST ACTIVE THREATS"
            tooltip="Threat actors and intrusion sets ranked by how many STIX relationship objects reference them. A relationship connects two STIX objects — for example, 'Lazarus Group uses Cobalt Strike' or 'APT29 targets Finance'. The more relationships an entity appears in, the more documented activity it has."
            gutterBottom={false}
          />
          <MostActiveThreats />
        </Grid>

        {/* Most Active Malware — ranked list of malware by relationship count */}
        <Grid item xs={12} md={6}>
          <SectionHeader
            title="MOST ACTIVE MALWARE"
            tooltip="Malware families ranked by how many STIX relationships reference them. The longer the bar, the more it appears across threat intelligence reports. Useful for spotting which malware is most commonly linked to attacks in your feeds."
            gutterBottom={false}
          />
          <MostActiveMalware />
        </Grid>
      </Grid>
    </Box>
  );
}

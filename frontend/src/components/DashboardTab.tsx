import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { api } from '../api/client';
import { COLORS } from '../constants/themeColors';
import { DASHBOARD_STIX_TYPES } from '../constants/stixTypes';
import HelpBadge from './HelpBadge';
import SectionHeader from './SectionHeader';
import MostActiveThreats from './MostActiveThreats';
import MostActiveMalware from './MostActiveMalware';
import Heatmap from './HeatMap';
import DonutChart from './DonutChart';
import CampaignList from './MostRecentCampaigns';

/**
 * Dashboard tab — stat cards and activity widgets.
 */
export default function DashboardTab() {
  const navigate = useNavigate();
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

  const dashboardKeys = new Set(DASHBOARD_STIX_TYPES.map(t => t.key));
  const total = Object.entries(counts)
    .filter(([k]) => dashboardKeys.has(k))
    .reduce((a, [, v]) => a + v, 0)
    .toLocaleString();

  return (
    <Box>
      <Typography variant="body2" sx={{ color: COLORS.textMuted, mb: 3, fontFamily: 'monospace' }}>
        {total} objects across {DASHBOARD_STIX_TYPES.length} key types
      </Typography>

      {/* ── STAT CARDS ────────────────────────────────────────────────────────
          One card per STIX type. Clicking navigates to the STIX browser
          pre-filtered to that type via the onTypeClick prop.
          stopPropagation on the ? badge prevents the tooltip hover from
          triggering the card's click handler.
      ──────────────────────────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        {DASHBOARD_STIX_TYPES.map(t => (
          <Grid item xs={4} sm={3} md={2} key={t.key}>
            <Card
              onClick={() => navigate('/stix?type=' + t.key)}
              sx={{
                background: COLORS.cardBackground,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: 2,
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 20px ${COLORS.hoverBoxShadow}`,
                  borderColor: COLORS.dataContainerBorderHover,
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

      <Box sx={{ display: 'flex', mt: 3 }}>
        {/* ── HEATMAP ───────────────────────────────────────────────────────────*/}
        <Box sx={{ flex: 4, p: 1 }}>
          <SectionHeader
            title="GLOBAL THREAT CONCENTRATION MAP"
            tooltip="Shows the geographic distribution of STIX objects based on mention frequency. Higher concentrations appear in darker red. Select a country to view the number of reference."
            gutterBottom={false}
          />
          <Heatmap />
        </Box>

        <Box sx = {{ flexDirection: 'row' }}>
          {/* ── DONUT CHART ─────────────────────────────────────────────────────────── */}
          <Box sx={{ flex: 1, p: 1 }}>
            <SectionHeader
              title="TARGETED INDUSTRY"
              tooltip="Shows the distribution of industries based on keyword matches within STIX object content."
              gutterBottom={false}
            />
            <DonutChart />
          </Box>

          {/* ── CAMPAIGN LIST ─────────────────────────────────────────────────────────── */}
          <Box sx={{ p: 1, mt: 3 }}>
            <SectionHeader
              title="CAMPAIGN LIST"
              tooltip="Shows a list of observed campaigns. Select a campaign to view detailed intelligence."
              gutterBottom={false}
            />
            <CampaignList />
          </Box>
        </Box>

      </Box>

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

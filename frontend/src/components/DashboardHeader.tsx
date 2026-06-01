import { useEffect, useState } from 'react';
import { Avatar, Box, Chip, Typography } from '@mui/material';
import HelpBadge from './HelpBadge';
import { COLORS } from '../constants/themeColors';
import HeaderIcon from '../assets/CTIris-Icon.png';
import { api } from '../api/client';
import type { Feed } from '../api/client';

/**
 * App header — branding and live status chips.
 *
 * - Live STATUS chip: hits /api/health on mount, shows ONLINE (green) or OFFLINE (red)
 * - Live ACTIVE FEEDS chip: counts enabled feeds from /api/feeds
 * - Educational ? tooltip on the subtitle defining what CTI is
 *
 * Chips are hidden until the first fetch resolves to avoid a flash of
 * stale hardcoded values.
 */
export default function DashboardHeader() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api.feeds().then(setFeeds).catch(() => {});
    api.health().then(r => setHealthy(r.status === 'ok')).catch(() => setHealthy(false));
  }, []);

  const activeCount = feeds.filter(f => f.enabled).length;

  return (
    <Box sx={{ bgcolor: COLORS.headerBackground, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #82e4ff', paddingY: 2, paddingX: 8 }}>
      <Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Avatar
            src={HeaderIcon}
            variant='square'
            sx={{ width: 80, height: 60, '& img': { objectFit: 'contain' } }}
          />
          <Typography variant="h3" sx={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>CTI</Typography>
          <Typography variant="h3" sx={{ color: COLORS.textSecondary, fontWeight: 'bold' }}>RIS</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="subtitle2" sx={{ color: COLORS.textPrimary, fontWeight: 'semibold' }}>
            CYBER THREAT INTELLIGENCE DASHBOARD
          </Typography>
          <HelpBadge
            size="sm"
            tooltip="Cyber Threat Intelligence (CTI) is information about who attacks computer systems, how they do it, and what tools they use. Think of CTIris as a personal wiki — you choose which public threat feeds to pull from, and the dashboard organizes everything into browsable, searchable entries using the STIX standard."
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {healthy !== null && (
          <Chip
            label={healthy ? 'STATUS: ONLINE' : 'STATUS: OFFLINE'}
            color={healthy ? 'success' : 'error'}
            variant="outlined"
            size="small"
            sx={{ fontFamily: 'monospace' }}
          />
        )}
        {feeds.length > 0 && (
          <Chip
            label={`ACTIVE FEEDS: ${activeCount}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontFamily: 'monospace' }}
          />
        )}
      </Box>
    </Box>
  );
}

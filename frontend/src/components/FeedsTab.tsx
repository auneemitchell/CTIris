import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { api } from '../api/client';
import type { Feed } from '../api/client';
import { COLORS } from '../constants/themeColors';

/** Maps the three feed status values to MUI chip color variants. */
function statusColor(status: Feed['status']): 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'error';
}

/** Returns 'Never' when a feed has never successfully synced, otherwise a locale date string. */
function formatDate(d: string | null) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString();
}

/**
 * Feeds tab — one card per configured TAXII feed.
 *
 * Each card shows the feed name, status chip (active/paused/error),
 * TAXII discovery URL, poll frequency, enabled state, and last polled time.
 * Feeds are added to the database automatically by the ingestion service
 * on startup — this tab is read-only.
 */
export default function FeedsTab() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.feeds()
      .then(setFeeds)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (!feeds.length) return <Typography sx={{ color: COLORS.textMuted, fontFamily: 'monospace' }}>No feeds configured.</Typography>;

  return (
    <Grid container spacing={2}>
      {feeds.map(feed => (
        <Grid item xs={12} sm={6} md={4} key={feed.id}>
          <Card sx={{
            bgcolor: COLORS.headerBackground,
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 2,
            height: '100%',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: COLORS.accentSecondary },
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: COLORS.textPrimary, fontWeight: 'bold', mr: 1 }}>
                  {feed.name}
                </Typography>
                <Chip
                  label={feed.status.toUpperCase()}
                  color={statusColor(feed.status)}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', flexShrink: 0 }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 1.5, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {feed.url}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
                  Poll every {feed.poll_frequency_min}m &middot; {feed.enabled ? 'Enabled' : 'Disabled'}
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.textMuted }}>
                  Last polled: {formatDate(feed.last_polled_at)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

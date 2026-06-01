import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { api } from '../api/client';
import type { Feed } from '../api/client';
import { COLORS } from '../constants/themeColors';

function statusColor(status: Feed['status']): 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'error';
}

function formatDate(d: string | null) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString();
}

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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: COLORS.accentSecondary }} /></Box>;
  if (error) return <Typography color="error" sx={{ fontFamily: 'monospace' }}>Failed to load: {error}</Typography>;
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

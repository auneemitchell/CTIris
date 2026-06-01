import { useEffect, useState } from 'react';
import {
  Box, CircularProgress, Drawer, FormControl, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import { api } from '../api/client';
import type { StixObject } from '../api/client';
import { COLORS } from '../constants/themeColors';

const STIX_TYPE_OPTIONS = [
  'attack-pattern', 'campaign', 'course-of-action', 'identity',
  'indicator', 'intrusion-set', 'malware', 'observed-data',
  'relationship', 'sighting', 'threat-actor', 'tool', 'vulnerability',
];

function getName(obj: StixObject): string {
  const name = (obj.properties as { name?: string }).name;
  return name ?? obj.stix_id;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString();
}

export default function StixBrowser() {
  const [objects, setObjects] = useState<StixObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StixObject | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api.stix(typeFilter || undefined, 200, 0, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setObjects(data);
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [typeFilter]);

  const visible = objects.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.stix_id.toLowerCase().includes(q) || getName(o).toLowerCase().includes(q);
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography sx={{ color: COLORS.textMuted, fontSize: '0.9rem', lineHeight: 1 }}>⌕</Typography>
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            minWidth: 200,
            '& input': { color: COLORS.textPrimary },
            '& .MuiOutlinedInput-root fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: COLORS.textMuted }}>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={e => setTypeFilter(e.target.value)}
            sx={{
              color: COLORS.textPrimary,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
              '& .MuiSvgIcon-root': { color: COLORS.textMuted },
            }}
          >
            <MenuItem value="">All types</MenuItem>
            {STIX_TYPE_OPTIONS.map(t => (
              <MenuItem key={t} value={t} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: COLORS.accentSecondary }} />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ fontFamily: 'monospace' }}>Failed to load: {error}</Typography>
      ) : (
        <>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, mb: 1, display: 'block', fontFamily: 'monospace' }}>
            {visible.length} object{visible.length !== 1 ? 's' : ''}
          </Typography>
          <TableContainer component={Paper} sx={{
            backgroundColor: COLORS.headerBackground,
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 2,
          }}>
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
              <TableHead>
                <TableRow>
                  {['Type', 'Name', 'ID', 'Ingested'].map(h => (
                    <TableCell key={h} sx={{ color: COLORS.textOutline, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map(obj => (
                  <TableRow
                    key={obj.stix_id}
                    onClick={() => setSelected(obj)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,255,255,0.05)' } }}
                  >
                    <TableCell sx={{ color: COLORS.accentSecondary, fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {obj.type}
                    </TableCell>
                    <TableCell sx={{ color: COLORS.textPrimary, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getName(obj)}
                    </TableCell>
                    <TableCell sx={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '0.7rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {obj.stix_id}
                    </TableCell>
                    <TableCell sx={{ color: COLORS.textMuted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {formatDate(obj.ingested_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 520 },
            bgcolor: COLORS.backgroundDefault,
            p: 3,
            borderLeft: `2px solid ${COLORS.accentSecondary}`,
          },
        }}
      >
        {selected && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1, mr: 1 }}>
                <Typography variant="overline" sx={{ color: COLORS.accentSecondary, fontFamily: 'monospace', letterSpacing: 2 }}>
                  {selected.type}
                </Typography>
                <Typography variant="h6" sx={{ color: COLORS.textPrimary, lineHeight: 1.3 }}>
                  {getName(selected)}
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', mt: 0.5 }}>
                  {selected.stix_id}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelected(null)} sx={{ color: COLORS.textMuted, mt: -0.5 }}>
                <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>✕</Typography>
              </IconButton>
            </Box>
            <Box
              component="pre"
              sx={{
                color: COLORS.textPrimary,
                fontSize: '0.72rem',
                overflow: 'auto',
                bgcolor: COLORS.backgroundContainer,
                p: 2,
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.07)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                maxHeight: 'calc(100vh - 160px)',
              }}
            >
              {JSON.stringify(selected.properties, null, 2)}
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}

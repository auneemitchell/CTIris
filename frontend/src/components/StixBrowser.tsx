import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, FormControl,
  InputAdornment, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import { api } from '../api/client';
import type { StixObject } from '../api/client';
import { COLORS } from '../constants/themeColors';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { STIX_TYPE_KEYS } from '../constants/stixTypes';

/**
 * Returns properties.name for most STIX types, falls back to stix_id for
 * types that don't have a name field (e.g. relationship, sighting).
 */
function getName(obj: StixObject): string {
  const name = (obj.properties as { name?: string }).name;
  return name ?? obj.stix_id;
}

/** Returns '—' when the date is missing rather than rendering 'Invalid Date'. */
function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

/**
 * Searchable, filterable table of all ingested STIX objects.
 *
 * Type filter (server-side): driven by the ?type= URL search param. Changing
 * the dropdown navigates to a new URL, which re-derives typeFilter and fires
 * a new fetch. An AbortController cancels in-flight requests on filter change.
 *
 * Search (client-side): filters the already-fetched array by name or stix_id
 * without an extra API call.
 *
 * Detail view: clicking a row navigates to /stix/{id}, which renders the
 * routed STIX detail page.
 */
export default function StixBrowser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Derive typeFilter directly from URL search params.
  const typeFilter = searchParams.get('type') ?? '';

  const [objects, setObjects] = useState<StixObject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // loading is true whenever typeFilter has changed but the fetch hasn't settled yet
  const loading = fetchedFor !== typeFilter;
  // suppress stale errors from a previous filter while a new fetch is in flight
  const currentError = fetchedFor === typeFilter ? error : null;

  // Fetch when filter changes; AbortController prevents stale responses
  // Currently limiting number fetches to 200 objects (PAGE_LIMIT)
  // TODO: Set up pagination
  useEffect(() => {
    const controller = new AbortController();
    const PAGE_LIMIT = 200;
    api.stix(typeFilter || undefined, PAGE_LIMIT, 0, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setObjects(data);
          setError(null);
          setFetchedFor(typeFilter);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          setError(String(e));
          setFetchedFor(typeFilter);
        }
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
            '& .MuiOutlinedInput-root fieldset': { borderColor: COLORS.dataContainerBorder },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: COLORS.dataContainerBorderHover },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: COLORS.textMuted }}>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={e => navigate('/stix' + (e.target.value ? '?type=' + e.target.value : ''))}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: COLORS.headerBackground,
                  color: COLORS.textPrimary,
                  border: `1px solid ${COLORS.dataContainerBorder}`,
                }
              }
            }}
            sx={{
              color: COLORS.textPrimary,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.dataContainerBorder },
              '& .MuiSvgIcon-root': { color: COLORS.textMuted },
            }}
          >
            <MenuItem value="">All types</MenuItem>
            {STIX_TYPE_KEYS.map(t => (
              <MenuItem key={t} value={t} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : currentError ? (
        <ErrorDisplay message={currentError} />
      ) : (
        <>
          <Typography variant="caption" sx={{ color: COLORS.textMuted, mb: 1, display: 'block', fontFamily: 'monospace' }}>
            {visible.length} object{visible.length !== 1 ? 's' : ''}
          </Typography>
          <TableContainer component={Paper} sx={{
            backgroundColor: COLORS.headerBackground,
            border: `1px solid ${COLORS.dataContainerBorder}`,
            borderRadius: 2,
          }}>
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: `1px solid ${COLORS.dataContainerBorder}` } }}>
              <TableHead>
                <TableRow>
                  {['Type', 'Name', 'ID', 'Ingested'].map(h => (
                    <TableCell key={h} sx={{ color: COLORS.textQuaternary, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map(obj => (
                  <TableRow
                    key={obj.stix_id}
                    onClick={() => navigate('/stix/' + encodeURIComponent(obj.stix_id))}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: COLORS.cardBackground, boxShadow: `0 4px 20px ${COLORS.hoverBoxShadow}` } }}
                  >
                    <TableCell sx={{ color: COLORS.textSecondary, fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
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

    </Box>
  );
}

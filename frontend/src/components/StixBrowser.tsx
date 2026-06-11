import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, FormControl,
  InputAdornment, InputLabel, MenuItem, Pagination, Paper, Select,
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
 * Search (server-side): driven by the ?search= URL search param. User must
 * click the search button or press Enter to trigger a search. Search filters
 * by STIX ID or name on the backend.
 *
 * Pagination: Page numbers controlled by ?page= URL param. Shows PAGE_SIZE
 * results per page with total count from X-Total-Count header.
 *
 * Detail view: clicking a row navigates to /stix/{id}, which renders the
 * routed STIX detail page.
 */
export default function StixBrowser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Derive filters directly from URL search params
  const typeFilter = searchParams.get('type') ?? '';
  const searchQuery = searchParams.get('search') ?? '';
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10);

  const [objects, setObjects] = useState<StixObject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string>('');
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);

  // Sync search input when URL searchQuery changes (React's getDerivedStateFromProps pattern)
  if (searchQuery !== prevSearchQuery) {
    setSearchInput(searchQuery);
    setPrevSearchQuery(searchQuery);
  }

  // loading is true whenever URL params have changed but the fetch hasn't settled yet
  const currentKey = `${typeFilter}|${searchQuery}|${currentPage}`;
  const loading = fetchedFor !== currentKey;
  // suppress stale errors from a previous filter while a new fetch is in flight
  const currentError = fetchedFor === currentKey ? error : null;

  // Fetch when URL params change; AbortController prevents stale responses
  const PAGE_SIZE = 50;
  useEffect(() => {
    const controller = new AbortController();
    const offset = (currentPage - 1) * PAGE_SIZE;
    const key = `${typeFilter}|${searchQuery}|${currentPage}`;

    api.stixWithCount(
      typeFilter || undefined,
      searchQuery || undefined,
      PAGE_SIZE,
      offset,
      controller.signal
    )
      .then(response => {
        if (!controller.signal.aborted) {
          setObjects(response.data);
          setTotalCount(response.totalCount);
          setError(null);
          setFetchedFor(key);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) {
          setError(String(e));
          setFetchedFor(key);
        }
      });
    return () => controller.abort();
  }, [typeFilter, searchQuery, currentPage]);

  // Handle search form submission
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (searchInput.trim()) params.set('search', searchInput.trim());
    params.set('page', '1'); // Reset to first page on new search
    navigate('/stix?' + params.toString());
  };

  // Handle pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const handlePageChange = (_: unknown, page: number) => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', String(page));
    navigate('/stix?' + params.toString());
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 200 }}>
          <TextField
            size="small"
            placeholder="Search by name or ID..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography sx={{ color: COLORS.textMuted, fontSize: '0.9rem', lineHeight: 1 }}>⌕</Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              '& input': { color: COLORS.textPrimary },
              '& .MuiOutlinedInput-root fieldset': { borderColor: COLORS.dataContainerBorder },
              '& .MuiOutlinedInput-root:hover fieldset': { borderColor: COLORS.dataContainerBorderHover },
            }}
          />
          <Button
            type="submit"
            variant="outlined"
            size="small"
            sx={{
              color: COLORS.textPrimary,
              borderColor: COLORS.dataContainerBorder,
              '&:hover': { borderColor: COLORS.dataContainerBorderHover, bgcolor: COLORS.cardBackground },
            }}
          >
            Search
          </Button>
        </Box>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: COLORS.textMuted }}>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={e => {
              const params = new URLSearchParams();
              if (e.target.value) params.set('type', e.target.value);
              if (searchQuery) params.set('search', searchQuery);
              params.set('page', '1'); // Reset to first page on filter change
              navigate('/stix?' + params.toString());
            }}
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
            {totalCount.toLocaleString()} object{totalCount !== 1 ? 's' : ''}
            {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
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
                {objects.map(obj => (
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
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: COLORS.textPrimary,
                    borderColor: COLORS.dataContainerBorder,
                  },
                  '& .Mui-selected': {
                    bgcolor: COLORS.cardBackground,
                    borderColor: COLORS.dataContainerBorderHover,
                  },
                }}
              />
            </Box>
          )}
        </>
      )}

    </Box>
  );
}

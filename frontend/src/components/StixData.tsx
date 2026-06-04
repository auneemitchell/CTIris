import { useState, useEffect } from 'react';
import { Box, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { COLORS } from '../constants/themeColors';
import type { StixObject } from '../api/client';

type StixRow = {
    stix_id: string;
    type: string;
    name: string;
    description: string;
    created: string;
}

export default function StixData() {
    const [rows, setRows] = useState<StixRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('http://localhost/api/stix').then(res => {
            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            return res.json();
        }).then(data => {
            const mapped = (data as StixObject[]).map((obj) => ({
                stix_id: obj.stix_id,
                type: obj.type,
                name: (obj.properties.name as string | undefined) ?? '-',
                description: (obj.properties.description as string | undefined) ?? '-',
                created: obj.stix_created ?? obj.ingested_at,
            }));
            setRows(mapped);
        }).catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box>
                <CircularProgress size={24} sx={{ color: 'rgba(0,255,255,0.5)' }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ color: 'rgba(255,80,80,0.8)', py: 2 }}>
                <Typography sx={{ fontSize: '16px' }}> Failed to load: {error} </Typography>
            </Box>
        )
    }


    return (
        <TableContainer sx={{ backgroundColor: COLORS.headerBackground, border: '2px solid rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <Table sx={{
                minWidth: 650, backgroundColor: 'transparent',
                '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.08)' },
            }} size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ color: COLORS.textTertiary, fontSize: '12px', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>Type</TableCell>
                        <TableCell sx={{ color: COLORS.textTertiary, fontSize: '12px',fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>Name</TableCell>
                        <TableCell sx={{ color: COLORS.textTertiary, fontSize: '12px',fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>Description</TableCell>
                        <TableCell sx={{ color: COLORS.textTertiary, fontSize: '12px',fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>Created</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell sx={{ color: COLORS.textPrimary }}>
                                No objects ingested yet!
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.slice(0,10).map((r) => (
                            <TableRow key={r.stix_id} sx={{ '&:hover': { backgroundColor: 'rgba(0, 255, 255, 0.05)', cursor: 'pointer' } }}>
                                <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px' }}>{r.type}</TableCell>
                                <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px' }}>{r.name}</TableCell>
                                <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'all 0.2s ease',
                                '&:hover': {
                                    whiteSpace: 'normal',
                                    overflow: 'visible',
                                    backgroundColor: 'rgba(0,255,255,0.05)',
                                    }, }}>{r.description}</TableCell>
                                <TableCell sx={{ color: COLORS.textPrimary, fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(r.created).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
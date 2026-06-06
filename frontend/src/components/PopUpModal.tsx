import { useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { api, type StixObject } from '../api/client';
import { COLORS } from '../constants/themeColors';
import ErrorDisplay from './ErrorDisplay';
import StixDescription from './StixDescription';

interface Props {
    stixId: string | null;
    onClose: () => void;
}

interface StixProperties {
    name?: string;
    description?: string;
    aliases?: string[];
    first_seen?: string;
    last_seen?: string;
}

export default function PopUpModal({ stixId, onClose }: Props) {
    const [stix, setStix] = useState<StixObject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!stixId) return;

        const controller = new AbortController();

        api.stixById(stixId, controller.signal)
            .then(setStix)
            .catch(e => {
                if (e.name === 'AbortError') return;
                setError(String(e));
            })
            .finally(() => setLoading(false));

        return () => controller.abort();

    }, [stixId]);


    const props = (stix?.properties || {}) as StixProperties;
    const displayName = props.name || stix?.stix_id || 'Unnamed Threat Intel Profile';
    const description = props.description || 'No deep analytical description found inside this payload document.';
    const aliases = Array.isArray(props.aliases) ? props.aliases : [];

    return (
        <Dialog
            open={!!stixId}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: COLORS.headerBackground ?? '#1e1e24',
                    color: COLORS.textPrimary ?? '#fff',
                    borderRadius: 2,
                    border: `1px solid ${COLORS.dataContainerBorder ?? "rgba(255,255,255,0.07)"}`,
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.textMuted, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    Threat Intel Profile
                </Typography>
                <IconButton onClick={onClose} sx={{ color: COLORS.textMuted }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: COLORS.dataContainerBorder }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress sx={{ color: COLORS.textQuaternary }} />
                    </Box>
                )}

                {error && <ErrorDisplay message={error} />}

                {!loading && !error && stix && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                        {/* Title Block using properties.name */}
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                                {displayName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                    label={stix.type}
                                    size="small"
                                    sx={{ bgcolor: COLORS.textQuaternary, color: COLORS.textPrimary, fontSize: '0.75rem', fontWeight: 'bold' }}
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ borderColor: COLORS.dataContainerBorder }} />

                        {/* Aliases mapping array safely from nested JSON */}
                        {aliases.length > 0 && (
                            <Box>
                                <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 0.5 }}>
                                    TRACKED ALIASES
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {aliases.map((alias) => (
                                        <Chip key={alias} label={alias} size="small" variant="outlined" sx={{ color: COLORS.textPrimary, borderColor: COLORS.dataContainerBorderHover }} />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Description using properties.description */}
                        <Box>
                            <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block', mb: 0.5 }}>
                                DESCRIPTION / BEHAVIORAL OVERVIEW
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'COLORS.textPrimary',
                                    lineHeight: 1.6,
                                    bgcolor: COLORS.modalBackground,
                                    p: 1.5,
                                    borderRadius: 1,
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                <StixDescription text={description} />
                            </Typography>
                        </Box>

                        {/* Timing columns based on table values */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, bgcolor: COLORS.modalSecondaryBackground, p: 1.5, borderRadius: 1 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>{stix.type === 'campaign' ? 'First Seen' : 'First Observed'}</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {stix.type === 'campaign'
                                        ? (props.first_seen
                                            ? new Date(props.first_seen).toLocaleDateString('sv-SE')
                                            : 'Unknown')
                                        : (stix.stix_created
                                            ? new Date(stix.stix_created).toLocaleDateString('sv-SE')
                                            : 'Unknown')}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>{stix.type === 'campaign' ? 'Last Seen' : 'Last Updated'}</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {stix.type === 'campaign'
                                        ? (props.last_seen
                                            ? new Date(props.last_seen).toLocaleDateString('sv-SE')
                                            : 'Unknown')
                                        : (stix.stix_modified
                                            ? new Date(stix.stix_modified).toLocaleDateString('sv-SE')
                                            : 'Unknown')}
                                </Typography>
                            </Box>
                        </Box>

                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

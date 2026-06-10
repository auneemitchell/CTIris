import { Avatar, Box, IconButton, Typography } from "@mui/material";
import { COLORS } from "../constants/themeColors";
import { GitHub } from '@mui/icons-material';
import HeaderIcon from '../assets/CTIris-Icon.png';
import { useNavigate } from 'react-router-dom';

export default function DashboardFooter() {
    const navigate = useNavigate();

    return (
        <Box component="footer" sx={{ display: 'flex', flexDirection: 'column', p: { xs: 4, md: 12 }, borderTop: `1px solid ${COLORS.borderFooter}`, backgroundColor: COLORS.backgroundFooter }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flexWrap: 'wrap', marginBottom: 4, justifyContent: 'space-between', gap: { xs: 4, md: 0 } }}>
                <Box sx={{ display: 'flex', flex: 1, flexDirection: 'row', p: 4, backgroundColor: COLORS.headerBackground }}>
                    <Avatar
                        src={HeaderIcon}
                        variant='square'
                        sx={{ width: 120, height: 100, '& img': { objectFit: 'contain' } }}
                    />
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: '500', color: COLORS.textPrimary }}>CTIRIS</Typography>
                        <Typography variant="caption" sx={{ color: COLORS.textPrimary, fontWeight: '400' }}>Developed by </Typography>
                        <Typography variant="caption" sx={{ color: COLORS.textMuted }}> Aune Mitchell, Jovy Ann Nelson, Kayla Rieck, Sandra Gran </Typography>
                    </Box>
                </Box>
                <Box sx={{ px: {xs: 1, md: 12}, width: { xs: '100%', md: '70%', justifyContent: 'center' } }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-start' }, gap: 1, flexShrink: 1}}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center', px: { xs: 2, md: 4 }, flex: 1 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> Quick Links </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => navigate('/')}> Dashboard </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => navigate('/feeds')}> Feeds </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => navigate('/stix')}> Stix Objects </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center', px: { xs: 2, md: 4 }, flex: 1 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> About</Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => window.open('https://github.com/auneemitchell/CTIris/blob/main/README.md')}> Project Overview </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center', px: { xs: 2, md: 4 }, flex: 1 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> Documentation </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => window.open('https://github.com/auneemitchell/CTIris/blob/main/db-svc/README.md')}> Database </Typography>

                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => window.open('https://github.com/auneemitchell/CTIris/blob/main/frontend/README.md')}> Frontend </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => window.open('https://github.com/auneemitchell/CTIris/blob/main/ingestion-svc/README.md')}> Ingestion Service </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => window.open('https://github.com/auneemitchell/CTIris/blob/main/query-svc/README.md')}> Query Service </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center', px: { xs: 2, md: 4 }, flex: 1 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> Contribute</Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1, cursor: 'pointer' }} onClick={() => window.open('https://github.com/auneemitchell/CTIris/issues')}> Report Issues </Typography>
                        </Box>

                    </Box>
                </Box>
            </Box>
            <Box sx={{ borderTop: `1px solid ${COLORS.iconFooter}`, textAlign: 'center', pt: 4 }}>
                <IconButton
                    href="https://github.com/auneemitchell/CTIris"
                    target="_blank"
                    sx={{
                        color: COLORS.iconFooter,
                        '&:hover': {
                            backgroundColor: COLORS.iconHoverFooter
                        },
                    }}
                >
                    <GitHub fontSize="large" />
                </IconButton>
            </Box>
            <Typography variant="caption" sx={{ textAlign: 'center', color: COLORS.textPrimary, fontFamily: 'monospace', p: 2 }}>
                CTIRIS © 2026 · ASJK · NSC Computer Science Capstone
            </Typography>
        </Box>

    );

}
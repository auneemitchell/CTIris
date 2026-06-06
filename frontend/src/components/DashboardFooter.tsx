import { Avatar, Box, IconButton, Typography } from "@mui/material";
import { COLORS } from "../constants/themeColors";
import { GitHub } from '@mui/icons-material';
import HeaderIcon from '../assets/CTIris-Icon.png';

export default function DashboardFooter() {

    return (
        <Box component="footer" sx={{ display: 'flex', flexDirection: 'column', p: 12, borderTop: `1px solid ${COLORS.borderFooter}`, backgroundColor: COLORS.backgroundFooter }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', marginBottom: 4 }}>
                <Box sx = {{ display: 'flex', flex: 1, flexDirection: 'row', p: 4, backgroundColor: COLORS.headerBackground }}>
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
                <Box sx ={{ width: '70%' }}>
                    <Box sx={{ display:'flex', flexDirection: 'row', alignItems: 'flex-start', px: 16 }}>
                        <Box sx={{ display:'flex', flexDirection: 'column', textAlign: 'center', px: 8 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> Quick Links </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Dashboard </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Feeds </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Stix Objects </Typography>
                        </Box>
                        <Box sx={{ display:'flex', flexDirection: 'column', textAlign: 'center', px: 8 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> About</Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> About Us </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Contact </Typography>
                        </Box>
                        <Box sx={{ display:'flex', flexDirection: 'column', textAlign: 'center', px: 8 }}>
                            <Typography variant="body1" sx={{ color: COLORS.textPrimary, p: 1, fontWeight: 'bold' }}> Legal </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Terms of Use </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Privacy Policy </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textPrimary, p: 1 }}> Disclaimer </Typography>
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
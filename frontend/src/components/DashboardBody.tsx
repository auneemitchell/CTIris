import { Box, Paper, Typography } from "@mui/material";
import { COLORS } from "../constants/themeColors";
import StixData from "./StixData";
import AttackTechniques from "./AttackTechniques";
import StatCard from "./StatCard";

export default function DashboardBody() {
    return (
        <Box sx={{ bgcolor: COLORS.backgroundContainer, minHeight: '100vh', p: 2, gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 1, py: 2 }}>
                <StatCard />
                <StatCard />
                <StatCard />
                <StatCard />
                <StatCard />
                <StatCard />
                <StatCard />
                <StatCard />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                <Box sx={{ bgcolor: COLORS.backgroundDefault, maxWidth: '50%', borderRadius: 4, p: 2, border: '2px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="h6" sx={{ color: COLORS.textColor, fontWeight: 'bold' }}>STIX DATA</Typography>
                    {/* CONTENT */}
                    <StixData />
                </Box>
                <Box sx={{ bgcolor: COLORS.backgroundDefault, maxWidth: '50%', borderRadius: 4, p: 2, border: '2px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="h6" sx={{ color: COLORS.textColor, fontWeight: 'bold' }}>ATTACK TECHNIQUES</Typography>
                    {/* CONTENT */}
                    < AttackTechniques />
                </Box>
            </Box>
        </Box>


    )

}

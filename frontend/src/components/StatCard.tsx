import { Card, CardContent, Typography } from '@mui/material';
import { COLORS } from '../constants/themeColors';


export default function StatCard() {

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'wrap',
        gap: 2,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(105deg, #402e68 0%, #7f5bce 100%)',
        color: COLORS.textPrimary,
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: 2,
        
      }}
    >
      <CardContent sx={{ width: '100%' }}>
        <Typography variant='h4'>8</Typography>
        <Typography variant="body2">
          Total Malware
        </Typography>
      </CardContent>
    </Card>
  );
}

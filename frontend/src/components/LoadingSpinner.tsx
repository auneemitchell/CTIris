import { Box, CircularProgress } from '@mui/material';
import { COLORS } from '../constants/themeColors';

/** Centered spinner used as the loading state across all data-fetching components. */
export default function LoadingSpinner() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress sx={{ color: COLORS.accentSecondary }} />
    </Box>
  );
}

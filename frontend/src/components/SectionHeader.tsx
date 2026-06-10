import { Box, Typography } from '@mui/material';
import { COLORS } from '../constants/themeColors';
import HelpBadge from './HelpBadge';

interface Props {
  title: string;
  tooltip: string;
  /** 'h6' for tab-level headings (default), 'h6' variant with smaller mb for widget headings. */
  gutterBottom?: boolean;
}

/**
 * Section heading with an educational ? tooltip badge.
 * Used by DashboardBody tab panels and DashboardTab widget headers
 * so the heading + badge style stays consistent across the app.
 */
export default function SectionHeader({ title, tooltip, gutterBottom = true }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: gutterBottom ? 3 : 2 }}>
      <Typography variant="h6" sx={{ color: COLORS.textSecondary, fontWeight: 'bold', minWidth: 0, wordBreak: 'break-word' }}>
        {title}
      </Typography>
      <HelpBadge tooltip={tooltip} />
    </Box>
  );
}

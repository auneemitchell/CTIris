import { Tooltip, Typography } from '@mui/material';
import type { TooltipProps } from '@mui/material';
import { COLORS } from '../constants/themeColors';

interface Props {
  /** Tooltip text shown on hover. */
  tooltip: string;
  /** 'md' = 18×18 (section headers), 'sm' = 15×15 (card badges). Defaults to 'md'. */
  size?: 'sm' | 'md';
  placement?: TooltipProps['placement'];
  /** Extra sx props forwarded to the Typography — use to override colors on dark backgrounds. */
  sx?: object;
}

/**
 * Circular ? badge that shows an educational tooltip on hover.
 * Used throughout the dashboard to define CTI terms for new users.
 */
export default function HelpBadge({ tooltip, size = 'md', placement = 'right', sx }: Props) {
  const dim = size === 'md' ? 18 : 15;
  const fontSize = size === 'md' ? '0.7rem' : '0.6rem';

  return (
    <Tooltip title={tooltip} placement={placement} arrow>
      <Typography sx={{
        color: COLORS.textMuted,
        fontSize,
        bgcolor: 'rgba(255,255,255,0.07)',
        borderRadius: '50%',
        width: dim,
        height: dim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        flexShrink: 0,
        fontFamily: 'monospace',
        userSelect: 'none',
        ...sx,
      }}>?</Typography>
    </Tooltip>
  );
}

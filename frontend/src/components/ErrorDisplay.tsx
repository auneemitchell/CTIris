import { Typography } from '@mui/material';

interface Props {
  message: string;
}

/** Standard error message used when an API fetch fails. */
export default function ErrorDisplay({ message }: Props) {
  return (
    <Typography variant="body2" sx={{ color: 'error.main', fontFamily: 'monospace' }}>
      Failed to load: {message}
    </Typography>
  );
}

import { Box, CircularProgress, Typography } from '@mui/material';

export function PageLoader() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 2 }}>
      <CircularProgress color="primary" size={40} />
      <Typography variant="body2" color="text.secondary">Загрузка...</Typography>
    </Box>
  );
}

export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return <CircularProgress size={size} color="primary" />;
}

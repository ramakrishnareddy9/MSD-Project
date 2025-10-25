import { CircularProgress, Box, Typography, Skeleton, Stack } from '@mui/material';

export const Loader = ({ size = 40, message, fullScreen = false }) => {
  if (fullScreen) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={size} />
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        gap: 2
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export const SkeletonLoader = ({ type = 'text', count = 1, height, width }) => {
  const skeletons = Array.from({ length: count });

  if (type === 'card') {
    return (
      <Stack spacing={2}>
        {skeletons.map((_, index) => (
          <Box key={index}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 1 }} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        ))}
      </Stack>
    );
  }

  if (type === 'list') {
    return (
      <Stack spacing={1}>
        {skeletons.map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {skeletons.map((_, index) => (
        <Skeleton key={index} variant="text" height={height} width={width} />
      ))}
    </Stack>
  );
};

export default Loader;

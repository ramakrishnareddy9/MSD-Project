import { Box, Typography, Skeleton, Card, CardContent } from '@mui/material';
import { FaLeaf } from 'react-icons/fa';

const LoadingSpinner = ({ size = 40, text = 'Loading...' }) => {
  return (
    <Box className="flex flex-col items-center justify-center p-8 space-y-4">
      {/* Animated Logo Spinner */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-ping opacity-75"></div>
        <div className="relative bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-full animate-bounce">
          <FaLeaf className="text-white text-3xl animate-pulse" />
        </div>
      </div>
      
      {/* Loading Text */}
      <div className="flex flex-col items-center gap-2">
        <Typography variant="body2" className="text-gray-600 font-medium">
          {text}
        </Typography>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </Box>
  );
};

export const SkeletonCard = () => (
  <Card>
    <CardContent>
      <Skeleton variant="text" width="75%" height={30} sx={{ mb: 2 }} />
      <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="66%" height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={40} />
    </CardContent>
  </Card>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <Card>
    <CardContent>
      <Skeleton variant="text" width="25%" height={32} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="text" width="25%" height={24} />
            <Skeleton variant="text" width="33%" height={24} />
            <Skeleton variant="text" width="25%" height={24} />
            <Skeleton variant="text" width="16%" height={24} />
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

export default LoadingSpinner;

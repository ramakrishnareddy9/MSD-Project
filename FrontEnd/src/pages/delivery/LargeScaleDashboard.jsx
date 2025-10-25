import { Box, Typography } from '@mui/material';
import DeliveryDashboard from '../dashboards/DeliveryDashboard';

const LargeScaleDashboard = () => {
  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h6" sx={{ px: 2, pt: 2 }}>Large-Scale Delivery</Typography>
      <DeliveryDashboard mode="large" />
    </Box>
  );
};

export default LargeScaleDashboard;

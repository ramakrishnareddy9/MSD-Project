import { Box, Typography } from '@mui/material';
import DeliveryDashboard from '../dashboards/DeliveryDashboard';

const SmallScaleDashboard = () => {
  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h6" sx={{ px: 2, pt: 2 }}>Small-Scale Delivery</Typography>
      <DeliveryDashboard mode="small" />
    </Box>
  );
};

export default SmallScaleDashboard;

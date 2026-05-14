import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const FarmerAnalyticsPanel = React.memo(({ metrics = {}, loading }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Analytics</Typography>
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Typography color="text.secondary">Loading analytics...</Typography>
          ) : (
            <Box>
              <Typography>Monthly Earnings: ₹{metrics.monthlyEarnings || 0}</Typography>
              <Typography>Active Sales: {metrics.activeSales || 0}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

export default FarmerAnalyticsPanel;

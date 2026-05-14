import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const FarmerCropsPanel = React.memo(({ crops = [], loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Crops</Typography>
          <Typography variant="body2" color="text.secondary">Loading crops...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Crops</Typography>
        <Box sx={{ mt: 2 }}>
          {crops.length === 0 ? (
            <Typography color="text.secondary">No active crops listed.</Typography>
          ) : (
            crops.slice(0, 6).map((c) => (
              <Box key={c._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography>{c.name}</Typography>
                <Typography color="text.secondary">₹{c.basePrice}</Typography>
              </Box>
            ))
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

export default FarmerCropsPanel;

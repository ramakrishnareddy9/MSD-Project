import React from 'react';
import { Card, CardContent, Typography, Box, Table, TableBody, TableRow, TableCell } from '@mui/material';

const FarmerOrdersPanel = React.memo(({ orders = [], loading }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">My Orders</Typography>
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Typography color="text.secondary">Loading orders...</Typography>
          ) : orders.length === 0 ? (
            <Typography color="text.secondary">No orders found.</Typography>
          ) : (
            <Table size="small">
              <TableBody>
                {orders.slice(0,6).map((o) => (
                  <TableRow key={o._id}>
                    <TableCell>#{o.orderNumber || o._id}</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell align="right">₹{o.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

export default FarmerOrdersPanel;

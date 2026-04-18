import { Box, Grid, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import OrderCard from '../../Components/orders/OrderCard';
import OrderTracker from '../../Components/orders/OrderTracker';
import { orderAPI } from '../../services/api';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await orderAPI.getOrders();
        setOrders(response || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Your Orders</Typography>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Your Orders</Typography>
      {orders.length === 0 ? (
        <Typography color="text.secondary">No orders found</Typography>
      ) : (
        <Grid container spacing={2}>
          {orders.map((order) => (
            <Grid key={order._id || order.id} item xs={12} md={6} lg={4}>
              <OrderCard order={order} />
              <Box sx={{ mt: 1 }}>
                <OrderTracker status={order.status} />
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default OrderHistory;

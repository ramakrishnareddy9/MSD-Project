import { Box, Grid, Typography } from '@mui/material';
import OrderCard from '../../Components/orders/OrderCard';
import OrderTracker from '../../Components/orders/OrderTracker';

const MOCK_ORDERS = [
  { id: 'o1', number: '1001', status: 'delivered', items: [{},{}], total: 420, date: Date.now() - 86400000 * 8 },
  { id: 'o2', number: '1002', status: 'out_for_delivery', items: [{}], total: 180, date: Date.now() - 86400000 * 1 },
  { id: 'o3', number: '1003', status: 'processing', items: [{},{},{}], total: 740, date: Date.now() - 86400000 * 3 }
];

const OrderHistory = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Your Orders</Typography>
      <Grid container spacing={2}>
        {MOCK_ORDERS.map((order) => (
          <Grid key={order.id} item xs={12} md={6} lg={4}>
            <OrderCard order={order} />
            <Box sx={{ mt: 1 }}>
              <OrderTracker status={order.status} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default OrderHistory;

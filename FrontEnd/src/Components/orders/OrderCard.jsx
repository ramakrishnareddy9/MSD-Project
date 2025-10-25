import { Card, CardContent, Typography, Stack, Divider } from '@mui/material';
import OrderStatus from './OrderStatus';

const OrderCard = ({ order }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">Order #{order.number}</Typography>
          <OrderStatus status={order.status} />
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {order.items.length} items • Total ₹{order.total}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Placed on {new Date(order.date).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OrderCard;

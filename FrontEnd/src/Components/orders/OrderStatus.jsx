import { Chip } from '@mui/material';

const colorMap = {
  pending: 'default',
  confirmed: 'info',
  processing: 'warning',
  out_for_delivery: 'secondary',
  delivered: 'success',
  cancelled: 'error'
};

const labelMap = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const OrderStatus = ({ status }) => (
  <Chip label={labelMap[status] || status} color={colorMap[status] || 'default'} size="small" />
);

export default OrderStatus;

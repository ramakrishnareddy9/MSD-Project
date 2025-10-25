import { Card, CardContent, Typography, Divider, Button } from '@mui/material';
import { useCart } from '../../contexts/CartContext';

const CartSummary = () => {
  const { cart } = useCart();
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const delivery = cart.length ? 30 : 0;
  const total = subtotal + delivery;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Order Summary</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography>Subtotal: ₹{subtotal.toFixed(2)}</Typography>
        <Typography>Delivery: ₹{delivery.toFixed(2)}</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="h6">Total: ₹{total.toFixed(2)}</Typography>
        <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={!cart.length}>
          Proceed to Checkout
        </Button>
      </CardContent>
    </Card>
  );
};

export default CartSummary;

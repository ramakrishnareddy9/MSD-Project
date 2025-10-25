import { Box, Grid, List, Typography } from '@mui/material';
import { useCart } from '../../contexts/CartContext';
import CartItem from '../../Components/cart/CartItem';
import CartSummary from '../../Components/cart/CartSummary';

const CartPage = () => {
  const { cart } = useCart();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Your Cart</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <List>
            {cart.length === 0 && (
              <Typography color="text.secondary">Your cart is empty.</Typography>
            )}
            {cart.map(item => <CartItem key={item.id} item={item} />)}
          </List>
        </Grid>
        <Grid item xs={12} md={4}>
          <CartSummary />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CartPage;

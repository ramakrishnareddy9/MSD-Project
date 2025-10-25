import { Box, TextField, Button, Typography } from '@mui/material';

const CheckoutForm = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Checkout (Demo)</Typography>
      <TextField label="Address" placeholder="123 Market St" fullWidth />
      <TextField label="City" placeholder="Mumbai" fullWidth />
      <TextField label="Postal Code" placeholder="400001" fullWidth />
      <Button variant="contained" color="primary">Pay on Delivery</Button>
    </Box>
  );
};

export default CheckoutForm;

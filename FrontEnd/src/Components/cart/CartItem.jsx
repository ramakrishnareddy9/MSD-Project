import { IconButton, ListItem, ListItemAvatar, Avatar, ListItemText, TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCart } from '../../contexts/CartContext';

const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <ListItem secondaryAction={
      <IconButton edge="end" aria-label="delete" onClick={() => removeFromCart(item.id)}>
        <DeleteIcon />
      </IconButton>
    }>
      <ListItemAvatar>
        <Avatar variant="rounded" src={item.image} alt={item.name} />
      </ListItemAvatar>
      <ListItemText primary={item.name} secondary={`₹${item.price} × ${item.quantity}`} />
      <TextField
        size="small"
        type="number"
        value={item.quantity}
        onChange={(e) => updateQuantity(item.id, Math.max(1, Number(e.target.value)))}
        inputProps={{ min: 1, style: { width: 64 } }}
      />
    </ListItem>
  );
};

export default CartItem;

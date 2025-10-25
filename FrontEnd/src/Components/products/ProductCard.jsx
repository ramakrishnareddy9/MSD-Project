import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Box,
  Stack,
  Rating,
  Avatar
} from '@mui/material';
import {
  ShoppingCart,
  Favorite,
  FavoriteBorder,
  Person,
  Verified
} from '@mui/icons-material';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import Button from '../common/Button';

const ProductCard = ({ 
  product, 
  onWishlistToggle, 
  isInWishlist = false,
  showAddToCart = true 
}) => {
  const { addToCart } = useCart();
  const { showSuccess } = useNotification();

  const discountedPrice = product.discount 
    ? product.price - (product.price * product.discount / 100)
    : product.price;

  const handleAddToCart = () => {
    addToCart(product);
    showSuccess(`${product.name} added to cart!`);
  };

  const handleWishlistToggle = (e) => {
    e.stopPropagation();
    if (onWishlistToggle) {
      onWishlistToggle(product);
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { 
          transform: 'translateY(-8px)', 
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)' 
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="220"
          image={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80'}
          alt={product.name}
          loading="lazy"
          sx={{ objectFit: 'cover' }}
        />
        
        {/* Discount Badge */}
        {product.discount > 0 && (
          <Chip 
            label={`${product.discount}% OFF`}
            color="error"
            size="small"
            sx={{ 
              position: 'absolute', 
              top: 12, 
              left: 12,
              fontWeight: 'bold',
              boxShadow: 2
            }}
          />
        )}

        {/* Verified Badge */}
        {product.verified !== false && (
          <Chip 
            icon={<Verified sx={{ fontSize: 16 }} />}
            label="Verified" 
            color="success" 
            size="small"
            sx={{ 
              position: 'absolute', 
              top: 12, 
              right: 52,
              fontWeight: 600
            }}
          />
        )}
        
        {/* Wishlist Button */}
        {onWishlistToggle && (
          <IconButton
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              '&:hover': { 
                bgcolor: 'rgba(255,255,255,1)',
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s'
            }}
            onClick={handleWishlistToggle}
          >
            {isInWishlist ? 
              <Favorite sx={{ color: 'error.main' }} /> : 
              <FavoriteBorder />
            }
          </IconButton>
        )}

        {/* Out of Stock Overlay */}
        {product.inStock === false && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(2px)'
            }}
          >
            <Chip 
              label="Out of Stock" 
              color="error" 
              sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            />
          </Box>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {product.name}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {product.description || 'Fresh and quality product'}
        </Typography>
        
        {product.rating && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <Rating value={product.rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">
              ({product.reviews || 0})
            </Typography>
          </Stack>
        )}
        
        {product.farmer && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.light' }}>
              <Person sx={{ fontSize: 14 }} />
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              {product.farmer}
            </Typography>
          </Stack>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Box sx={{ width: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Box>
              {product.discount > 0 ? (
                <>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                      display: 'block'
                    }}
                  >
                    ₹{product.price}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="baseline">
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      ₹{discountedPrice.toFixed(0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      /{product.unit || 'kg'}
                    </Typography>
                  </Stack>
                </>
              ) : (
                <Stack direction="row" spacing={0.5} alignItems="baseline">
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    ₹{product.price}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    /{product.unit || 'kg'}
                  </Typography>
                </Stack>
              )}
            </Box>
            {showAddToCart && (
              <Button
                variant="contained"
                disabled={product.inStock === false}
                onClick={handleAddToCart}
                startIcon={<ShoppingCart />}
                size="small"
                sx={{ px: 2 }}
              >
                Add
              </Button>
            )}
          </Stack>
        </Box>
      </CardActions>
    </Card>
  );
};

export default ProductCard;

import { useEffect, useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, CardMedia, CardActions,
  Typography, Button, IconButton, Chip, TextField, MenuItem,
  Badge, Avatar, Divider, Paper, InputAdornment, AppBar, Toolbar,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Stack, Rating, Snackbar, Alert, Breadcrumbs, Link, TableContainer, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Favorite, FavoriteBorder, Person,
  Add, Remove, Delete, LocalShipping, Menu as MenuIcon, Store,
  AccountCircle, LocalOffer, Verified, Close,
  CheckCircle, ArrowForward, Search, TrendingUp, Home, Groups, PersonAdd, Send,
  ThumbUp, ThumbDown, AdminPanelSettings, CardGiftcard
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import ProfileDropdown from '../../Components/ProfileDropdown';

const sampleProducts = [
  { 
    id: 1, 
    name: 'Organic Wheat', 
    price: 50, 
    unit: '1kg',
    category: 'Grains',
    farmer: 'Ramesh Patel',
    rating: 4.5,
    reviews: 128,
    image: 'https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 10,
    description: 'Premium organic wheat from local farms'
  },
  { 
    id: 2, 
    name: 'Basmati Rice', 
    price: 60, 
    unit: '1kg',
    category: 'Grains',
    farmer: 'Meera Sharma',
    rating: 4.8,
    reviews: 95,
    image: 'https://images.unsplash.com/photo-1604908175330-c6471e2b99f6?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 0,
    description: 'Aromatic basmati rice, aged to perfection'
  },
  { 
    id: 3, 
    name: 'Fresh Tomatoes', 
    price: 35, 
    unit: '1kg',
    category: 'Vegetables',
    farmer: 'Suresh Kumar',
    rating: 4.2,
    reviews: 203,
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 15,
    description: 'Juicy, vine-ripened tomatoes'
  },
  { 
    id: 4, 
    name: 'Organic Carrots', 
    price: 45, 
    unit: '1kg',
    category: 'Vegetables',
    farmer: 'Priya Devi',
    rating: 4.6,
    reviews: 87,
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 0,
    description: 'Sweet, crunchy organic carrots'
  },
  { 
    id: 5, 
    name: 'Farm Fresh Milk', 
    price: 65, 
    unit: '1L',
    category: 'Dairy',
    farmer: 'Gopal Singh',
    rating: 4.7,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 5,
    description: 'Pure, fresh milk from grass-fed cows'
  },
  { 
    id: 6, 
    name: 'Seasonal Mangoes', 
    price: 150, 
    unit: '1kg',
    category: 'Fruits',
    farmer: 'Rajesh Patel',
    rating: 4.9,
    reviews: 234,
    image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800&h=600&fit=crop&q=80',
    inStock: false,
    discount: 0,
    description: 'Sweet, juicy seasonal mangoes'
  },
  { 
    id: 7, 
    name: 'Fresh Spinach', 
    price: 30, 
    unit: '500g',
    category: 'Vegetables',
    farmer: 'Lakshmi Devi',
    rating: 4.4,
    reviews: 67,
    image: 'https://images.unsplash.com/photo-1542444459-db63c3d15501?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 20,
    description: 'Fresh organic spinach leaves'
  },
  { 
    id: 8, 
    name: 'Honey (Pure)', 
    price: 280, 
    unit: '500g',
    category: 'Organic',
    farmer: 'Ravi Kumar',
    rating: 4.9,
    reviews: 189,
    image: 'https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=800&h=600&fit=crop&q=80',
    inStock: true,
    discount: 0,
    description: 'Pure natural honey from local beekeepers'
  }
];

const LS_CART_KEY = 'farmkart_customer_cart';
const LS_WISHLIST_KEY = 'farmkart_customer_wishlist';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [activeSection, setActiveSection] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [orderHistory] = useState([
    { id: 1, date: '2024-01-15', total: 245, status: 'Delivered', items: 3 },
    { id: 2, date: '2024-01-10', total: 180, status: 'Delivered', items: 2 },
    { id: 3, date: '2024-01-05', total: 320, status: 'In Transit', items: 5 }
  ]);
  
  // Community State
  const [myCommunities, setMyCommunities] = useState([
    { id: 1, name: 'Green Valley Residents', members: 45, admin: 'John Doe', isAdmin: true, discount: 15, joinedDate: '2024-01-01' },
    { id: 2, name: 'Organic Food Lovers', members: 120, admin: 'Jane Smith', isAdmin: false, discount: 10, joinedDate: '2024-01-10' }
  ]);
  
  const [availableCommunities, setAvailableCommunities] = useState([
    { id: 3, name: 'Healthy Living Community', members: 78, admin: 'Mike Johnson', discount: 12, description: 'Join us for bulk organic orders' },
    { id: 4, name: 'Farm Fresh Buyers', members: 95, admin: 'Sarah Williams', discount: 18, description: 'Direct from farm, best prices' },
    { id: 5, name: 'Eco Warriors', members: 62, admin: 'David Brown', discount: 10, description: 'Sustainable and organic produce only' }
  ]);
  
  const [communityOrders, setCommunityOrders] = useState([
    { id: 1, communityId: 1, communityName: 'Green Valley Residents', product: 'Organic Wheat', quantity: '100 kg', totalMembers: 10, status: 'Pending', discount: 15, pricePerKg: 50, createdBy: 'John Doe', createdDate: '2024-01-20' }
  ]);
  
  const [pendingRequests, setPendingRequests] = useState([
    { id: 1, communityId: 1, communityName: 'Green Valley Residents', member: 'Alice Cooper', product: 'Basmati Rice', quantity: '50 kg', requestDate: '2024-01-21', status: 'Pending' },
    { id: 2, communityId: 1, communityName: 'Green Valley Residents', member: 'Bob Martin', product: 'Fresh Tomatoes', quantity: '30 kg', requestDate: '2024-01-21', status: 'Pending' }
  ]);
  
  const [createCommunityForm, setCreateCommunityForm] = useState({
    name: '',
    description: ''
  });
  
  const [communityOrderForm, setCommunityOrderForm] = useState({
    communityId: '',
    product: '',
    quantity: ''
  });

  const categories = ['All', ...new Set(sampleProducts.map(p => p.category))];

  useEffect(() => {
    const savedCart = localStorage.getItem(LS_CART_KEY);
    const savedWishlist = localStorage.getItem(LS_WISHLIST_KEY);
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      const enriched = parsed.map((it) => {
        const prod = sampleProducts.find((p) => p.id === it.id);
        return prod ? { ...it, image: prod.image } : it;
      });
      setCart(enriched);
    }
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      const discountedPrice = product.discount 
        ? product.price - (product.price * product.discount / 100)
        : product.price;
      
      if (existing) {
        showSnackbar(`Increased quantity of ${product.name}`, 'info');
        return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      }
      showSnackbar(`${product.name} added to cart!`, 'success');
      return [...prev, { ...product, finalPrice: discountedPrice, qty: 1 }];
    });
  };

  const updateCartQuantity = (id, newQty) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p)));
  };

  const removeFromCart = (id) => {
    const item = cart.find(p => p.id === id);
    setCart((prev) => prev.filter((p) => p.id !== id));
    showSnackbar(`${item?.name} removed from cart`, 'info');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    showSnackbar(`Order placed successfully! Total: ₹${total.toFixed(0)}`, 'success');
    setCart([]);
    setActiveSection('orders');
  };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        showSnackbar(`${product.name} removed from wishlist`, 'info');
        return prev.filter((p) => p.id !== product.id);
      }
      showSnackbar(`${product.name} added to wishlist!`, 'success');
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => wishlist.some((p) => p.id === productId);

  const filteredProducts = sampleProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const total = cart.reduce((sum, p) => sum + (p.finalPrice || p.price) * p.qty, 0);
  const totalItems = cart.reduce((sum, p) => sum + p.qty, 0);
  const savings = cart.reduce((sum, p) => sum + (p.discount || 0) * p.qty * p.price / 100, 0);

  const menuItems = [
    { id: 'browse', label: 'Browse Products', icon: <Store /> },
    { id: 'cart', label: 'My Cart', icon: <ShoppingCart />, badge: cart.length },
    { id: 'communities', label: 'My Communities', icon: <Groups />, badge: myCommunities.length },
    { id: 'join-community', label: 'Join Community', icon: <PersonAdd />, badge: availableCommunities.length },
    { id: 'wishlist', label: 'Wishlist', icon: <Favorite />, badge: wishlist.length },
    { id: 'orders', label: 'My Orders', icon: <LocalShipping /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 2 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const ProductCard = ({ product }) => {
    const discountedPrice = product.discount 
      ? product.price - (product.price * product.discount / 100)
      : product.price;

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
            image={product.image}
            alt={product.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80'; }}
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
          
          {/* Wishlist Button */}
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
            onClick={() => toggleWishlist(product)}
          >
            {isInWishlist(product.id) ? 
              <Favorite sx={{ color: 'error.main' }} /> : 
              <FavoriteBorder />
            }
          </IconButton>

          {/* Out of Stock Overlay */}
          {!product.inStock && (
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
            {product.description}
          </Typography>
          
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <Rating value={product.rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">
              ({product.reviews})
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.light' }}>
              <Person sx={{ fontSize: 14 }} />
            </Avatar>
            <Typography variant="caption" color="text.secondary">
              {product.farmer}
            </Typography>
          </Stack>
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
                        /{product.unit}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="baseline">
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      ₹{product.price}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      /{product.unit}
                    </Typography>
                  </Stack>
                )}
              </Box>
              <Button
                variant="contained"
                disabled={!product.inStock}
                onClick={() => addToCart(product)}
                startIcon={<ShoppingCart />}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3
                }}
              >
                Add
              </Button>
            </Stack>
          </Box>
        </CardActions>
      </Card>
    );
  };

  const createCommunity = (e) => {
    e.preventDefault();
    if (!createCommunityForm.name || !createCommunityForm.description) {
      showSnackbar('Please fill all fields', 'error');
      return;
    }
    const newCommunity = {
      id: Date.now(),
      name: createCommunityForm.name,
      members: 1,
      admin: user?.name || 'You',
      isAdmin: true,
      discount: 15,
      joinedDate: new Date().toISOString().split('T')[0],
      description: createCommunityForm.description
    };
    setMyCommunities([...myCommunities, newCommunity]);
    setCreateCommunityForm({ name: '', description: '' });
    showSnackbar('Community created successfully! You are the admin.', 'success');
    // Promote current user to community admin so they can open community dashboard
    updateUser?.({ isCommunityAdmin: true });
  };

  const joinCommunity = (community) => {
    const joined = {
      ...community,
      isAdmin: false,
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setMyCommunities([...myCommunities, joined]);
    setAvailableCommunities(availableCommunities.filter(c => c.id !== community.id));
    showSnackbar(`Joined ${community.name}! Enjoy ${community.discount}% discount on group orders.`, 'success');
  };

  const sendCommunityOrder = (e) => {
    e.preventDefault();
    if (!communityOrderForm.communityId || !communityOrderForm.product || !communityOrderForm.quantity) {
      showSnackbar('Please fill all fields', 'error');
      return;
    }
    const community = myCommunities.find(c => c.id === parseInt(communityOrderForm.communityId));
    const newOrder = {
      id: Date.now(),
      communityId: community.id,
      communityName: community.name,
      product: communityOrderForm.product,
      quantity: communityOrderForm.quantity,
      status: community.isAdmin ? 'Approved' : 'Pending',
      createdBy: user?.name || 'You',
      createdDate: new Date().toISOString().split('T')[0],
      discount: community.discount
    };

    if (community.isAdmin) {
      setCommunityOrders([...communityOrders, newOrder]);
      showSnackbar('Order created and approved! Members can now join.', 'success');
    } else {
      setPendingRequests([...pendingRequests, { ...newOrder, member: user?.name || 'You', requestDate: new Date().toISOString().split('T')[0] }]);
      showSnackbar('Order request sent to community admin for approval.', 'info');
    }
    setCommunityOrderForm({ communityId: '', product: '', quantity: '' });
  };

  const approveRequest = (requestId) => {
    const request = pendingRequests.find(r => r.id === requestId);
    setCommunityOrders([...communityOrders, { ...request, status: 'Approved' }]);
    setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
    showSnackbar('Request approved! Order added to community orders.', 'success');
  };

  const rejectRequest = (requestId) => {
    setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
    showSnackbar('Request rejected.', 'info');
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 280, boxSizing: 'border-box' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Store color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">
              FarmKart
            </Typography>
          </Stack>
          <List>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeSection === item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setDrawerOpen(false);
                }}
                sx={{ 
                  borderRadius: 2, 
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' }
                  }
                }}
              >
                <ListItemIcon>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Desktop Sidebar */}
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ position: 'sticky', top: 0, p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Store color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              FarmKart
            </Typography>
          </Stack>
          
          <List>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                sx={{ 
                  borderRadius: 2, 
                  mb: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' }
                  }
                }}
              >
                <ListItemIcon>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Stats Card */}
          <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Your Stats
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Total Orders</Typography>
                <Typography variant="body2" fontWeight="bold">24</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Loyalty Points</Typography>
                <Chip label="156" size="small" color="success" />
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar 
          position="sticky" 
          color="inherit" 
          elevation={1}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Breadcrumbs separator="›" sx={{ fontSize: '0.75rem' }}>
                <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Home sx={{ mr: 0.5, fontSize: 16 }} />
                  Home
                </Link>
                <Typography color="text.primary" sx={{ fontSize: '0.75rem' }}>
                  {menuItems.find(m => m.id === activeSection)?.label}
                </Typography>
              </Breadcrumbs>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton 
                color="primary"
                onClick={() => setActiveSection('cart')}
              >
                <Badge badgeContent={totalItems} color="error">
                  <ShoppingCart />
                </Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Browse Products */}
            {activeSection === 'browse' && (
              <Box>
                {/* Search and Filter Bar */}
                <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        placeholder="Search for fresh produce, grains, dairy..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: searchTerm && (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setSearchTerm('')}>
                                <Close fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        sx={{ bgcolor: 'background.default' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        fullWidth
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        sx={{ bgcolor: 'background.default' }}
                      >
                        {categories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Chip 
                          icon={<TrendingUp />}
                          label="Trending" 
                          clickable 
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          icon={<LocalOffer />}
                          label="Offers" 
                          clickable 
                          color="error"
                          variant="outlined"
                        />
                      </Stack>
                    </Grid>
                  </Grid>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {filteredProducts.length} products found
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip 
                        icon={<CheckCircle sx={{ fontSize: 16 }} />}
                        label="Free Delivery" 
                        size="small" 
                        color="success"
                      />
                      <Chip 
                        icon={<Verified sx={{ fontSize: 16 }} />}
                        label="Quality Assured" 
                        size="small" 
                        color="info"
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* Products Grid */}
                <Grid container spacing={3}>
                  {filteredProducts.map((product) => (
                    <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
                      <ProductCard product={product} />
                    </Grid>
                  ))}
                </Grid>

                {filteredProducts.length === 0 && (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No products found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try adjusting your search or filter criteria
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Shopping Cart */}
            {activeSection === 'cart' && (
              <Box>
                {cart.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Your cart is empty
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      Add some fresh produce to get started!
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={() => setActiveSection('browse')}
                      startIcon={<Store />}
                    >
                      Start Shopping
                    </Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    <Grid item xs={12} lg={8}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          Shopping Cart ({totalItems} items)
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        
                        {cart.map((item) => (
                          <Card key={item.id} sx={{ mb: 2, bgcolor: 'background.default' }}>
                            <CardContent>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={item.image}
                                    alt={item.name}
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80'; }}
                                    sx={{ borderRadius: 2, objectFit: 'cover', width: '100%' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="h6" fontWeight="600">
                                    {item.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    ₹{item.finalPrice || item.price}/{item.unit}
                                    {item.discount > 0 && (
                                      <Chip label={`${item.discount}% OFF`} size="small" color="error" sx={{ ml: 1 }} />
                                    )}
                                  </Typography>
                                  <Chip 
                                    label={`by ${item.farmer}`}
                                    size="small"
                                    sx={{ mt: 1 }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                    <IconButton 
                                      size="small"
                                      onClick={() => updateCartQuantity(item.id, item.qty - 1)}
                                      sx={{ 
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'error.lighter' }
                                      }}
                                    >
                                      <Remove fontSize="small" />
                                    </IconButton>
                                    <Typography 
                                      sx={{ 
                                        minWidth: 50, 
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem'
                                      }}
                                    >
                                      {item.qty}
                                    </Typography>
                                    <IconButton 
                                      size="small"
                                      onClick={() => updateCartQuantity(item.id, item.qty + 1)}
                                      sx={{ 
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'success.lighter' }
                                      }}
                                    >
                                      <Add fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                  <Stack spacing={1} alignItems="flex-end">
                                    <Typography variant="h6" color="primary" fontWeight="bold">
                                      ₹{((item.finalPrice || item.price) * item.qty).toFixed(0)}
                                    </Typography>
                                    <IconButton 
                                      size="small"
                                      color="error"
                                      onClick={() => removeFromCart(item.id)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}
                      </Paper>
                    </Grid>

                    <Grid item xs={12} lg={4}>
                      <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Order Summary
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">Subtotal ({totalItems} items)</Typography>
                            <Typography variant="body2" fontWeight="600">₹{total.toFixed(0)}</Typography>
                          </Stack>
                          
                          {savings > 0 && (
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="success.main">Discount Savings</Typography>
                              <Typography variant="body2" color="success.main" fontWeight="600">
                                -₹{savings.toFixed(0)}
                              </Typography>
                            </Stack>
                          )}
                          
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">Delivery Fee</Typography>
                            <Chip label="FREE" size="small" color="success" />
                          </Stack>
                          
                          <Divider />
                          
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="h6" fontWeight="bold">Total</Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              ₹{total.toFixed(0)}
                            </Typography>
                          </Stack>

                          {savings > 0 && (
                            <Alert severity="success" icon={<LocalOffer />}>
                              You're saving ₹{savings.toFixed(0)} with discounts!
                            </Alert>
                          )}
                          
                          <Button 
                            variant="contained" 
                            size="large"
                            fullWidth
                            startIcon={<LocalShipping />}
                            sx={{ mt: 2, py: 1.5 }}
                            onClick={handleCheckout}
                          >
                            Proceed to Checkout
                          </Button>

                          <Button 
                            variant="outlined"
                            fullWidth
                            onClick={() => setActiveSection('browse')}
                          >
                            Continue Shopping
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}

            {/* Wishlist */}
            {activeSection === 'wishlist' && (
              <Box>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    My Wishlist ({wishlist.length} items)
                  </Typography>
                </Paper>
                
                {wishlist.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Favorite sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Your wishlist is empty
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                      Save your favorite products for later!
                    </Typography>
                    <Button 
                      variant="contained"
                      size="large"
                      onClick={() => setActiveSection('browse')}
                    >
                      Browse Products
                    </Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {wishlist.map((product) => (
                      <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
                        <ProductCard product={product} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* My Communities */}
            {activeSection === 'communities' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  My Communities
                </Typography>
                
                {/* Create Community */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.lighter' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    <Groups sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Create New Community
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box component="form" onSubmit={createCommunity}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Community Name"
                          value={createCommunityForm.name}
                          onChange={(e) => setCreateCommunityForm({ ...createCommunityForm, name: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Description"
                          value={createCommunityForm.description}
                          onChange={(e) => setCreateCommunityForm({ ...createCommunityForm, description: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button type="submit" variant="contained" fullWidth sx={{ height: 56 }}>
                          Create
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
                
                {/* Community List */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {myCommunities.map((community) => (
                    <Grid item xs={12} md={6} key={community.id}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                              <Box>
                                <Typography variant="h6" fontWeight="bold">
                                  {community.name}
                                </Typography>
                                {community.isAdmin && (
                                  <Chip 
                                    icon={<AdminPanelSettings />} 
                                    label="Admin" 
                                    color="error" 
                                    size="small" 
                                    sx={{ mt: 1 }}
                                  />
                                )}
                              </Box>
                              <Chip 
                                icon={<CardGiftcard />}
                                label={`${community.discount}% OFF`} 
                                color="success" 
                              />
                            </Stack>
                            
                            <Divider />
                            
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Members</Typography>
                                <Typography variant="body2" fontWeight="bold">{community.members}</Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Admin</Typography>
                                <Typography variant="body2" fontWeight="600">{community.admin}</Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Joined</Typography>
                                <Typography variant="body2">{community.joinedDate}</Typography>
                              </Stack>
                            </Stack>
                            
                            <Button 
                              variant="outlined" 
                              fullWidth
                              startIcon={<Send />}
                              onClick={() => {
                                setCommunityOrderForm({ ...communityOrderForm, communityId: community.id });
                                showSnackbar('Scroll down to send community order', 'info');
                              }}
                            >
                              Send Group Order
                            </Button>

                            {community.isAdmin && (
                              <Button 
                                variant="contained" 
                                color="success"
                                fullWidth
                                onClick={() => navigate('/dashboard/community')}
                              >
                                Open Community Dashboard
                              </Button>
                            )}
                            
                            {community.isAdmin && pendingRequests.filter(r => r.communityId === community.id).length > 0 && (
                              <Chip 
                                label={`${pendingRequests.filter(r => r.communityId === community.id).length} Pending Requests`}
                                color="warning"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                {/* Send Community Order Form */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    <Send sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Send Community Order Request
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box component="form" onSubmit={sendCommunityOrder}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="Select Community"
                          value={communityOrderForm.communityId}
                          onChange={(e) => setCommunityOrderForm({ ...communityOrderForm, communityId: e.target.value })}
                          required
                        >
                          {myCommunities.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name} ({c.discount}% discount)
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Product Name"
                          value={communityOrderForm.product}
                          onChange={(e) => setCommunityOrderForm({ ...communityOrderForm, product: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Quantity"
                          value={communityOrderForm.quantity}
                          onChange={(e) => setCommunityOrderForm({ ...communityOrderForm, quantity: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button type="submit" variant="contained" fullWidth sx={{ height: 56 }}>
                          Send Request
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
                
                {/* Admin: Pending Requests */}
                {myCommunities.some(c => c.isAdmin) && pendingRequests.length > 0 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      <AdminPanelSettings sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Pending Member Requests (Admin)
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Community</TableCell>
                            <TableCell>Member</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Request Date</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pendingRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>{request.communityName}</TableCell>
                              <TableCell>{request.member}</TableCell>
                              <TableCell>{request.product}</TableCell>
                              <TableCell>{request.quantity}</TableCell>
                              <TableCell>{request.requestDate}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1}>
                                  <IconButton 
                                    size="small" 
                                    color="success"
                                    onClick={() => approveRequest(request.id)}
                                  >
                                    <ThumbUp />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => rejectRequest(request.id)}
                                  >
                                    <ThumbDown />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}
              </Box>
            )}
            
            {/* Join Community */}
            {activeSection === 'join-community' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Join a Community
                </Typography>
                <Grid container spacing={3}>
                  {availableCommunities.map((community) => (
                    <Grid item xs={12} md={6} lg={4} key={community.id}>
                      <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 } }}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                              <Typography variant="h6" fontWeight="bold">
                                {community.name}
                              </Typography>
                              <Chip 
                                icon={<CardGiftcard />}
                                label={`${community.discount}% OFF`} 
                                color="success" 
                              />
                            </Stack>
                            
                            <Typography variant="body2" color="text.secondary">
                              {community.description}
                            </Typography>
                            
                            <Divider />
                            
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Members</Typography>
                                <Chip label={community.members} size="small" color="primary" />
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Admin</Typography>
                                <Typography variant="body2" fontWeight="600">{community.admin}</Typography>
                              </Stack>
                            </Stack>
                            
                            <Button 
                              variant="contained" 
                              fullWidth
                              startIcon={<PersonAdd />}
                              onClick={() => joinCommunity(community)}
                            >
                              Join Community
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Order History */}
            {activeSection === 'orders' && (
              <Box>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Order History
                  </Typography>
                </Paper>
                
                {orderHistory.map((order) => (
                  <Card key={order.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item xs={12} sm={3}>
                          <Stack>
                            <Typography variant="caption" color="text.secondary">
                              Order ID
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              #{order.id}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Stack>
                            <Typography variant="caption" color="text.secondary">
                              Date
                            </Typography>
                            <Typography variant="body1">
                              {order.date}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Stack>
                            <Typography variant="caption" color="text.secondary">
                              Items
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              {order.items} items
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Stack>
                            <Typography variant="caption" color="text.secondary">
                              Total
                            </Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              ₹{order.total}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Chip 
                            label={order.status}
                            color={order.status === 'Delivered' ? 'success' : 'info'}
                            icon={order.status === 'Delivered' ? <CheckCircle /> : <LocalShipping />}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                    <CardActions>
                      <Button size="small" endIcon={<ArrowForward />} onClick={() => showSnackbar('Order details feature coming soon', 'info')}>
                        View Details
                      </Button>
                      {order.status === 'Delivered' && (
                        <Button size="small" color="primary" onClick={() => showSnackbar('Reorder feature coming soon', 'info')}>
                          Reorder
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                ))}
              </Box>
            )}

            {/* Profile */}
            {activeSection === 'profile' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Avatar 
                      sx={{ 
                        width: 120, 
                        height: 120, 
                        mx: 'auto', 
                        mb: 2,
                        bgcolor: 'primary.main',
                        fontSize: '3rem'
                      }}
                    >
                      <Person sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      John Doe
                    </Typography>
                    <Chip label="Premium Customer" color="primary" sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Member since January 2024
                    </Typography>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Orders</Typography>
                        <Typography variant="body2" fontWeight="bold">24</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Spent</Typography>
                        <Typography variant="body2" fontWeight="bold">₹12,450</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Loyalty Points</Typography>
                        <Chip label="156" size="small" color="success" />
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Personal Information
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Full Name" defaultValue="John Doe" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" type="email" defaultValue="john.doe@example.com" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" defaultValue="+91 9876543210" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="City" defaultValue="Mumbai" />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          label="Delivery Address" 
                          multiline 
                          rows={3} 
                          defaultValue="123 Main Street, Apartment 4B, Downtown Area, Mumbai, Maharashtra - 400001" 
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                          <Button variant="contained" size="large" onClick={() => showSnackbar('Profile update feature coming soon', 'info')}>
                            Update Profile
                          </Button>
                          <Button variant="outlined" size="large" onClick={() => showSnackbar('Change password feature coming soon', 'info')}>
                            Change Password
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Container>
        </Box>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerDashboard;

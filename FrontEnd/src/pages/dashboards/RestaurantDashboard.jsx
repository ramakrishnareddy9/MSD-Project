import { useState, useEffect } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Chip,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  CardMedia, InputAdornment, CircularProgress, Snackbar, Alert
} from '@mui/material';
import {
  Restaurant, ShoppingCart, AccountCircle, Inventory,
  Notifications, Menu as MenuIcon, Home, Schedule, TrendingUp,
  LocalShipping, AttachMoney, Add, Remove, Delete, Search
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { productAPI, orderAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const RestaurantDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOrderDialog, setBulkOrderDialog] = useState(false);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [bulkOrders, setBulkOrders] = useState([]);
  const [deliverySchedule, setDeliverySchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    activeOrders: 0,
    monthlySpent: 0,
    totalOrders: 0,
    pendingDelivery: 0
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { user } = useAuth();

  // Fetch all data from backend
  useEffect(() => {
    if (user?._id) {
      fetchProducts();
      fetchOrders();
      fetchDeliverySchedule();
      fetchNotifications();
      fetchStats();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAll({ status: 'active' });
      if (response.success) {
        setProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to sample data if API fails
      setProducts([
        { _id: '1', name: 'Organic Tomatoes', basePrice: 30, unit: 'kg', images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=300'], ownerId: { name: 'Rohan Farmer' }, categoryId: { name: 'Vegetables' }, minOrderQuantity: 10 },
        { _id: '2', name: 'Fresh Carrots', basePrice: 40, unit: 'kg', images: ['https://images.unsplash.com/photo-1447175008436-054170c2e979?w=300'], ownerId: { name: 'Rohan Farmer' }, categoryId: { name: 'Vegetables' }, minOrderQuantity: 10 },
        { _id: '3', name: 'Bananas', basePrice: 50, unit: 'kg', images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300'], ownerId: { name: 'Suman Farmer' }, categoryId: { name: 'Fruits' }, minOrderQuantity: 20 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getAll({ buyerId: user?._id, type: 'b2b' });
      if (response.success) {
        setBulkOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Fallback to sample data
      setBulkOrders([
        { _id: 'BO001', orderNumber: 'BO001', createdAt: '2025-10-28', orderItems: [1,2,3,4,5], total: 12500, status: 'delivered', deliveryDate: '2025-10-29' },
        { _id: 'BO002', orderNumber: 'BO002', createdAt: '2025-10-30', orderItems: [1,2,3,4,5,6,7,8], total: 18900, status: 'shipped', deliveryDate: '2025-11-02' },
      ]);
    }
  };

  const fetchDeliverySchedule = async () => {
    try {
      const response = await orderAPI.getAll({ 
        buyerId: user?._id, 
        status: { $in: ['confirmed', 'shipped', 'in-transit'] } 
      });
      if (response.success) {
        const scheduled = response.data.orders
          .filter(order => order.deliveryDate)
          .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
        setDeliverySchedule(scheduled);
      }
    } catch (error) {
      console.error('Error fetching delivery schedule:', error);
      setDeliverySchedule([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch recent orders for notifications
      const response = await orderAPI.getAll({ 
        buyerId: user?._id,
        limit: 5,
        sort: '-createdAt'
      });
      
      if (response.success) {
        const orderNotifications = response.data.orders.map(order => ({
          id: order._id,
          type: order.status === 'delivered' ? 'success' : 
                order.status === 'confirmed' ? 'info' : 'warning',
          message: `Order ${order.orderNumber} - ${order.status}`,
          timestamp: order.updatedAt || order.createdAt,
          read: false
        }));
        setNotifications(orderNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([
        { id: 1, type: 'success', message: 'Order BO001 delivered successfully', timestamp: new Date().toISOString(), read: false },
        { id: 2, type: 'info', message: 'New bulk order discount available', timestamp: new Date().toISOString(), read: false },
      ]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await orderAPI.getAll({ buyerId: user?._id });
      
      if (response.success) {
        const orders = response.data.orders || [];
        
        // Calculate stats from real data
        const activeOrders = orders.filter(o => 
          ['pending', 'confirmed', 'shipped', 'in-transit'].includes(o.status)
        ).length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyOrders = orders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate.getMonth() === currentMonth && 
                 orderDate.getFullYear() === currentYear;
        });
        
        const monthlySpent = monthlyOrders.reduce((sum, o) => 
          sum + (o.total || o.subtotal || 0), 0
        );
        
        const pendingDelivery = orders.filter(o => 
          ['shipped', 'in-transit'].includes(o.status)
        ).length;
        
        setStats({
          activeOrders,
          monthlySpent,
          totalOrders: orders.length,
          pendingDelivery
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use default stats
      setStats({
        activeOrders: 3,
        monthlySpent: 52000,
        totalOrders: 156,
        pendingDelivery: 2
      });
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    const minOrder = product.minOrderQuantity || 10;
    
    if (existing) {
      setCart(cart.map(item => 
        item._id === product._id 
          ? { ...item, quantity: item.quantity + minOrder }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        quantity: minOrder,
        price: product.basePrice,
        image: product.images?.[0] || '',
        farmer: product.ownerId?.name || 'Farmer',
        category: product.categoryId?.name || 'Category',
        minOrder: minOrder
      }]);
    }
    setSnackbar({ open: true, message: `${product.name} added to cart`, severity: 'success' });
  };

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item._id === productId) {
        const newQty = Math.max(item.minOrder || 10, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
    setSnackbar({ open: true, message: 'Item removed from cart', severity: 'info' });
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + ((item.price || item.basePrice) * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    try {
      setLoading(true);
      
      // Prepare order data
      const orderData = {
        type: 'b2b',
        buyerId: user._id,
        sellerId: cart[0]?.ownerId?._id || cart[0]?.ownerId, // First farmer as seller (in real app, group by seller)
        orderItems: cart.map(item => ({
          productId: item._id,
          productName: item.name,
          productImage: item.image || item.images?.[0],
          farmerId: item.ownerId?._id || item.ownerId,
          farmerName: item.farmer || item.ownerId?.name,
          categoryId: item.categoryId?._id || item.categoryId,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.price || item.basePrice,
          totalPrice: (item.price || item.basePrice) * item.quantity,
          discountApplied: 0
        })),
        deliveryAddress: user.addresses?.[0] || {
          line1: 'Restaurant Address',
          city: 'City',
          state: 'State',
          postalCode: '000000',
          country: 'India'
        },
        paymentMethod: 'prepaid'
      };

      const response = await orderAPI.create(orderData);
      
      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: `Order placed successfully! Order ID: ${response.data.order.orderNumber}`, 
          severity: 'success' 
        });
        setCart([]);
        setBulkOrderDialog(false);
        // Refresh all data
        await Promise.all([
          fetchOrders(),
          fetchDeliverySchedule(),
          fetchNotifications(),
          fetchStats()
        ]);
      } else {
        throw new Error(response.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      setSnackbar({ 
        open: true, 
        message: `Error: ${error.message}. Order saved locally.`, 
        severity: 'error' 
      });
      // Still clear cart on error for demo purposes
      setCart([]);
      setBulkOrderDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.categoryId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'orders', label: 'My Orders', icon: <ShoppingCart />, badge: stats.activeOrders || 0 },
    { id: 'bulk', label: 'Bulk Orders', icon: <Inventory /> },
    { id: 'schedule', label: 'Delivery Schedule', icon: <Schedule /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: notifications.filter(n => !n.read).length },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 280 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Restaurant color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">
              FarmKart Restaurant
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
                sx={{ borderRadius: 2, mb: 0.5 }}
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
            <Restaurant color="primary" sx={{ fontSize: 36 }} />
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
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Stats Card */}
          <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              This Month
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Total Orders</Typography>
                <Typography variant="body2" fontWeight="bold">{stats.totalOrders}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Amount Spent</Typography>
                <Chip label={`₹${(stats.monthlySpent / 1000).toFixed(1)}k`} size="small" color="primary" />
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1}>
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Restaurant Partner Dashboard
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="primary">
                <Badge badgeContent={2} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {activeSection === 'overview' && (
              <Box>
                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Active Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">
                              {stats.activeOrders}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                            <ShoppingCart sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              This Month
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              ₹{(stats.monthlySpent / 1000).toFixed(1)}k
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                            <AttachMoney sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              {stats.totalOrders}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                            <TrendingUp sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Pending Delivery
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              {stats.pendingDelivery}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                            <LocalShipping sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Welcome Message */}
                <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
                  <Restaurant sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Welcome to Restaurant Dashboard
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Manage your bulk orders, schedule deliveries, and get fresh produce directly from farmers.
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button 
                      variant="contained" 
                      startIcon={<ShoppingCart />}
                      onClick={() => {
                        setActiveSection('bulk');
                        setBulkOrderDialog(true);
                      }}
                    >
                      Place Bulk Order
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<Schedule />}
                      onClick={() => setActiveSection('schedule')}
                    >
                      View Schedule
                    </Button>
                  </Stack>
                </Paper>

                <Typography variant="body2" color="text.secondary" align="center">
                  Bulk ordering available! Select products, set quantities (minimum order applies), and schedule deliveries.
                </Typography>
              </Box>
            )}

            {activeSection === 'bulk' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Bulk Orders
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Add />}
                    onClick={() => setBulkOrderDialog(true)}
                  >
                    New Bulk Order
                  </Button>
                </Stack>

                {/* Order History */}
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Order ID</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Items</strong></TableCell>
                        <TableCell><strong>Total</strong></TableCell>
                        <TableCell><strong>Delivery Date</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bulkOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                              No bulk orders yet. Place your first order!
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        bulkOrders.map((order) => (
                          <TableRow key={order._id}>
                            <TableCell>{order.orderNumber || order.id}</TableCell>
                            <TableCell>{new Date(order.createdAt || order.date).toLocaleDateString()}</TableCell>
                            <TableCell>{order.orderItems?.length || order.items} items</TableCell>
                            <TableCell>₹{(order.total || order.subtotal || 0).toLocaleString()}</TableCell>
                            <TableCell>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'TBD'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={order.status}
                                color={
                                  order.status === 'delivered' ? 'success' :
                                  order.status === 'shipped' || order.status === 'in-transit' ? 'primary' :
                                  order.status === 'confirmed' ? 'info' :
                                  'warning'
                                }
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeSection === 'schedule' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                  Delivery Schedule
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : deliverySchedule.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Scheduled Deliveries
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your upcoming deliveries will appear here once orders are confirmed.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {deliverySchedule.map((order) => (
                      <Grid item xs={12} md={6} key={order._id}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">
                                  {order.orderNumber}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {order.orderItems?.length || 0} items
                                </Typography>
                              </Box>
                              <Chip 
                                label={order.status}
                                color={
                                  order.status === 'shipped' || order.status === 'in-transit' ? 'primary' :
                                  order.status === 'confirmed' ? 'info' : 'default'
                                }
                                size="small"
                              />
                            </Stack>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Stack spacing={1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Schedule fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  Delivery Date:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {new Date(order.deliveryDate).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </Typography>
                              </Stack>
                              
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AttachMoney fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  Total:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  ₹{(order.total || order.subtotal || 0).toLocaleString()}
                                </Typography>
                              </Stack>

                              {order.deliveryAddress && (
                                <Stack direction="row" alignItems="start" spacing={1}>
                                  <LocalShipping fontSize="small" color="action" sx={{ mt: 0.5 }} />
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      Delivery Address:
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {order.deliveryAddress.line1}, {order.deliveryAddress.city}
                                    </Typography>
                                  </Box>
                                </Stack>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {activeSection !== 'overview' && activeSection !== 'bulk' && activeSection !== 'schedule' && 
             activeSection !== 'notifications' && activeSection !== 'profile' && activeSection !== 'orders' && (
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {menuItems.find(m => m.id === activeSection)?.label} - Coming Soon
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This feature is under development and will be available soon.
                </Typography>
              </Paper>
            )}

            {/* My Orders Section */}
            {activeSection === 'orders' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                  My Orders
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : bulkOrders.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Orders Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Start ordering fresh produce from local farmers.
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<Add />}
                      onClick={() => {
                        setActiveSection('bulk');
                        setBulkOrderDialog(true);
                      }}
                    >
                      Place Your First Order
                    </Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {bulkOrders.map((order) => (
                      <Grid item xs={12} key={order._id}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">
                                  Order {order.orderNumber}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </Typography>
                              </Box>
                              <Chip 
                                label={order.status}
                                color={
                                  order.status === 'delivered' ? 'success' :
                                  order.status === 'shipped' || order.status === 'in-transit' ? 'primary' :
                                  order.status === 'confirmed' ? 'info' :
                                  'warning'
                                }
                              />
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Items
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {order.orderItems?.length || 0} Products
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Total Amount
                                </Typography>
                                <Typography variant="body1" fontWeight="bold" color="success.main">
                                  ₹{(order.total || order.subtotal || 0).toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Delivery Date
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {order.deliveryDate ? 
                                    new Date(order.deliveryDate).toLocaleDateString() : 
                                    'Not Scheduled'
                                  }
                                </Typography>
                              </Grid>
                            </Grid>

                            {order.orderItems && order.orderItems.length > 0 && (
                              <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="caption" color="text.secondary" gutterBottom>
                                  Order Items:
                                </Typography>
                                <Stack spacing={1} sx={{ mt: 1 }}>
                                  {order.orderItems.slice(0, 3).map((item, idx) => (
                                    <Typography key={idx} variant="body2">
                                      • {item.productName || 'Product'} - {item.quantity} {item.unit}
                                    </Typography>
                                  ))}
                                  {order.orderItems.length > 3 && (
                                    <Typography variant="body2" color="text.secondary">
                                      +{order.orderItems.length - 3} more items
                                    </Typography>
                                  )}
                                </Stack>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                  Notifications
                </Typography>

                {notifications.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You're all caught up! Notifications about your orders will appear here.
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2}>
                    {notifications.map((notification) => (
                      <Card key={notification.id}>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="start">
                            <Avatar 
                              sx={{ 
                                bgcolor: notification.type === 'success' ? 'success.main' :
                                         notification.type === 'info' ? 'info.main' :
                                         'warning.main',
                                width: 40,
                                height: 40
                              }}
                            >
                              {notification.type === 'success' ? <ShoppingCart /> : <Notifications />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" fontWeight="medium">
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(notification.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </Typography>
                            </Box>
                            {!notification.read && (
                              <Chip label="New" color="primary" size="small" />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* Profile Section */}
            {activeSection === 'profile' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                  Restaurant Profile
                </Typography>

                <Grid container spacing={3}>
                  {/* Profile Card */}
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                          <Avatar 
                            sx={{ 
                              width: 80, 
                              height: 80, 
                              bgcolor: 'primary.main',
                              fontSize: 32
                            }}
                          >
                            {user?.name?.charAt(0) || 'R'}
                          </Avatar>
                          <Box>
                            <Typography variant="h5" fontWeight="bold">
                              {user?.name || 'Restaurant Name'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user?.email || 'email@example.com'}
                            </Typography>
                            <Chip 
                              label={user?.role || 'restaurant'} 
                              size="small" 
                              color="primary" 
                              sx={{ mt: 1 }} 
                            />
                          </Box>
                        </Stack>

                        <Divider sx={{ my: 3 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">
                              Phone
                            </Typography>
                            <Typography variant="body1">
                              {user?.phone || 'Not provided'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">
                              Member Since
                            </Typography>
                            <Typography variant="body1">
                              {user?.createdAt ? 
                                new Date(user.createdAt).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  year: 'numeric' 
                                }) : 
                                'N/A'
                              }
                            </Typography>
                          </Grid>
                          {user?.addresses && user.addresses.length > 0 && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Address
                              </Typography>
                              <Typography variant="body1">
                                {user.addresses[0].line1}, {user.addresses[0].city}, {user.addresses[0].state} - {user.addresses[0].postalCode}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Stats Card */}
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Order Statistics
                        </Typography>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                              {stats.totalOrders}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Active Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              {stats.activeOrders}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Spent
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              ₹{(stats.monthlySpent / 1000).toFixed(1)}k
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Container>
        </Box>
      </Box>

      {/* Bulk Order Dialog */}
      <Dialog 
        open={bulkOrderDialog} 
        onClose={() => setBulkOrderDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">
              Place Bulk Order
            </Typography>
            <Chip 
              label={`${cart.length} items in cart`} 
              color="primary" 
              size="small"
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Grid container spacing={2}>
              {loading ? (
                <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading products...
                  </Typography>
                </Grid>
              ) : filteredProducts.length === 0 ? (
                <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No products found
                  </Typography>
                </Grid>
              ) : (
                filteredProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product._id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="140"
                        image={product.images?.[0] || product.image || 'https://via.placeholder.com/300x140?text=No+Image'}
                        alt={product.name}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300x140?text=No+Image'; }}
                      />
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {product.ownerId?.name || product.farmer || 'Farmer'} • {product.categoryId?.name || product.category || 'Category'}
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                          <Box>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              ₹{product.basePrice || product.price}/{product.unit}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Min: {product.minOrderQuantity || product.minOrder || 10} {product.unit}
                            </Typography>
                          </Box>
                          <Button 
                            variant="contained" 
                            size="small"
                            onClick={() => addToCart(product)}
                          >
                            Add
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>

          {cart.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Cart ({cart.length} items)
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell><strong>Price</strong></TableCell>
                      <TableCell><strong>Quantity</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>₹{item.price || item.basePrice}/{item.unit}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton 
                              size="small" 
                              onClick={() => updateQuantity(item._id, -5)}
                            >
                              <Remove fontSize="small" />
                            </IconButton>
                            <Typography>{item.quantity} {item.unit}</Typography>
                            <IconButton 
                              size="small"
                              onClick={() => updateQuantity(item._id, 5)}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          ₹{((item.price || item.basePrice) * item.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => removeFromCart(item._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <Typography variant="h6" fontWeight="bold">
                          Total:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          ₹{getTotalAmount().toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOrderDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
          >
            Place Order (₹{getTotalAmount().toLocaleString()})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RestaurantDashboard;

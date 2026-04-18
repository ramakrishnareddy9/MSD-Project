import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Chip,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  CardMedia, InputAdornment, CircularProgress, Snackbar, Alert, LinearProgress
} from '@mui/material';
import {
  Restaurant, ShoppingCart, AccountCircle, Inventory,
  Notifications, Menu as MenuIcon, Home, Schedule, TrendingUp,
  LocalShipping, AttachMoney, Add, Remove, Delete, Search, Autorenew,
  Store, DeliveryDining, Refresh, DoneAll
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { productAPI, orderAPI, authAPI, cartAPI, analyticsAPI, inventoryAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FLEET_KEY = 'restaurant_fleet';
const INVENTORY_KEY = 'restaurant_inventory';

const RestaurantDashboard = () => {
  const { user } = useAuth();

  // ── API-driven State ────────────────────────────────────────────────────────
  const [restaurantData, setRestaurantData] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ 
    activeOrders: 0, 
    monthlySpent: 0, 
    totalOrders: 0, 
    pendingDelivery: 0 
  });
  const [loading, setLoading] = useState(true);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [dailyDraft, setDailyDraft] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ── Initialize: Fetch restaurant data on mount ──────────────────────────────
  useEffect(() => {
    const initializeRestaurantData = async () => {
      try {
        setLoading(true);

        // Get current user (restaurant profile)
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          setRestaurantData(userRes.data);

          // Get restaurant's cart (ongoing bulk orders)
          const cartRes = await cartAPI.getCart();
          if (cartRes.success && cartRes.data?.items) {
            const mappedCart = cartRes.data.items.map(item => ({
              id: item.productId?._id || item.productId,
              product: item.productId?.name || 'Product',
              quantity: item.quantity || 0,
              price: item.productId?.basePrice || 0,
              supplier: item.productId?.ownerId?.name || 'Supplier'
            }));
            setCart(mappedCart);
          }

          // Get available products for bulk ordering
          const productsRes = await productAPI.getAll({ status: 'active', limit: 50 });
          if (productsRes.success && productsRes.data?.products) {
            const mappedProducts = productsRes.data.products.map(p => ({
              id: p._id || p.id,
              product: p.name,
              supplier: p.ownerId?.name || 'Farm',
              price: p.basePrice || 0,
              minOrder: p.minBulkQuantity || 20,
              inStock: p.stockQuantity > 0,
              unit: p.unit || 'kg'
            }));
            setProducts(mappedProducts);
          }

          // Get restaurant's orders (bulk order history)
          const ordersRes = await orderAPI.getAll({ buyerId: userRes.data._id });
          if (ordersRes.success && ordersRes.data?.orders) {
            const mappedOrders = ordersRes.data.orders.map((o, idx) => ({
              id: idx + 1,
              product: o.orderItems?.[0]?.productName || 'Product',
              supplier: o.sellerId?.name || 'Supplier',
              quantity: o.orderItems?.[0]?.quantity || 0,
              amount: o.total || 0,
              status: o.status || 'pending',
              date: new Date(o.createdAt).toLocaleDateString()
            }));
            setOrders(mappedOrders);

            setStats({
              activeOrders: mappedOrders.filter(o => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)).length,
              monthlySpent: mappedOrders.reduce((sum, o) => sum + o.amount, 0),
              totalOrders: mappedOrders.length,
              pendingDelivery: mappedOrders.filter(o => o.status === 'shipped').length
            });
          }

          // Get restaurant's inventory
          const inventoryRes = await inventoryAPI.getAll({ ownerId: userRes.data._id });
          if (inventoryRes.success && inventoryRes.data) {
            const mappedInventory = inventoryRes.data.map((inv, idx) => ({
              id: idx + 1,
              product: inv.productId?.name || 'Product',
              stock: inv.quantity || 0,
              reorderLevel: inv.minStock || 10,
              unit: inv.unit || 'kg',
              status: inv.quantity > inv.minStock ? 'Good' : 'Low'
            }));
            setInventory(mappedInventory);
          }
        }
      } catch (error) {
        console.error('Error initializing restaurant data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeRestaurantData();
  }, []);

  // Mutable fleet & inventory fetched from API or database
  const [fleet, setFleet] = useState([]);
  const [inventory, setInventory] = useState([]);

  // ─── Fetch Fleet & Inventory from API ─────────────────────────────────────
  useEffect(() => {
    const fetchFleetAndInventory = async () => {
      try {
        // TODO: Replace with actual API calls when available
        // const fleetResponse = await deliveryAPI.getFleet();
        // const inventoryResponse = await inventoryAPI.getInventory();
        // setFleet(fleetResponse);
        // setInventory(inventoryResponse);
        
        // For now, initialize with empty arrays
        setFleet([]);
        setInventory([]);
      } catch (error) {
        console.error('Error fetching fleet/inventory:', error);
        setFleet([]);
        setInventory([]);
      }
    };

    fetchFleetAndInventory();
  }, []);

  const [suppliers] = useState([
    { id: 1, name: 'Rohan Farmer', category: 'Vegetables', rating: 4.8, orders: 45 },
    { id: 2, name: 'Suman Farmer', category: 'Fruits',     rating: 4.7, orders: 38 }
  ]);
  const [restaurantData] = useState({ stats: { onTimeDelivery: 96, qualityRating: 4.8 } });
  const [assignDialog, setAssignDialog] = useState({ open: false, riderId: null });
  const [addRiderDialog, setAddRiderDialog] = useState(false);
  const [newRider, setNewRider] = useState({ name: '', capacity: 'Delivery Bag' });

  const { user } = useAuth();

  // ─── Persist fleet & inventory ───────────────────────────────────────────
  useEffect(() => { localStorage.setItem(FLEET_KEY, JSON.stringify(fleet)); }, [fleet]);
  useEffect(() => { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); }, [inventory]);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setCartLoading(true);
      const response = await productAPI.getAll({ status: 'active' });
      if (response.success) {
        setProducts(response.data.products || []);
        return;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setCartLoading(false);
    }
    // Fallback seed data
    setProducts([
      { _id: '1', name: 'Organic Tomatoes', basePrice: 30, unit: 'kg', images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=300'], ownerId: { name: 'Rohan Farmer' }, categoryId: { name: 'Vegetables' }, minOrderQuantity: 5 },
      { _id: '2', name: 'Fresh Carrots',    basePrice: 40, unit: 'kg', images: ['https://images.unsplash.com/photo-1447175008436-054170c2e979?w=300'], ownerId: { name: 'Rohan Farmer' }, categoryId: { name: 'Vegetables' }, minOrderQuantity: 5 },
      { _id: '3', name: 'Bananas',          basePrice: 50, unit: 'kg', images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300'], ownerId: { name: 'Suman Farmer' }, categoryId: { name: 'Fruits' },     minOrderQuantity: 10 },
      { _id: '4', name: 'Onions',           basePrice: 25, unit: 'kg', images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300'], ownerId: { name: 'Rohan Farmer' }, categoryId: { name: 'Vegetables' }, minOrderQuantity: 5 },
      { _id: '5', name: 'Spinach',          basePrice: 35, unit: 'kg', images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300'], ownerId: { name: 'Suman Farmer' }, categoryId: { name: 'Greens' },     minOrderQuantity: 2 },
    ]);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?._id) return;
    try {
      const response = await orderAPI.getAll({ buyerId: user._id });
      if (response.success) {
        const fetched = response.data.orders || [];
        setOrders(fetched);
        computeStats(fetched);
        // Build delivery schedule from in-transit orders
        const scheduled = fetched
          .filter(o => ['confirmed', 'shipped', 'in-transit'].includes(o.status) && o.deliveryDate)
          .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
        setDeliverySchedule(scheduled);
        // Build notifications from 5 most recent
        const notifs = fetched.slice(0, 5).map(o => ({
          id: o._id,
          type: o.status === 'delivered' ? 'success' : o.status === 'confirmed' ? 'info' : 'warning',
          message: `Order ${o.orderNumber} — ${o.status}`,
          timestamp: o.updatedAt || o.createdAt,
          read: false
        }));
        setNotifications(notifs);
        return;
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    // Fallback seeds
    const seed = [
      { _id: 'O001', orderNumber: 'RO001', createdAt: new Date().toISOString(), orderItems: [{productName:'Tomatoes',quantity:10,unit:'kg'},{productName:'Carrots',quantity:5,unit:'kg'}], total: 550,  status: 'delivered',  deliveryDate: new Date().toISOString() },
      { _id: 'O002', orderNumber: 'RO002', createdAt: new Date().toISOString(), orderItems: [{productName:'Bananas',quantity:20,unit:'kg'}],                                                  total: 1000, status: 'in-transit', deliveryDate: new Date(Date.now()+86400000).toISOString() },
    ];
    setOrders(seed);
    computeStats(seed);
    const scheduled = seed.filter(o => ['confirmed','shipped','in-transit'].includes(o.status) && o.deliveryDate);
    setDeliverySchedule(scheduled);
    setNotifications([
      { id: 1, type: 'info',    message: 'Your order RO002 is on the way!',     timestamp: new Date().toISOString(), read: false },
      { id: 2, type: 'success', message: 'Order RO001 was delivered.',           timestamp: new Date().toISOString(), read: false },
    ]);
  }, [user]);

  const computeStats = (list) => {
    const activeOrders  = list.filter(o => ['pending','confirmed','shipped','in-transit'].includes(o.status)).length;
    const pendingDelivery = list.filter(o => ['shipped','in-transit'].includes(o.status)).length;
    const now = new Date();
    const monthlySpent = list
      .filter(o => { const d = new Date(o.createdAt); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); })
      .reduce((s, o) => s + (o.total || o.subtotal || 0), 0);
    setStats({ activeOrders, monthlySpent, totalOrders: list.length, pendingDelivery });
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchOrders()]);
    setSnackbar({ open: true, message: 'Data refreshed!', severity: 'info' });
  }, [fetchProducts, fetchOrders]);

  useEffect(() => {
    if (user?._id) refreshAll();
  }, [user, refreshAll]);

  // ─── Notifications ────────────────────────────────────────────────────────
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setSnackbar({ open: true, message: 'All notifications marked as read', severity: 'info' });
  };
  const markOneRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    const step = product.minOrderQuantity || 5;
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + step } : i);
      return [...prev, { ...product, quantity: step, price: product.basePrice, image: product.images?.[0] || '', farmer: product.ownerId?.name || 'Farmer', category: product.categoryId?.name || 'Category', minOrder: step }];
    });
    setSnackbar({ open: true, message: `${product.name} added to cart`, severity: 'success' });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item._id !== productId) return item;
      const step = item.minOrder || 5;
      const newQty = Math.max(step, item.quantity + delta * step);
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i._id !== productId));
    setSnackbar({ open: true, message: 'Item removed from cart', severity: 'info' });
  };

  const getTotalAmount = () => cart.reduce((s, i) => s + (i.price || i.basePrice) * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      setCartLoading(true);
      const orderData = {
        type: 'b2b',
        buyerId: user._id,
        sellerId: cart[0]?.ownerId?._id || cart[0]?.ownerId,
        orderItems: cart.map(item => ({
          productId: item._id, productName: item.name,
          productImage: item.image || item.images?.[0],
          farmerId: item.ownerId?._id || item.ownerId,
          farmerName: item.farmer || item.ownerId?.name,
          categoryId: item.categoryId?._id || item.categoryId,
          quantity: item.quantity, unit: item.unit,
          unitPrice: item.price || item.basePrice,
          totalPrice: (item.price || item.basePrice) * item.quantity,
          discountApplied: 0
        })),
        deliveryAddress: user.addresses?.[0] || { line1: 'Restaurant Address', city: 'City', state: 'State', postalCode: '000000', country: 'India' },
        paymentMethod: 'prepaid'
      };
      const response = await orderAPI.create(orderData);
      if (response.success) {
        setSnackbar({ open: true, message: `Order placed! ID: ${response.data.order.orderNumber}`, severity: 'success' });
        setCart([]);
        setActiveSection('orders');
        await fetchOrders();
        return;
      }
      throw new Error(response.message || 'Failed to place order');
    } catch (error) {
      console.error('Order error:', error);
      // Optimistic local update
      const localOrder = {
        _id: 'LOCAL_' + Date.now(),
        orderNumber: 'RO' + Math.floor(Math.random() * 100000),
        createdAt: new Date().toISOString(),
        orderItems: cart.map(i => ({ productName: i.name, quantity: i.quantity, unit: i.unit })),
        total: getTotalAmount(), status: 'pending',
        deliveryDate: new Date(Date.now() + 86400000).toISOString()
      };
      setOrders(prev => [localOrder, ...prev]);
      setCart([]);
      setActiveSection('orders');
      setSnackbar({ open: true, message: 'Order saved locally (backend unavailable)', severity: 'warning' });
    } finally {
      setCartLoading(false);
    }
  };

  // ─── Auto Orders / Subscriptions ──────────────────────────────────────────
  const subscribeToProduct = (product) => {
    if (subscriptions.find(i => i._id === product._id)) {
      setSnackbar({ open: true, message: `Already subscribed to ${product.name}`, severity: 'info' });
      return;
    }
    const step = product.minOrderQuantity || 5;
    const newSub = { ...product, quantity: step, price: product.basePrice, image: product.images?.[0] || '', farmer: product.ownerId?.name || 'Farmer', category: product.categoryId?.name || '', minOrder: step };
    setSubscriptions(prev => [...prev, newSub]);
    setDailyDraft(prev => prev.find(i => i._id === product._id) ? prev : [...prev, newSub]);
    setSnackbar({ open: true, message: `Subscribed to ${product.name} — added to today's draft`, severity: 'success' });
  };

  const removeSubscription = (productId) => {
    setSubscriptions(prev => prev.filter(i => i._id !== productId));
    setDailyDraft(prev => prev.filter(i => i._id !== productId));
    setSnackbar({ open: true, message: 'Subscription cancelled', severity: 'info' });
  };

  const updateDraftQuantity = (productId, delta) => {
    setDailyDraft(prev => prev.map(item => {
      if (item._id !== productId) return item;
      const step = item.minOrder || 5;
      return { ...item, quantity: Math.max(step, item.quantity + delta * step) };
    }));
  };

  const placeDailyOrder = () => {
    const valid = dailyDraft.filter(i => i.quantity > 0);
    if (!valid.length) { setSnackbar({ open: true, message: 'Draft is empty!', severity: 'warning' }); return; }
    setAutoLoading(true);
    const tempOrder = {
      _id: 'AUTO_' + Math.random().toString(36).substr(2, 9),
      orderNumber: 'AO' + Math.floor(Math.random() * 100000),
      createdAt: new Date().toISOString(),
      orderItems: valid.map(i => ({ productName: i.name, quantity: i.quantity, unit: i.unit })),
      total: valid.reduce((s, i) => s + i.price * i.quantity, 0),
      status: 'confirmed',
      deliveryDate: new Date(Date.now() + 86400000).toISOString()
    };
    setTimeout(() => {
      setOrders(prev => [tempOrder, ...prev]);
      setDailyDraft([]);
      setActiveSection('orders');
      setAutoLoading(false);
      setSnackbar({ open: true, message: 'Auto-order confirmed and scheduled!', severity: 'success' });
    }, 600);
  };

  // ─── Fleet management ─────────────────────────────────────────────────────
  const addRider = () => {
    if (!newRider.name.trim()) return;
    const rider = { id: 'R' + Date.now(), name: newRider.name.trim(), capacity: newRider.capacity, status: 'Available' };
    setFleet(prev => [...prev, rider]);
    setNewRider({ name: '', capacity: 'Delivery Bag' });
    setAddRiderDialog(false);
    setSnackbar({ open: true, message: `Rider ${rider.name} added`, severity: 'success' });
  };
  const removeRider = (id) => setFleet(prev => prev.filter(r => r.id !== id));
  const toggleRiderStatus = (id) => setFleet(prev => prev.map(r => r.id === id
    ? { ...r, status: r.status === 'Available' ? 'Off-duty' : 'Available' } : r));

  // ─── Inventory ────────────────────────────────────────────────────────────
  const recomputeInventoryStatus = (items) =>
    items.map(i => ({ ...i, status: i.stock <= i.reorderLevel ? 'Low' : 'Good' }));

  const updateInventoryStock = (id, delta) => {
    setInventory(prev => recomputeInventoryStatus(prev.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i)));
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoryId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Sidebar menu ─────────────────────────────────────────────────────────
  const menuItems = [
    { id: 'overview',       label: 'Overview',         icon: <Home /> },
    { id: 'marketplace',    label: 'Marketplace',      icon: <Store /> },
    { id: 'cart',           label: 'My Cart',          icon: <ShoppingCart />, badge: cart.length },
    { id: 'orders',         label: 'My Orders',        icon: <LocalShipping />, badge: stats.activeOrders || 0 },
    { id: 'subscriptions',  label: 'Auto Orders',      icon: <Autorenew /> },
    { id: 'inventory',      label: 'Pantry Inventory', icon: <Inventory /> },
    { id: 'logistics',      label: 'Fleet & Logistics',icon: <DeliveryDining /> },
    { id: 'schedule',       label: 'Delivery Schedule',icon: <Schedule /> },
    { id: 'notifications',  label: 'Notifications',    icon: <Notifications />, badge: unreadCount },
    { id: 'profile',        label: 'Profile',          icon: <AccountCircle /> },
  ];

  const allSectionIds = menuItems.map(m => m.id);

  const SidebarList = () => (
    <List>
      {menuItems.map((item) => (
        <ListItemButton
          key={item.id}
          selected={activeSection === item.id}
          onClick={() => { setActiveSection(item.id); setDrawerOpen(false); }}
          sx={{ borderRadius: 2, mb: 1 }}
        >
          <ListItemIcon>
            {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
          </ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
        </ListItemButton>
      ))}
    </List>
  );

  // ─── Low stock alert ──────────────────────────────────────────────────────
  const lowStockItems = inventory.filter(i => i.status === 'Low');

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>

      {/* Mobile Drawer */}
      <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Restaurant color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">FarmKart Restaurant</Typography>
          </Stack>
          <SidebarList />
        </Box>
      </Drawer>

      {/* Desktop Sidebar */}
      <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ position: 'sticky', top: 0, p: 3, maxHeight: '100vh', overflowY: 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Restaurant color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">FarmKart</Typography>
          </Stack>
          <SidebarList />
          <Divider sx={{ my: 3 }} />
          <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>This Month</Typography>
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
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Restaurant Partner Dashboard</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton color="primary" onClick={refreshAll} title="Refresh data">
                <Refresh />
              </IconButton>
              <IconButton color="primary" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Low Stock Banner */}
        {lowStockItems.length > 0 && (
          <Alert severity="warning" sx={{ borderRadius: 0 }}>
            ⚠️ Low pantry stock: {lowStockItems.map(i => i.product).join(', ')} — go to Pantry Inventory to reorder.
          </Alert>
        )}

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>

            {/* ── OVERVIEW ── */}
            {activeSection === 'overview' && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      {[
                        { label: 'Active Orders',    value: stats.activeOrders,    color: 'primary.main',  icon: <ShoppingCart sx={{ fontSize: 32 }} /> },
                        { label: 'This Month Spent', value: `₹${(stats.monthlySpent/1000).toFixed(1)}k`, color: 'success.main', icon: <AttachMoney sx={{ fontSize: 32 }} /> },
                        { label: 'Total Orders',     value: stats.totalOrders,     color: 'info.main',     icon: <TrendingUp sx={{ fontSize: 32 }} /> },
                        { label: 'Pending Delivery', value: stats.pendingDelivery, color: 'warning.main',  icon: <LocalShipping sx={{ fontSize: 32 }} /> },
                      ].map((stat) => (
                        <Grid item xs={12} sm={6} key={stat.label}>
                          <Card>
                            <CardContent>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                  <Typography variant="h4" fontWeight="bold" color={stat.color}>{stat.value}</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>{stat.icon}</Avatar>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    <Paper sx={{ p: 3, mb: 4 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Performance Metrics</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">On-Time Supply Delivery</Typography>
                            <Typography variant="body2" fontWeight="bold">{restaurantData.stats.onTimeDelivery}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={restaurantData.stats.onTimeDelivery} sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Ingredients Quality Rating</Typography>
                            <Typography variant="body2" fontWeight="bold">{restaurantData.stats.qualityRating}/5.0</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={(restaurantData.stats.qualityRating / 5) * 100} color="success" sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Quick Actions</Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" fullWidth startIcon={<Store />} onClick={() => setActiveSection('marketplace')}>Go to Marketplace</Button>
                        <Button variant="outlined" fullWidth startIcon={<Autorenew />} onClick={() => setActiveSection('subscriptions')}>Manage Auto Orders</Button>
                        <Button variant="outlined" fullWidth startIcon={<Inventory />} onClick={() => setActiveSection('inventory')}>Check Pantry Inventory</Button>
                      </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Top Farm Suppliers</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        {suppliers.map((s) => (
                          <Card key={s.id} variant="outlined">
                            <CardContent sx={{ p: 2 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">{s.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{s.category} • {s.orders} orders</Typography>
                                </Box>
                                <Chip label={`⭐ ${s.rating}`} size="small" color="success" />
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── MARKETPLACE ── */}
            {activeSection === 'marketplace' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Marketplace & Fresh Supplies</Typography>
                  <Button variant="contained" startIcon={<ShoppingCart />} onClick={() => setActiveSection('cart')}>
                    View Cart ({cart.length})
                  </Button>
                </Stack>

                <TextField fullWidth placeholder="Search for fresh produce, meats, etc..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                  sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {cartLoading ? (
                    <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Loading supplies...</Typography>
                    </Grid>
                  ) : filteredProducts.length === 0 ? (
                    <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">No products found.</Typography>
                    </Grid>
                  ) : filteredProducts.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product._id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardMedia component="img" height="180"
                          image={product.images?.[0] || product.image || 'https://via.placeholder.com/300x180?text=No+Image'}
                          alt={product.name}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/300x180?text=No+Image'; }} />
                        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {product.ownerId?.name || 'Farmer'} • {product.categoryId?.name || 'Category'}
                          </Typography>
                          <Chip label={`Min: ${product.minOrderQuantity || 5} ${product.unit}`} size="small" variant="outlined" sx={{ mb: 1, alignSelf: 'flex-start' }} />
                          <Box sx={{ mt: 'auto', pt: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="h6" color="primary.main" fontWeight="bold">
                                ₹{product.basePrice || product.price} / {product.unit}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Button variant="outlined" size="small" color="secondary" onClick={() => subscribeToProduct(product)}>
                                  Autoship
                                </Button>
                                <Button variant="contained" size="small" startIcon={<Add />} onClick={() => addToCart(product)}>
                                  Add
                                </Button>
                              </Stack>
                            </Stack>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* ── CART ── */}
            {activeSection === 'cart' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">My Cart</Typography>
                  <Button variant="outlined" startIcon={<Store />} onClick={() => setActiveSection('marketplace')}>Continue Shopping</Button>
                </Stack>

                {cart.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">Your cart is empty.</Typography>
                    <Button variant="contained" sx={{ mt: 3 }} onClick={() => setActiveSection('marketplace')}>Browse Marketplace</Button>
                  </Paper>
                ) : (
                  <Box>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Supply Item</strong></TableCell>
                            <TableCell><strong>Unit Price</strong></TableCell>
                            <TableCell><strong>Quantity</strong></TableCell>
                            <TableCell align="right"><strong>Total</strong></TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cart.map((item) => (
                            <TableRow key={item._id}>
                              <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.image || item.images?.[0]} variant="rounded" />
                                <Typography fontWeight="medium">{item.name}</Typography>
                              </TableCell>
                              <TableCell>₹{item.price || item.basePrice} / {item.unit}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <IconButton size="small" onClick={() => updateQuantity(item._id, -1)} color="primary"><Remove fontSize="small" /></IconButton>
                                  <Typography fontWeight="bold" sx={{ minWidth: 40, textAlign: 'center' }}>{item.quantity} {item.unit}</Typography>
                                  <IconButton size="small" onClick={() => updateQuantity(item._id, 1)} color="primary"><Add fontSize="small" /></IconButton>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Typography fontWeight="bold">₹{((item.price || item.basePrice) * item.quantity).toLocaleString()}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => removeFromCart(item._id)}><Delete fontSize="small" /></IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Paper sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" color="text.secondary">Order Subtotal</Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary.main">₹{getTotalAmount().toLocaleString()}</Typography>
                        </Box>
                        <Button variant="contained" size="large" disabled={cartLoading} onClick={handlePlaceOrder} sx={{ px: 4, py: 1.5 }}>
                          {cartLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirm & Place Order'}
                        </Button>
                      </Stack>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {/* ── ORDERS ── */}
            {activeSection === 'orders' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>My Orders</Typography>

                {cartLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : orders.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>No Orders Yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Start ordering fresh produce from local farmers.</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setActiveSection('marketplace')}>Place Your First Order</Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {orders.map((order) => (
                      <Grid item xs={12} key={order._id}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">Order {order.orderNumber}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Typography>
                              </Box>
                              <Chip label={order.status}
                                color={order.status==='delivered'?'success':order.status==='shipped'||order.status==='in-transit'?'primary':order.status==='confirmed'?'info':'warning'} />
                            </Stack>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Items</Typography>
                                <Typography variant="body1" fontWeight="bold">{order.orderItems?.length || 0} Products</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                                <Typography variant="body1" fontWeight="bold" color="success.main">₹{(order.total || order.subtotal || 0).toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Delivery Date</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not Scheduled'}
                                </Typography>
                              </Grid>
                            </Grid>
                            {order.orderItems?.length > 0 && (
                              <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="caption" color="text.secondary">Items:</Typography>
                                <Stack spacing={0.5} sx={{ mt: 1 }}>
                                  {order.orderItems.slice(0, 3).map((item, idx) => (
                                    <Typography key={idx} variant="body2">• {item.productName || 'Product'} — {item.quantity} {item.unit}</Typography>
                                  ))}
                                  {order.orderItems.length > 3 && (
                                    <Typography variant="body2" color="text.secondary">+{order.orderItems.length - 3} more items</Typography>
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

            {/* ── AUTO ORDERS / SUBSCRIPTIONS ── */}
            {activeSection === 'subscriptions' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>Auto Orders & Subscriptions</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Subscribe to daily produce from the Marketplace. Each item drops into today's draft automatically — adjust quantities before confirming.
                </Typography>

                <Grid container spacing={4}>
                  <Grid item xs={12} md={7}>
                    <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                      <CardContent>
                        <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>Today's Delivery Draft</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Harvest yield varies daily — adjust quantities as needed before placing today's order.
                        </Typography>
                        {dailyDraft.length === 0 ? (
                          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default' }} variant="outlined">
                            <Typography color="text.secondary">No items in today's draft.</Typography>
                            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setActiveSection('marketplace')}>Browse Marketplace</Button>
                          </Paper>
                        ) : (
                          <Box>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>Item</strong></TableCell>
                                    <TableCell><strong>Quantity</strong></TableCell>
                                    <TableCell align="right"><strong>Sub-total</strong></TableCell>
                                    <TableCell align="right"><strong>Remove</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {dailyDraft.map(item => (
                                    <TableRow key={item._id}>
                                      <TableCell><Typography variant="body2" fontWeight="medium">{item.name}</Typography></TableCell>
                                      <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                          <IconButton size="small" onClick={() => updateDraftQuantity(item._id, -1)}><Remove fontSize="small" /></IconButton>
                                          <Typography>{item.quantity} {item.unit}</Typography>
                                          <IconButton size="small" onClick={() => updateDraftQuantity(item._id, 1)}><Add fontSize="small" /></IconButton>
                                        </Stack>
                                      </TableCell>
                                      <TableCell align="right">
                                        <Typography variant="body2">₹{(item.price * item.quantity).toLocaleString()}</Typography>
                                      </TableCell>
                                      <TableCell align="right">
                                        <IconButton size="small" color="error" onClick={() => setDailyDraft(prev => prev.filter(d => d._id !== item._id))}><Delete fontSize="small" /></IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                            <Button variant="contained" fullWidth size="large" onClick={placeDailyOrder} disabled={autoLoading}>
                              {autoLoading ? <CircularProgress size={20} color="inherit" /> : "Confirm Today's Order"}
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Active Subscriptions</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          These items auto-populate your draft each morning.
                        </Typography>
                        {subscriptions.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <Autorenew sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">No active subscriptions.</Typography>
                            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setActiveSection('marketplace')}>Subscribe from Marketplace</Button>
                          </Box>
                        ) : (
                          <Stack spacing={2}>
                            {subscriptions.map(sub => (
                              <Paper key={sub._id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} variant="outlined">
                                <Box>
                                  <Typography variant="body1" fontWeight="bold">{sub.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {sub.quantity} {sub.unit} / day · ₹{sub.price}/{sub.unit}
                                  </Typography>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => removeSubscription(sub._id)}><Delete /></IconButton>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── PANTRY INVENTORY ── */}
            {activeSection === 'inventory' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Pantry Inventory</Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.lighter' }}>
                      <Typography variant="h4" fontWeight="bold" color="error.main">{inventory.filter(i => i.status==='Low').length}</Typography>
                      <Typography variant="body2" color="text.secondary">Low Stock Items</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.lighter' }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{inventory.filter(i => i.status==='Good').length}</Typography>
                      <Typography variant="body2" color="text.secondary">Well Stocked</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Ingredient</strong></TableCell>
                        <TableCell><strong>Current Stock</strong></TableCell>
                        <TableCell><strong>Reorder Level</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="right"><strong>Adjust / Reorder</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><Typography fontWeight="medium">{item.product}</Typography></TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconButton size="small" onClick={() => updateInventoryStock(item.id, -1)}><Remove fontSize="small" /></IconButton>
                              <Typography>{item.stock} {item.unit}</Typography>
                              <IconButton size="small" onClick={() => updateInventoryStock(item.id, 1)}><Add fontSize="small" /></IconButton>
                            </Stack>
                          </TableCell>
                          <TableCell>{item.reorderLevel} {item.unit}</TableCell>
                          <TableCell>
                            <Chip label={item.status} color={item.status==='Good'?'success':'error'} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Button variant="outlined" size="small"
                              startIcon={<ShoppingCart />}
                              color={item.status==='Low'?'error':'primary'}
                              onClick={() => { setSearchQuery(item.product); setActiveSection('marketplace'); }}>
                              Reorder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* ── FLEET & LOGISTICS ── */}
            {activeSection === 'logistics' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Delivery Riders</Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={() => setAddRiderDialog(true)}>Add Rider</Button>
                </Stack>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { label: 'Total Riders', value: fleet.length, color: 'primary.main' },
                    { label: 'Available', value: fleet.filter(r=>r.status==='Available').length, color: 'success.main' },
                    { label: 'On Delivery', value: fleet.filter(r=>r.status==='On Delivery').length, color: 'warning.main' },
                  ].map(s => (
                    <Grid item xs={12} sm={4} key={s.label}>
                      <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
                        <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>ID</strong></TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fleet.map((rider) => (
                        <TableRow key={rider.id}>
                          <TableCell>{rider.id}</TableCell>
                          <TableCell>{rider.name}</TableCell>
                          <TableCell>{rider.capacity}</TableCell>
                          <TableCell>
                            <Chip label={rider.status}
                              color={rider.status==='Available'?'success':rider.status==='On Delivery'?'warning':'default'}
                              size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button variant="outlined" size="small"
                                disabled={rider.status === 'On Delivery'}
                                onClick={() => toggleRiderStatus(rider.id)}>
                                {rider.status === 'Available' ? 'Set Off-duty' : 'Set Available'}
                              </Button>
                              <Button variant="outlined" size="small" color="error"
                                disabled={rider.status === 'On Delivery'}
                                onClick={() => removeRider(rider.id)}>
                                Remove
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Add Rider Dialog */}
                <Dialog open={addRiderDialog} onClose={() => setAddRiderDialog(false)} maxWidth="xs" fullWidth>
                  <DialogTitle>Add New Rider</DialogTitle>
                  <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <TextField label="Rider Name" fullWidth value={newRider.name} onChange={(e) => setNewRider({ ...newRider, name: e.target.value })} />
                      <TextField label="Type" fullWidth select value={newRider.capacity} onChange={(e) => setNewRider({ ...newRider, capacity: e.target.value })}>
                        {['Delivery Bag', 'Delivery Box', 'Two-Wheeler', 'Three-Wheeler'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setAddRiderDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={addRider} disabled={!newRider.name.trim()}>Add Rider</Button>
                  </DialogActions>
                </Dialog>

                {/* Assign Dialog */}
                <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, riderId: null })}>
                  <DialogTitle>Assign Delivery Rider</DialogTitle>
                  <DialogContent>
                    <Typography gutterBottom>Assign this rider to an active order.</Typography>
                    <TextField fullWidth label="Select Order" select sx={{ mt: 2 }} defaultValue="">
                      {orders.filter(o => ['confirmed','shipped'].includes(o.status)).map(o => (
                        <MenuItem key={o._id} value={o._id}>{o.orderNumber} — ₹{(o.total||0).toLocaleString()}</MenuItem>
                      ))}
                    </TextField>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setAssignDialog({ open: false, riderId: null })}>Cancel</Button>
                    <Button variant="contained" onClick={() => {
                      setAssignDialog({ open: false, riderId: null });
                      setSnackbar({ open: true, message: 'Rider assigned successfully', severity: 'success' });
                    }}>Confirm</Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}

            {/* ── DELIVERY SCHEDULE ── */}
            {activeSection === 'schedule' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Delivery Schedule</Typography>
                {cartLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : deliverySchedule.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>No Scheduled Deliveries</Typography>
                    <Typography variant="body2" color="text.secondary">Upcoming deliveries appear once orders are confirmed.</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {deliverySchedule.map((order) => (
                      <Grid item xs={12} md={6} key={order._id}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">{order.orderNumber}</Typography>
                                <Typography variant="caption" color="text.secondary">{order.orderItems?.length || 0} items</Typography>
                              </Box>
                              <Chip label={order.status}
                                color={order.status==='shipped'||order.status==='in-transit'?'primary':order.status==='confirmed'?'info':'default'}
                                size="small" />
                            </Stack>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Schedule fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">Delivery:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {new Date(order.deliveryDate).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AttachMoney fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">Total:</Typography>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  ₹{(order.total || order.subtotal || 0).toLocaleString()}
                                </Typography>
                              </Stack>
                              {order.deliveryAddress && (
                                <Stack direction="row" alignItems="start" spacing={1}>
                                  <LocalShipping fontSize="small" color="action" sx={{ mt: 0.5 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {order.deliveryAddress.line1}, {order.deliveryAddress.city}
                                  </Typography>
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

            {/* ── NOTIFICATIONS ── */}
            {activeSection === 'notifications' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Notifications</Typography>
                  {unreadCount > 0 && (
                    <Button startIcon={<DoneAll />} onClick={markAllRead}>Mark All as Read</Button>
                  )}
                </Stack>
                {notifications.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No Notifications</Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2}>
                    {notifications.map((n) => (
                      <Card key={n.id} onClick={() => markOneRead(n.id)} sx={{ cursor: 'pointer', opacity: n.read ? 0.7 : 1 }}>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="start">
                            <Avatar sx={{ bgcolor: n.type==='success'?'success.main':n.type==='info'?'info.main':'warning.main', width: 40, height: 40 }}>
                              {n.type === 'success' ? <ShoppingCart /> : <Notifications />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" fontWeight={n.read ? 'normal' : 'bold'}>{n.message}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(n.timestamp).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}
                              </Typography>
                            </Box>
                            {!n.read && <Chip label="New" color="primary" size="small" />}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* ── PROFILE ── */}
            {activeSection === 'profile' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Restaurant Profile</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                            {user?.name?.charAt(0) || 'R'}
                          </Avatar>
                          <Box>
                            <Typography variant="h5" fontWeight="bold">{user?.name || 'Restaurant Name'}</Typography>
                            <Typography variant="body2" color="text.secondary">{user?.email || 'email@example.com'}</Typography>
                            <Chip label={user?.role || 'restaurant'} size="small" color="primary" sx={{ mt: 1 }} />
                          </Box>
                        </Stack>
                        <Divider sx={{ my: 3 }} />
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Phone</Typography>
                            <Typography variant="body1">{user?.phone || 'Not provided'}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Member Since</Typography>
                            <Typography variant="body1">
                              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : 'N/A'}
                            </Typography>
                          </Grid>
                          {user?.addresses?.length > 0 && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Address</Typography>
                              <Typography variant="body1">
                                {user.addresses[0].line1}, {user.addresses[0].city}, {user.addresses[0].state} — {user.addresses[0].postalCode}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Order Statistics</Typography>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                          {[
                            { label: 'Total Orders',  value: stats.totalOrders,  color: 'primary.main' },
                            { label: 'Active Orders', value: stats.activeOrders, color: 'success.main' },
                            { label: 'Monthly Spent', value: `₹${(stats.monthlySpent/1000).toFixed(1)}k`, color: 'info.main' },
                          ].map((s, i) => (
                            <Box key={i}>
                              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                              <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
                              {i < 2 && <Divider sx={{ mt: 1 }} />}
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── COMING SOON fallback ── */}
            {!allSectionIds.includes(activeSection) && (
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>Coming Soon</Typography>
                <Typography variant="body2" color="text.secondary">This feature is under development.</Typography>
              </Paper>
            )}

          </Container>
        </Box>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RestaurantDashboard;

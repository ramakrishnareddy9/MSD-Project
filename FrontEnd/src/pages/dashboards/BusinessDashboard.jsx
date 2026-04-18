import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, ListItem,
  LinearProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert, InputAdornment, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, Tooltip
} from '@mui/material';
import {
  Business, ShoppingCart, TrendingUp, AccountCircle,
  Add, Notifications, Menu as MenuIcon, Dashboard, Inventory,
  LocalShipping, AttachMoney, CheckCircle,
  Schedule, Cancel, Verified, Agriculture,
  Store, Search, AddShoppingCart, RemoveShoppingCart,
  Delete, DirectionsCar, AddCircle, NotificationsActive,
  Refresh, Warning
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { productAPI, orderAPI, inventoryAPI, analyticsAPI, authAPI, vehicleAPI } from '../../services/api';

// ─── localStorage keys ─────────────────────────────────────────────────────────
const LS_ORDERS    = 'biz_orders';
const LS_FLEET     = 'biz_fleet';
const LS_INVENTORY = 'biz_inventory';
const LS_NOTIFS    = 'biz_notifications';

// ─── fallback seed data (used when backend is offline) ─────────────────────────
const SEED_ORDERS = [
  { id: 1, product: 'Premium Wheat', units: '500 kg', supplier: 'Ramesh Farm', amount: 15000, status: 'Pending Transport', date: '2024-01-15' },
  { id: 2, product: 'Organic Tomatoes', units: '100 kg', supplier: 'Green Valley', amount: 4000, status: 'In Transit', date: '2024-01-12' },
  { id: 3, product: 'Daily Milk', units: '200 L', supplier: 'Dairy Best', amount: 12000, status: 'Delivered', date: '2024-01-10' },
  { id: 4, product: 'Fruits Mix', units: '150 kg', supplier: 'Fresh Farms', amount: 18000, status: 'Delivered', date: '2024-01-08' }
];

const SEED_FLEET = [
  { id: 'v1', name: 'Tata Ace (Mini Truck)', capacity: 750, type: 'Mini Truck', status: 'Available' },
  { id: 'v2', name: 'Mahindra Bolero (Pickup)', capacity: 1500, type: 'Pickup', status: 'Available' },
  { id: 'v3', name: 'Eicher 11.10 (Truck)', capacity: 5000, type: 'Truck', status: 'Available' },
  { id: 'v4', name: 'Ashok Leyland Dost', capacity: 1250, type: 'Pickup', status: 'In Transit' }
];

const SEED_INVENTORY = [
  { id: 1, product: 'Wheat', stock: '250 bags', reorderLevel: '100 bags', status: 'Good' },
  { id: 2, product: 'Rice', stock: '180 bags', reorderLevel: '100 bags', status: 'Good' },
  { id: 3, product: 'Vegetables', stock: '45 crates', reorderLevel: '50 crates', status: 'Low' },
  { id: 4, product: 'Fruits', stock: '30 crates', reorderLevel: '40 crates', status: 'Low' }
];

const SEED_PRODUCTS = [
  { id: 1, name: 'Ramesh Farm', product: 'Wheat', stock: 500, price: 25, rating: 4.8, location: 'Gujarat', category: 'Grains' },
  { id: 2, name: 'Meera Farm', product: 'Wheat', stock: 300, price: 24, rating: 4.7, location: 'Punjab', category: 'Grains' },
  { id: 3, name: 'Suresh Farm', product: 'Wheat', stock: 150, price: 26, rating: 4.5, location: 'Haryana', category: 'Grains' },
  { id: 4, name: 'Green Valley', product: 'Rice', stock: 400, price: 40, rating: 4.5, location: 'Maharashtra', category: 'Grains' },
  { id: 5, name: 'Fresh Farms', product: 'Vegetables', stock: 200, price: 30, rating: 4.9, location: 'Karnataka', category: 'Vegetables' },
  { id: 6, name: 'Sunny Orchards', product: 'Fruits', stock: 100, price: 50, rating: 4.8, location: 'Himachal', category: 'Fruits' }
];

const BusinessDashboard = () => {
  // ── core state (API-driven) ─────────────────────────────────────────────────
  const [businessData, setBusinessData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    activeSuppliers: 0,
    monthlyPurchase: 0,
    avgOrderValue: 0,
    onTimeDelivery: 0,
    pendingTransport: 0,
    unreadNotifs: 0
  });
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState({ data: true, products: false, orders: false, fleet: false });

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [assignDialog, setAssignDialog] = useState({ open: false, orderId: null });
  const [addVehicleDialog, setAddVehicleDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', type: 'Truck', capacity: 0 });
  const [marketplaceSearch, setMarketplaceSearch] = useState({ product: '', quantity: '' });
  const [apiConnected, setApiConnected] = useState(false);

  // ── Initialize: Fetch all business data on mount ────────────────────────────
  useEffect(() => {
    const initializeBusinessData = async () => {
      try {
        setLoading(prev => ({ ...prev, data: true }));

        // Get current user (business profile)
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          setBusinessData(userRes.data);

          // Get business metrics (orders, earnings, etc.)
          const metricsRes = await analyticsAPI.getUserMetrics(userRes.data._id);
          if (metricsRes.success && metricsRes.data.sellerMetrics) {
            const seller = metricsRes.data.sellerMetrics;
            setMetrics({
              totalOrders: seller.totalOrders || 0,
              activeSuppliers: 0,
              monthlyPurchase: seller.totalEarned || 0,
              avgOrderValue: seller.totalOrders ? Math.round(seller.totalEarned / seller.totalOrders) : 0,
              onTimeDelivery: 85,
              pendingTransport: 0,
              unreadNotifs: 0
            });
          }

          // Get business orders
          const ordersRes = await orderAPI.getAll({ sellerId: userRes.data._id });
          if (ordersRes.success && ordersRes.data?.orders) {
            const mappedOrders = ordersRes.data.orders.map((o, idx) => ({
              id: idx + 1,
              product: o.orderItems?.[0]?.productName || 'Product',
              units: `${o.orderItems?.[0]?.quantity || 0} ${o.orderItems?.[0]?.unit || 'units'}`,
              supplier: o.buyerId?.name || 'Customer',
              amount: o.total || 0,
              status: o.status || 'pending',
              date: new Date(o.createdAt).toLocaleDateString()
            }));
            setOrders(mappedOrders);
          }

          // Get business vehicles
          const vehiclesRes = await vehicleAPI.getAll({ ownerId: userRes.data._id });
          if (vehiclesRes.success && vehiclesRes.data) {
            const mappedFleet = vehiclesRes.data.map((v, idx) => ({
              id: v._id || idx,
              name: v.name || 'Vehicle',
              capacity: v.capacity || 0,
              type: v.type || 'Truck',
              status: v.status || 'Available'
            }));
            setFleet(mappedFleet);
          }

          // Get available products (marketplace)
          const productsRes = await productAPI.getAll({ status: 'active' });
          if (productsRes.success && productsRes.data?.products) {
            const mappedProducts = productsRes.data.products.map(p => ({
              id: p._id || p.id,
              name: p.ownerId?.name || 'Farm',
              product: p.name || 'Product',
              stock: p.stockQuantity || 0,
              price: p.basePrice || 0,
              rating: p.avgRating || 4.5,
              location: p.location?.state || 'India',
              category: p.categoryId?.name || 'General'
            })).filter(p => p.stock > 0);
            setAvailableProducts(mappedProducts);
          }

          setApiConnected(true);
        }
      } catch (error) {
        console.error('Error initializing business data:', error);
        // Fallback to seed data
        setOrders(SEED_ORDERS);
        setFleet(SEED_FLEET);
        setInventory(SEED_INVENTORY);
        setAvailableProducts(SEED_PRODUCTS);
      } finally {
        setLoading(prev => ({ ...prev, data: false }));
      }
    };

    initializeBusinessData();
  }, []);

  // ── API fetch: products (marketplace) ───────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(l => ({ ...l, products: true }));
    try {
      const res = await productAPI.getAll({ available: true });
      const mapped = (res.products || res.data || res || []).map(p => ({
        id: p._id || p.id,
        name: p.farmer?.name || p.sellerName || 'Unknown Farm',
        product: p.name || p.productName,
        stock: p.stockQuantity || p.quantity || 0,
        price: p.price || 0,
        rating: p.avgRating || p.rating || 4.5,
        location: p.farmer?.address?.state || p.location || 'India',
        category: p.category?.name || p.category || 'General'
      })).filter(p => p.stock > 0);
      if (mapped.length > 0) {
        setAvailableProducts(mapped);
        setApiConnected(true);
      }
    } catch {
      // silently use seed data
    } finally {
      setLoading(l => ({ ...l, products: false }));
    }
  }, []);

  // ── API fetch: orders ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(l => ({ ...l, orders: true }));
    try {
      const res = await orderAPI.getAll({ type: 'business' });
      const list = res.orders || res.data || res || [];
      if (list.length > 0) {
        const mapped = list.map(o => ({
          id: o._id || o.id,
          product: o.items?.[0]?.product?.name || o.productName || 'Product',
          units: `${o.totalWeight || o.quantity || 0} kg`,
          supplier: o.seller?.name || o.supplierName || 'Supplier',
          amount: o.totalAmount || o.amount || 0,
          status: mapOrderStatus(o.status),
          date: (o.createdAt || o.date || '').slice(0, 10)
        }));
        setOrders(mapped);
        setApiConnected(true);
        // add delivery notifications
        const delivered = mapped.filter(o => o.status === 'Delivered');
        if (delivered.length) {
          setNotifications(prev => {
            const exists = prev.find(n => n.title === 'Orders Delivered from Backend');
            if (exists) return prev;
            return [
              { id: Date.now(), title: 'Orders Delivered from Backend', message: `${delivered.length} orders delivered`, time: 'just now', type: 'success', read: false },
              ...prev
            ];
          });
        }
      }
    } catch {
      // silently use localStorage seed
    } finally {
      setLoading(l => ({ ...l, orders: false }));
    }
  }, []);

  // ── API fetch: inventory ─────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(l => ({ ...l, inventory: true }));
    try {
      const res = await inventoryAPI.getAll();
      const list = res.inventory || res.data || res || [];
      if (list.length > 0) {
        const mapped = list.map(inv => ({
          id: inv._id || inv.id,
          product: inv.product?.name || inv.productName || 'Item',
          stock: `${inv.quantity || 0} ${inv.unit || 'units'}`,
          reorderLevel: `${inv.reorderLevel || 0} ${inv.unit || 'units'}`,
          status: inv.quantity <= inv.reorderLevel ? 'Low' : 'Good'
        }));
        setInventory(mapped);
        setApiConnected(true);
      }
    } catch {
      // use localStorage seed
    } finally {
      setLoading(l => ({ ...l, inventory: false }));
    }
  }, []);

  const mapOrderStatus = (s) => {
    const map = { pending: 'Pending Transport', confirmed: 'Pending Transport', processing: 'Processing', shipped: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled' };
    return map[s?.toLowerCase()] || s || 'Pending Transport';
  };

  // ── initial data load ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchInventory();
  }, [fetchProducts, fetchOrders, fetchInventory]);

  // ── snackbar helper ──────────────────────────────────────────────────────────
  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // ── cart operations ──────────────────────────────────────────────────────────
  const handleAddToCart = (farmer, orderQty) => {
    const qty = Number(orderQty);
    if (!qty || isNaN(qty) || qty <= 0) { showSnackbar('Please enter a valid quantity', 'error'); return; }
    if (qty > farmer.stock) { showSnackbar(`Only ${farmer.stock} kg available from ${farmer.name}`, 'error'); return; }
    setCart(prev => {
      const existing = prev.find(i => i.id === farmer.id && i.product === farmer.product);
      return existing
        ? prev.map(i => i.id === farmer.id && i.product === farmer.product ? { ...i, orderQty: i.orderQty + qty } : i)
        : [...prev, { ...farmer, orderQty: qty }];
    });
    showSnackbar(`Added ${qty} kg of ${farmer.product} from ${farmer.name}`, 'success');
  };

  const removeFromCart = (id, product) => setCart(prev => prev.filter(i => !(i.id === id && i.product === product)));

  const checkoutCart = async () => {
    if (!cart.length) return;
    const newOrders = cart.map((item, idx) => ({
      id: Date.now() + idx,
      product: item.product,
      units: `${item.orderQty} kg`,
      supplier: item.name,
      amount: item.price * item.orderQty,
      status: 'Pending Transport',
      date: new Date().toISOString().split('T')[0]
    }));

    // try API create
    for (const item of cart) {
      try {
        await orderAPI.create({
          sellerId: item.id,
          items: [{ productName: item.product, quantity: item.orderQty, price: item.price }],
          totalAmount: item.price * item.orderQty,
          type: 'business'
        });
      } catch { /* fallback to local */ }
    }

    setOrders(prev => [...newOrders, ...prev]);
    // add notification
    setNotifications(prev => [{
      id: Date.now(), title: 'New Order Placed',
      message: `${cart.length} item(s) added to waiting list for transport`,
      time: 'just now', type: 'success', read: false
    }, ...prev]);
    setCart([]);
    showSnackbar(`${newOrders.length} order(s) placed — awaiting transport assignment`, 'success');
    setActiveSection('orders');
  };

  // ── vehicle assignment ───────────────────────────────────────────────────────
  const handleAssignVehicle = (vehicle) => {
    const order = orders.find(o => o.id === assignDialog.orderId);
    if (!order) return;
    const required = parseInt(order.units.replace(/\D/g, '')) || 0;
    if (vehicle.capacity < required) {
      showSnackbar(`${vehicle.name} capacity (${vehicle.capacity} kg) < order weight (${required} kg)`, 'error');
      return;
    }
    setOrders(prev => prev.map(o => o.id === assignDialog.orderId ? { ...o, status: 'In Transit', assignedVehicle: vehicle.name } : o));
    setFleet(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: 'In Transit' } : v));
    setNotifications(prev => [{
      id: Date.now(), title: 'Vehicle Dispatched',
      message: `${vehicle.name} dispatched for "${order.product}" — ${order.units}`,
      time: 'just now', type: 'info', read: false
    }, ...prev]);
    setAssignDialog({ open: false, orderId: null });
    showSnackbar(`${vehicle.name} dispatched successfully!`, 'success');
  };

  // ── fleet management ─────────────────────────────────────────────────────────
  const handleAddVehicle = () => {
    const selected = VEHICLE_TYPES[newVehicle.typeIndex];
    if (!newVehicle.name.trim()) { showSnackbar('Enter vehicle registration / name', 'error'); return; }
    const v = {
      id: `v${Date.now()}`,
      name: newVehicle.name.trim(),
      capacity: selected.capacity,
      type: selected.type,
      plate: newVehicle.plate.trim(),
      status: 'Available'
    };
    setFleet(prev => [...prev, v]);
    setNewVehicle({ name: '', typeIndex: 0, plate: '' });
    setAddVehicleDialog(false);
    showSnackbar(`${v.name} added to fleet`, 'success');
  };

  const handleRemoveVehicle = (id) => {
    setFleet(prev => prev.filter(v => v.id !== id));
    showSnackbar('Vehicle removed from fleet', 'success');
  };

  const handleToggleVehicleStatus = (id) => {
    setFleet(prev => prev.map(v => v.id === id ? { ...v, status: v.status === 'Available' ? 'Maintenance' : 'Available' } : v));
  };

  // ── notifications ────────────────────────────────────────────────────────────
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showSnackbar('All notifications marked as read', 'success');
  };

  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  // ── marketplace filter ───────────────────────────────────────────────────────
  const filteredMarketplace = availableProducts
    .filter(p => !marketplaceSearch.product || p.product.toLowerCase().includes(marketplaceSearch.product.toLowerCase()))
    .sort((a, b) => b.stock - a.stock);

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart />, badge: stats.pendingTransport || null },
    { id: 'suppliers', label: 'Marketplace', icon: <Store />, badge: cart.length || null },
    { id: 'fleet', label: 'My Fleet', icon: <LocalShipping /> },
    { id: 'inventory', label: 'Inventory', icon: <Inventory /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: unreadCount || null },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> }
  ];

  const orderStatusColors = { 'Delivered': 'success', 'In Transit': 'info', 'Processing': 'secondary', 'Pending Transport': 'warning', 'Cancelled': 'error' };
  const stockStatusColors = { 'Good': 'success', 'Low': 'warning', 'Out': 'error' };
  const vehicleStatusColors = { 'Available': 'success', 'In Transit': 'info', 'Maintenance': 'warning' };

  const SidebarContent = () => (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
        <Business color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h5" fontWeight="bold" color="primary.main">FarmKart</Typography>
      </Stack>
      {apiConnected && (
        <Chip label="Live Data" color="success" size="small" sx={{ mb: 2 }} icon={<CheckCircle />} />
      )}
      <List>
        {menuItems.map(item => (
          <ListItemButton
            key={item.id}
            selected={activeSection === item.id}
            onClick={() => { setActiveSection(item.id); setDrawerOpen(false); }}
            sx={{ borderRadius: 2, mb: 1, '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '& .MuiListItemIcon-root': { color: 'white' } } }}
          >
            <ListItemIcon>
              {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 3 }} />
      <Paper sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>Quick Stats</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Active Suppliers</Typography>
            <Chip label={stats.activeSuppliers} size="small" color="primary" />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Waiting Transport</Typography>
            <Chip label={stats.pendingTransport} size="small" color="warning" />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Fleet Available</Typography>
            <Chip label={fleet.filter(v => v.status === 'Available').length} size="small" color="success" />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Mobile Drawer */}
      <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}>
        <SidebarContent />
      </Drawer>

      {/* Desktop Sidebar */}
      <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ position: 'sticky', top: 0, overflowY: 'auto', maxHeight: '100vh' }}>
          <SidebarContent />
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">{businessData.name}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Refresh data from server">
                <IconButton onClick={() => { fetchOrders(); fetchProducts(); fetchInventory(); }} color="default">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <IconButton color="primary" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={unreadCount} color="error"><Notifications /></Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>

            {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
            {activeSection === 'overview' && (
              <Box>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { label: 'Total Orders', value: metrics.totalOrders, color: 'primary', icon: <ShoppingCart sx={{ fontSize: 32 }} /> },
                    { label: 'Active Suppliers', value: metrics.activeSuppliers, color: 'success', icon: <Agriculture sx={{ fontSize: 32 }} /> },
                    { label: 'Total Spend', value: `₹${(metrics.monthlyPurchase / 1000).toFixed(0)}k`, color: 'warning', icon: <AttachMoney sx={{ fontSize: 32 }} /> },
                    { label: 'Avg Order Value', value: `₹${(metrics.avgOrderValue / 1000).toFixed(1)}k`, color: 'info', icon: <TrendingUp sx={{ fontSize: 32 }} /> }
                  ].map(s => (
                    <Grid item xs={12} sm={6} md={3} key={s.label}>
                      <Card sx={{ bgcolor: `${s.color}.lighter` }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                              <Typography variant="h4" fontWeight="bold" color={`${s.color}.main`}>{s.value}</Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: `${s.color}.main`, width: 56, height: 56 }}>{s.icon}</Avatar>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Recent Orders</Typography>
                        <Button variant="contained" startIcon={<Store />} onClick={() => setActiveSection('suppliers')}>
                          Go to Marketplace
                        </Button>
                      </Stack>
                      <Divider sx={{ my: 2 }} />
                      {loading.orders ? <CircularProgress size={24} /> : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell>Units</TableCell>
                                <TableCell>Supplier</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {orders.slice(0, 5).map(order => (
                                <TableRow key={order.id}>
                                  <TableCell><Typography fontWeight="600">{order.product}</Typography></TableCell>
                                  <TableCell>{order.units}</TableCell>
                                  <TableCell>{order.supplier}</TableCell>
                                  <TableCell><Typography fontWeight="bold" color="success.main">₹{order.amount}</Typography></TableCell>
                                  <TableCell><Chip label={order.status} color={orderStatusColors[order.status]} size="small" /></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Performance Metrics</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">On-Time Delivery</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.onTimeDelivery}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={stats.onTimeDelivery} sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Fleet Utilization</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {fleet.length ? Math.round((fleet.filter(v => v.status === 'In Transit').length / fleet.length) * 100) : 0}%
                            </Typography>
                          </Stack>
                          <LinearProgress variant="determinate"
                            value={fleet.length ? (fleet.filter(v => v.status === 'In Transit').length / fleet.length) * 100 : 0}
                            color="warning" sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Quick Actions</Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" fullWidth startIcon={<Store />} onClick={() => setActiveSection('suppliers')}>Go to Marketplace</Button>
                        <Button variant="outlined" fullWidth startIcon={<Inventory />} onClick={() => setActiveSection('inventory')}>Check Inventory</Button>
                        <Button variant="outlined" fullWidth startIcon={<LocalShipping />} onClick={() => setActiveSection('fleet')} color="warning">
                          Manage Fleet ({fleet.filter(v => v.status === 'Available').length} available)
                        </Button>
                      </Stack>
                    </Paper>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Fleet Summary</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={1}>
                        {fleet.slice(0, 4).map(v => (
                          <Stack key={v.id} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{v.name}</Typography>
                            <Chip label={v.status} color={vehicleStatusColors[v.status]} size="small" />
                          </Stack>
                        ))}
                        {fleet.length === 0 && <Typography variant="body2" color="text.secondary">No vehicles yet — add from Fleet section</Typography>}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── ORDERS ─────────────────────────────────────────────────────── */}
            {activeSection === 'orders' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Wholesale Orders</Typography>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={fetchOrders} disabled={loading.orders}>
                      {loading.orders ? 'Loading...' : 'Refresh'}
                    </Button>
                    <Button variant="contained" startIcon={<Store />} onClick={() => setActiveSection('suppliers')}>
                      Go to Marketplace
                    </Button>
                  </Stack>
                </Stack>
                <Paper sx={{ p: 3 }}>
                  {loading.orders ? (
                    <Stack alignItems="center" py={4}><CircularProgress /></Stack>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Order ID</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>Units</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orders.map(order => (
                            <TableRow key={order.id}>
                              <TableCell><Typography fontWeight="bold">#{typeof order.id === 'number' ? order.id : String(order.id).slice(-6)}</Typography></TableCell>
                              <TableCell>{order.product}</TableCell>
                              <TableCell>{order.units}</TableCell>
                              <TableCell>{order.supplier}</TableCell>
                              <TableCell><Typography fontWeight="bold" color="success.main">₹{order.amount?.toLocaleString()}</Typography></TableCell>
                              <TableCell>{order.date}</TableCell>
                              <TableCell>
                                <Chip
                                  label={order.status}
                                  color={orderStatusColors[order.status] || 'default'}
                                  size="small"
                                  icon={order.status === 'Delivered' ? <CheckCircle /> : order.status === 'In Transit' ? <LocalShipping /> : order.status === 'Pending Transport' ? <Schedule /> : <Cancel />}
                                />
                              </TableCell>
                              <TableCell>
                                {order.status === 'Pending Transport' && (
                                  <Button variant="outlined" size="small" startIcon={<LocalShipping />}
                                    onClick={() => setAssignDialog({ open: true, orderId: order.id })}>
                                    Assign Vehicle
                                  </Button>
                                )}
                                {order.assignedVehicle && order.status === 'In Transit' && (
                                  <Chip label={order.assignedVehicle} size="small" color="info" icon={<DirectionsCar />} />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {orders.length === 0 && (
                            <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={3}>No orders yet — visit the Marketplace to place orders</Typography></TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Box>
            )}

            {/* ── MARKETPLACE ─────────────────────────────────────────────── */}
            {activeSection === 'suppliers' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Marketplace</Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {loading.products && <CircularProgress size={20} />}
                    <Button variant="outlined" startIcon={<Refresh />} onClick={fetchProducts} size="small">Refresh Stock</Button>
                  </Stack>
                </Stack>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Search Products</Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                        <TextField
                          fullWidth label="Product Name" placeholder="e.g., Wheat, Rice..."
                          value={marketplaceSearch.product}
                          onChange={e => setMarketplaceSearch({ ...marketplaceSearch, product: e.target.value })}
                          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                        />
                        <TextField
                          fullWidth label="Required Quantity (kg)" type="number" placeholder="e.g., 500"
                          value={marketplaceSearch.quantity}
                          onChange={e => setMarketplaceSearch({ ...marketplaceSearch, quantity: e.target.value })}
                        />
                      </Stack>
                    </Paper>

                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4, mb: 2 }}>
                      Available Suppliers{marketplaceSearch.product && ` for "${marketplaceSearch.product}"`}
                      <Chip label={`${filteredMarketplace.length} results`} size="small" sx={{ ml: 1 }} />
                    </Typography>

                    <Stack spacing={2}>
                      {filteredMarketplace.map(item => (
                        <Card key={`${item.id}-${item.product}`} variant="outlined">
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={4}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar sx={{ bgcolor: 'success.main' }}><Agriculture /></Avatar>
                                  <Box>
                                    <Typography variant="h6" fontWeight="bold">{item.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{item.location}</Typography>
                                    <Chip label={item.category} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid item xs={6} sm={2}>
                                <Typography variant="caption" color="text.secondary" display="block">Product</Typography>
                                <Typography variant="body1" fontWeight="bold">{item.product}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={2}>
                                <Typography variant="caption" color="text.secondary" display="block">Available Stock</Typography>
                                <Typography variant="body1" fontWeight="bold"
                                  color={item.stock >= (Number(marketplaceSearch.quantity) || 0) ? 'success.main' : 'warning.main'}>
                                  {item.stock} kg
                                </Typography>
                                <Typography variant="caption" color="primary.main">₹{item.price}/kg</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <TextField
                                    size="small" type="number" label="Qty (kg)"
                                    id={`qty-${item.id}-${item.product}`}
                                    defaultValue={Math.min(item.stock, Number(marketplaceSearch.quantity) || item.stock)}
                                    inputProps={{ min: 1, max: item.stock }}
                                    sx={{ width: 90 }}
                                  />
                                  <Button
                                    variant="contained" startIcon={<AddShoppingCart />} sx={{ flexGrow: 1 }}
                                    onClick={() => {
                                      const qty = document.getElementById(`qty-${item.id}-${item.product}`)?.value;
                                      handleAddToCart(item, qty);
                                    }}
                                  >Add</Button>
                                </Stack>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                      {filteredMarketplace.length === 0 && (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                          <Typography color="text.secondary">No products match your search.</Typography>
                          <Button variant="outlined" sx={{ mt: 1 }} onClick={() => setMarketplaceSearch({ product: '', quantity: '' })}>Clear Filters</Button>
                        </Paper>
                      )}
                    </Stack>
                  </Grid>

                  {/* Cart panel */}
                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, position: 'sticky', top: 24 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Your Cart</Typography>
                        <Chip label={`${cart.length} items`} color="primary" size="small" />
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      {cart.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>Cart is empty</Typography>
                      ) : (
                        <Stack spacing={2} sx={{ mb: 3 }}>
                          {cart.map((item, idx) => (
                            <Box key={idx}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">{item.product}</Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">from {item.name}</Typography>
                                  <Typography variant="caption" display="block">{item.orderQty} kg @ ₹{item.price}/kg</Typography>
                                </Box>
                                <Stack alignItems="flex-end">
                                  <Typography variant="body2" fontWeight="bold" color="primary">₹{(item.price * item.orderQty).toLocaleString()}</Typography>
                                  <IconButton size="small" color="error" onClick={() => removeFromCart(item.id, item.product)}><RemoveShoppingCart fontSize="small" /></IconButton>
                                </Stack>
                              </Stack>
                              {idx !== cart.length - 1 && <Divider sx={{ my: 1 }} />}
                            </Box>
                          ))}
                        </Stack>
                      )}
                      <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="subtitle1" fontWeight="bold">Total</Typography>
                          <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                            ₹{cart.reduce((s, i) => s + i.price * i.orderQty, 0).toLocaleString()}
                          </Typography>
                        </Stack>
                      </Box>
                      <Button variant="contained" fullWidth size="large" disabled={!cart.length} onClick={checkoutCart}>
                        Place Order ({cart.length} items)
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── FLEET MANAGEMENT ────────────────────────────────────────── */}
            {activeSection === 'fleet' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    My Fleet
                    <Chip label={`${fleet.filter(v => v.status === 'Available').length} available`} size="small" color="success" sx={{ ml: 1 }} />
                  </Typography>
                  <Button variant="contained" startIcon={<AddCircle />} onClick={() => setAddVehicleDialog(true)}>
                    Add Vehicle
                  </Button>
                </Stack>

                {fleet.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <LocalShipping sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No vehicles in your fleet</Typography>
                    <Button variant="contained" sx={{ mt: 2 }} startIcon={<Add />} onClick={() => setAddVehicleDialog(true)}>Add Your First Vehicle</Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {fleet.map(vehicle => (
                      <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
                        <Card variant="outlined" sx={{ position: 'relative' }}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                              <Avatar sx={{ bgcolor: vehicle.status === 'Available' ? 'success.main' : vehicle.status === 'In Transit' ? 'info.main' : 'warning.main', width: 48, height: 48 }}>
                                <LocalShipping />
                              </Avatar>
                              <Chip label={vehicle.status} color={vehicleStatusColors[vehicle.status] || 'default'} size="small" />
                            </Stack>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>{vehicle.name}</Typography>
                            <Stack spacing={0.5}>
                              <Typography variant="body2" color="text.secondary">Type: {vehicle.type || 'Truck'}</Typography>
                              <Typography variant="body2" color="text.secondary">Capacity: <strong>{vehicle.capacity?.toLocaleString()} kg</strong></Typography>
                              {vehicle.plate && <Typography variant="body2" color="text.secondary">Plate: {vehicle.plate}</Typography>}
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                              <Button
                                size="small" variant="outlined" fullWidth
                                color={vehicle.status === 'Maintenance' ? 'success' : 'warning'}
                                onClick={() => handleToggleVehicleStatus(vehicle.id)}
                                disabled={vehicle.status === 'In Transit'}
                              >
                                {vehicle.status === 'Maintenance' ? 'Set Available' : 'Maintenance'}
                              </Button>
                              <IconButton color="error" size="small"
                                onClick={() => handleRemoveVehicle(vehicle.id)}
                                disabled={vehicle.status === 'In Transit'}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* ── INVENTORY ────────────────────────────────────────────────── */}
            {activeSection === 'inventory' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Inventory Management</Typography>
                  <Button variant="outlined" startIcon={<Refresh />} onClick={fetchInventory} disabled={loading.inventory}>
                    {loading.inventory ? 'Loading...' : 'Refresh'}
                  </Button>
                </Stack>
                {inventory.filter(i => i.status === 'Low').length > 0 && (
                  <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
                    {inventory.filter(i => i.status === 'Low').length} item(s) are below reorder level — consider placing orders.
                  </Alert>
                )}
                <Paper sx={{ p: 3 }}>
                  {loading.inventory ? <Stack alignItems="center" py={4}><CircularProgress /></Stack> : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Current Stock</TableCell>
                            <TableCell>Reorder Level</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inventory.map(item => (
                            <TableRow key={item.id} sx={{ bgcolor: item.status === 'Low' ? 'warning.lighter' : 'inherit' }}>
                              <TableCell><Typography fontWeight="600">{item.product}</Typography></TableCell>
                              <TableCell>{item.stock}</TableCell>
                              <TableCell>{item.reorderLevel}</TableCell>
                              <TableCell><Chip label={item.status} color={stockStatusColors[item.status]} size="small" /></TableCell>
                              <TableCell>
                                {item.status === 'Low' && (
                                  <Button size="small" variant="contained" color="warning" startIcon={<Store />}
                                    onClick={() => { setMarketplaceSearch({ product: item.product, quantity: '' }); setActiveSection('suppliers'); }}>
                                    Reorder
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Box>
            )}

            {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
            {activeSection === 'notifications' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Notifications
                    {unreadCount > 0 && <Chip label={`${unreadCount} unread`} color="error" size="small" sx={{ ml: 1 }} />}
                  </Typography>
                  {unreadCount > 0 && (
                    <Button variant="outlined" startIcon={<NotificationsActive />} onClick={markAllRead}>
                      Mark All as Read
                    </Button>
                  )}
                </Stack>
                <Paper sx={{ p: 3 }}>
                  {notifications.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={4}>No notifications</Typography>
                  ) : (
                    <Stack spacing={2}>
                      {notifications.map(n => (
                        <Card key={n.id} sx={{ bgcolor: n.read ? 'background.paper' : 'action.hover', cursor: n.read ? 'default' : 'pointer' }}
                          onClick={() => !n.read && markRead(n.id)}>
                          <CardContent>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                              <Avatar sx={{ bgcolor: n.type === 'error' ? 'error.main' : n.type === 'warning' ? 'warning.main' : n.type === 'success' ? 'success.main' : 'info.main', width: 40, height: 40 }}>
                                {n.type === 'error' ? <Cancel /> : n.type === 'warning' ? <Schedule /> : n.type === 'success' ? <CheckCircle /> : <Notifications />}
                              </Avatar>
                              <Box sx={{ flexGrow: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                  <Box>
                                    <Typography variant="subtitle1" fontWeight={n.read ? 'normal' : 'bold'}>{n.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                                  </Box>
                                  {!n.read && <Chip label="New" color="primary" size="small" />}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{n.time}</Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Box>
            )}

            {/* ── PROFILE ──────────────────────────────────────────────────── */}
            {activeSection === 'profile' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '3rem' }}>
                      <Business sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>{businessData.name}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{businessData.type}</Typography>
                    <Chip label="Verified Business" color="success" icon={<Verified />} sx={{ mb: 2 }} />
                    <Divider sx={{ my: 3 }} />
                    <Stack spacing={2}>
                      {[['Established', 'Active'], ['Total Orders', metrics.totalOrders], ['On-Time Delivery', `${metrics.onTimeDelivery}%`]].map(([k, v]) => (
                        <Stack key={k} direction="row" justifyContent="space-between">
                          <Typography variant="body2">{k}</Typography>
                          <Typography variant="body2" fontWeight="bold">{v}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Business Information</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={3}>
                      {[
                        { label: 'Business Name', value: businessData.name },
                        { label: 'Business Type', value: businessData.type },
                        { label: 'Owner Name', value: businessData.owner },
                        { label: 'GST Number', value: businessData.gst },
                        { label: 'Phone', value: businessData.phone },
                        { label: 'Email', value: businessData.email, type: 'email' }
                      ].map(field => (
                        <Grid item xs={12} sm={6} key={field.label}>
                          <TextField fullWidth label={field.label} defaultValue={field.value} type={field.type || 'text'} />
                        </Grid>
                      ))}
                      <Grid item xs={12}>
                        <TextField fullWidth label="Business Address" multiline rows={3} defaultValue={businessData.address} />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                          <Button variant="contained" size="large" onClick={() => showSnackbar('Profile updated successfully', 'success')}>Update Profile</Button>
                          <Button variant="outlined" size="large" onClick={() => showSnackbar('Change password feature coming soon', 'info')}>Change Password</Button>
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

      {/* ── Vehicle Assignment Dialog ─────────────────────────────────────────── */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, orderId: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Vehicle for Transport</DialogTitle>
        <DialogContent>
          {(() => {
            const order = orders.find(o => o.id === assignDialog.orderId);
            const required = order ? parseInt(order.units.replace(/\D/g, '')) || 0 : 0;
            return (
              <>
                {order && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Order: <strong>{order.product}</strong> — {order.units} (need ≥ {required} kg capacity)
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select an available vehicle with sufficient capacity.
                </Typography>
                <List>
                  {fleet.map(vehicle => {
                    const canCarry = vehicle.capacity >= required;
                    const isAvailable = vehicle.status === 'Available';
                    return (
                      <ListItem key={vehicle.id} sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1, opacity: (!canCarry || !isAvailable) ? 0.5 : 1 }}>
                        <ListItemIcon><LocalShipping color={isAvailable && canCarry ? 'primary' : 'disabled'} /></ListItemIcon>
                        <ListItemText
                          primary={vehicle.name}
                          secondary={`Capacity: ${vehicle.capacity?.toLocaleString()} kg | Status: ${vehicle.status}`}
                        />
                        <Button variant="contained" size="small" disabled={!canCarry || !isAvailable}
                          onClick={() => handleAssignVehicle(vehicle)}>
                          Dispatch
                        </Button>
                      </ListItem>
                    );
                  })}
                  {fleet.length === 0 && (
                    <Typography color="text.secondary" textAlign="center" py={2}>
                      No vehicles in fleet — <Button size="small" onClick={() => { setAssignDialog({ open: false, orderId: null }); setActiveSection('fleet'); }}>Add vehicles</Button>
                    </Typography>
                  )}
                </List>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, orderId: null })}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Vehicle Dialog ────────────────────────────────────────────────── */}
      <Dialog open={addVehicleDialog} onClose={() => setAddVehicleDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Vehicle to Fleet</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Vehicle Name / Registration"
              placeholder="e.g., Tata Ace MH-04-AB-1234"
              value={newVehicle.name}
              onChange={e => setNewVehicle({ ...newVehicle, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Vehicle Type & Capacity</InputLabel>
              <Select
                label="Vehicle Type & Capacity"
                value={newVehicle.typeIndex}
                onChange={e => setNewVehicle({ ...newVehicle, typeIndex: e.target.value })}
              >
                {VEHICLE_TYPES.map((vt, i) => (
                  <MenuItem key={i} value={i}>{vt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth label="License Plate (optional)"
              placeholder="MH-04-AB-1234"
              value={newVehicle.plate}
              onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddVehicleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddVehicle}>Add to Fleet</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ──────────────────────────────────────────────────────────── */}
      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BusinessDashboard;

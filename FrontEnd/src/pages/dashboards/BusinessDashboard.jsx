import { useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip,
  LinearProgress, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert
} from '@mui/material';
import {
  Business, ShoppingCart, TrendingUp, AccountCircle,
  Add, Notifications, Menu as MenuIcon, Dashboard, Inventory,
  LocalShipping, AttachMoney, CheckCircle,
  Schedule, Cancel, Verified, Agriculture
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';

const BusinessDashboard = () => {
  const [orders, setOrders] = useState([
    { id: 1, product: 'Wheat', units: '100 bags', supplier: 'Ramesh Farm', amount: 25000, status: 'Delivered', date: '2024-01-15' },
    { id: 2, product: 'Rice', units: '75 bags', supplier: 'Meera Farm', amount: 22500, status: 'In Transit', date: '2024-01-12' },
    { id: 3, product: 'Vegetables', units: '50 crates', supplier: 'Green Valley', amount: 15000, status: 'Processing', date: '2024-01-10' },
    { id: 4, product: 'Fruits', units: '30 crates', supplier: 'Fresh Farms', amount: 18000, status: 'Delivered', date: '2024-01-08' }
  ]);
  
  const [form, setForm] = useState({ product: '', units: '', supplier: '', category: 'Grains' });
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [businessData] = useState({
    name: 'FreshMart Wholesale',
    type: 'Retail Chain',
    address: 'Plot 45, Industrial Area, Phase 2, Mumbai, Maharashtra - 400001',
    owner: 'Vikram Mehta',
    phone: '+91 9876543210',
    email: 'vikram@freshmart.com',
    gst: 'GST123456789',
    established: '2018',
    stats: {
      totalOrders: 567,
      activeSuppliers: 23,
      monthlyPurchase: 450000,
      avgOrderValue: 18500,
      onTimeDelivery: 94,
      qualityRating: 4.6
    }
  });

  const [suppliers] = useState([
    { id: 1, name: 'Ramesh Farm', category: 'Grains', rating: 4.8, orders: 45, location: 'Gujarat' },
    { id: 2, name: 'Meera Farm', category: 'Grains', rating: 4.7, orders: 38, location: 'Punjab' },
    { id: 3, name: 'Green Valley', category: 'Vegetables', rating: 4.5, orders: 52, location: 'Maharashtra' },
    { id: 4, name: 'Fresh Farms', category: 'Fruits', rating: 4.9, orders: 41, location: 'Karnataka' }
  ]);

  const [inventory] = useState([
    { id: 1, product: 'Wheat', stock: '250 bags', reorderLevel: '100 bags', status: 'Good' },
    { id: 2, product: 'Rice', stock: '180 bags', reorderLevel: '100 bags', status: 'Good' },
    { id: 3, product: 'Vegetables', stock: '45 crates', reorderLevel: '50 crates', status: 'Low' },
    { id: 4, product: 'Fruits', stock: '30 crates', reorderLevel: '40 crates', status: 'Low' }
  ]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const placeOrder = (e) => {
    e.preventDefault();
    if (!form.product || !form.units || !form.supplier) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    setOrders((prev) => [...prev, { 
      id: Date.now(), 
      ...form, 
      date: new Date().toISOString().split('T')[0],
      status: 'Processing',
      amount: Math.floor(Math.random() * 30000) + 10000
    }]);
    setForm({ product: '', units: '', supplier: '', category: 'Grains' });
    setDialogOpen(false);
    showSnackbar('Wholesale order placed successfully!', 'success');
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart />, badge: orders.filter(o => o.status === 'Processing').length },
    { id: 'suppliers', label: 'Suppliers', icon: <Agriculture />, badge: businessData.stats.activeSuppliers },
    { id: 'inventory', label: 'Inventory', icon: <Inventory /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 4 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const orderStatusColors = {
    'Delivered': 'success',
    'In Transit': 'info',
    'Processing': 'warning',
    'Cancelled': 'error'
  };

  const stockStatusColors = {
    'Good': 'success',
    'Low': 'warning',
    'Out': 'error'
  };

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
            <Business color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary.main">
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
            <Business color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary.main">
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

          {/* Quick Stats */}
          <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Quick Stats
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Active Suppliers</Typography>
                <Chip label={businessData.stats.activeSuppliers} size="small" color="primary" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Processing</Typography>
                <Chip label={orders.filter(o => o.status === 'Processing').length} size="small" color="warning" />
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
              <Typography variant="caption" color="text.secondary">
                {businessData.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="primary" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={4} color="error">
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
            {/* Overview */}
            {activeSection === 'overview' && (
              <Box>
                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'primary.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                              {businessData.stats.totalOrders}
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
                    <Card sx={{ bgcolor: 'success.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Active Suppliers
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              {businessData.stats.activeSuppliers}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                            <Agriculture sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'warning.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Monthly Purchase
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              ₹{(businessData.stats.monthlyPurchase / 1000).toFixed(0)}k
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                            <AttachMoney sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'info.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Avg Order Value
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              ₹{(businessData.stats.avgOrderValue / 1000).toFixed(1)}k
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                            <TrendingUp sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Main Content Grid */}
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    {/* Recent Orders */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          Recent Orders
                        </Typography>
                        <Button 
                          variant="contained" 
                          startIcon={<Add />}
                          onClick={() => setDialogOpen(true)}
                        >
                          New Order
                        </Button>
                      </Stack>
                      <Divider sx={{ my: 2 }} />
                      <TableContainer>
                        <Table>
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
                            {orders.slice(0, 5).map((order) => (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <Typography fontWeight="600">{order.product}</Typography>
                                </TableCell>
                                <TableCell>{order.units}</TableCell>
                                <TableCell>{order.supplier}</TableCell>
                                <TableCell>
                                  <Typography fontWeight="bold" color="success.main">
                                    ₹{order.amount}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={order.status}
                                    color={orderStatusColors[order.status]}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>

                    {/* Performance Metrics */}
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Performance Metrics
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">On-Time Delivery</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {businessData.stats.onTimeDelivery}%
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={businessData.stats.onTimeDelivery}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Quality Rating</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {businessData.stats.qualityRating}/5.0
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(businessData.stats.qualityRating / 5) * 100}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    {/* Quick Actions */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quick Actions
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button 
                          variant="contained" 
                          fullWidth
                          startIcon={<Add />}
                          onClick={() => setDialogOpen(true)}
                        >
                          Place Order
                        </Button>
                        <Button 
                          variant="outlined" 
                          fullWidth
                          startIcon={<Agriculture />}
                          onClick={() => setActiveSection('suppliers')}
                        >
                          View Suppliers
                        </Button>
                        <Button 
                          variant="outlined" 
                          fullWidth
                          startIcon={<Inventory />}
                          onClick={() => setActiveSection('inventory')}
                        >
                          Check Inventory
                        </Button>
                      </Stack>
                    </Paper>

                    {/* Top Suppliers */}
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Top Suppliers
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        {suppliers.slice(0, 3).map((supplier) => (
                          <Card key={supplier.id} variant="outlined">
                            <CardContent sx={{ p: 2 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {supplier.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {supplier.category}
                                  </Typography>
                                </Box>
                                <Chip 
                                  label={supplier.rating}
                                  size="small"
                                  color="success"
                                />
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

            {/* Orders */}
            {activeSection === 'orders' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Wholesale Orders
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Add />}
                    onClick={() => setDialogOpen(true)}
                  >
                    Place New Order
                  </Button>
                </Stack>

                <Paper sx={{ p: 3 }}>
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
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Typography fontWeight="bold">#{order.id}</Typography>
                            </TableCell>
                            <TableCell>{order.product}</TableCell>
                            <TableCell>{order.units}</TableCell>
                            <TableCell>{order.supplier}</TableCell>
                            <TableCell>
                              <Typography fontWeight="bold" color="success.main">
                                ₹{order.amount}
                              </Typography>
                            </TableCell>
                            <TableCell>{order.date}</TableCell>
                            <TableCell>
                              <Chip 
                                label={order.status}
                                color={orderStatusColors[order.status]}
                                size="small"
                                icon={
                                  order.status === 'Delivered' ? <CheckCircle /> :
                                  order.status === 'In Transit' ? <LocalShipping /> :
                                  order.status === 'Processing' ? <Schedule /> :
                                  <Cancel />
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}

            {/* Suppliers */}
            {activeSection === 'suppliers' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Supplier Network
                </Typography>
                <Grid container spacing={3}>
                  {suppliers.map((supplier) => (
                    <Grid item xs={12} sm={6} md={4} key={supplier.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                              <Agriculture />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {supplier.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {supplier.category}
                              </Typography>
                            </Box>
                          </Stack>

                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Rating
                              </Typography>
                              <Chip 
                                label={`${supplier.rating}/5.0`}
                                size="small"
                                color="success"
                              />
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Total Orders
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {supplier.orders}
                              </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Location
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {supplier.location}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Button 
                            variant="outlined" 
                            fullWidth 
                            sx={{ mt: 2 }}
                            startIcon={<ShoppingCart />}
                          >
                            Place Order
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Inventory */}
            {activeSection === 'inventory' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Inventory Management
                </Typography>
                <Paper sx={{ p: 3 }}>
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
                        {inventory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Typography fontWeight="600">{item.product}</Typography>
                            </TableCell>
                            <TableCell>{item.stock}</TableCell>
                            <TableCell>{item.reorderLevel}</TableCell>
                            <TableCell>
                              <Chip 
                                label={item.status}
                                color={stockStatusColors[item.status]}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {item.status === 'Low' && (
                                <Button 
                                  size="small" 
                                  variant="contained"
                                  startIcon={<Add />}
                                  onClick={() => {
                                    setForm({ ...form, product: item.product });
                                    setDialogOpen(true);
                                  }}
                                >
                                  Reorder
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}

            {/* Notifications */}
            {activeSection === 'notifications' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Notifications
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                      <Stack spacing={2}>
                        {[
                          { id: 1, title: 'Order Delivered', message: 'Your order #4567 has been delivered', time: '30 minutes ago', type: 'success', read: false },
                          { id: 2, title: 'New Supplier Available', message: '5 new farmers have joined your area', time: '3 hours ago', type: 'info', read: false },
                          { id: 3, title: 'Price Alert', message: 'Wheat prices have increased by 5%', time: '5 hours ago', type: 'warning', read: false },
                          { id: 4, title: 'Order Confirmed', message: 'Your wholesale order has been confirmed', time: '1 day ago', type: 'success', read: true },
                        ].map((notification) => (
                          <Card key={notification.id} sx={{ bgcolor: notification.read ? 'background.paper' : 'action.hover' }}>
                            <CardContent>
                              <Stack direction="row" spacing={2} alignItems="flex-start">
                                <Avatar sx={{ 
                                  bgcolor: notification.type === 'error' ? 'error.main' : 
                                           notification.type === 'warning' ? 'warning.main' : 
                                           notification.type === 'success' ? 'success.main' : 'info.main',
                                  width: 40,
                                  height: 40
                                }}>
                                  {notification.type === 'error' ? <Cancel /> :
                                   notification.type === 'warning' ? <Schedule /> :
                                   notification.type === 'success' ? <CheckCircle /> :
                                   <Notifications />}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight={notification.read ? 'normal' : 'bold'}>
                                        {notification.title}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {notification.message}
                                      </Typography>
                                    </Box>
                                    {!notification.read && (
                                      <Chip label="New" color="primary" size="small" />
                                    )}
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {notification.time}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                      <Button fullWidth variant="outlined" sx={{ mt: 3 }} onClick={() => showSnackbar('All notifications marked as read', 'success')}>
                        Mark All as Read
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
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
                      <Business sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {businessData.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {businessData.type}
                    </Typography>
                    <Chip label="Verified Business" color="success" icon={<Verified />} sx={{ mb: 2 }} />
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Established</Typography>
                        <Typography variant="body2" fontWeight="bold">{businessData.established}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Orders</Typography>
                        <Typography variant="body2" fontWeight="bold">{businessData.stats.totalOrders}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Quality Rating</Typography>
                        <Chip label={`${businessData.stats.qualityRating}/5.0`} size="small" color="success" />
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Business Information
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Business Name" defaultValue={businessData.name} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Business Type" defaultValue={businessData.type} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Owner Name" defaultValue={businessData.owner} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="GST Number" defaultValue={businessData.gst} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" defaultValue={businessData.phone} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" type="email" defaultValue={businessData.email} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          label="Business Address" 
                          multiline 
                          rows={3} 
                          defaultValue={businessData.address} 
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

      {/* Order Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Place Wholesale Order</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={placeOrder} sx={{ mt: 2 }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Product Name"
                name="product"
                value={form.product}
                onChange={onChange}
                required
              />
              <TextField
                select
                fullWidth
                label="Category"
                name="category"
                value={form.category}
                onChange={onChange}
              >
                <MenuItem value="Grains">Grains</MenuItem>
                <MenuItem value="Vegetables">Vegetables</MenuItem>
                <MenuItem value="Fruits">Fruits</MenuItem>
                <MenuItem value="Dairy">Dairy</MenuItem>
                <MenuItem value="Organic">Organic</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Units"
                name="units"
                value={form.units}
                onChange={onChange}
                placeholder="e.g., 100 bags"
                required
              />
              <TextField
                fullWidth
                label="Preferred Supplier"
                name="supplier"
                value={form.supplier}
                onChange={onChange}
                placeholder="e.g., Ramesh Farm"
                required
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={placeOrder} variant="contained">
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BusinessDashboard;

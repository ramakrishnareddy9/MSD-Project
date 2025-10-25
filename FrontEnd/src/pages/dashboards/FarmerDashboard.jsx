import { useEffect, useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Chip, Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Stack, IconButton, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, Snackbar, Alert, LinearProgress
} from '@mui/material';
import {
  Agriculture, Inventory, TrendingUp, AccountCircle,
  Add, Delete, Visibility, Notifications, Menu as MenuIcon,
  LocalShipping, AttachMoney, CheckCircle, Cancel,
  Verified, Home, Store, Schedule, Business,
  ShoppingCart, LocationOn, DirectionsCar, CalendarMonth
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';

const FarmerDashboard = () => {
  const [cropForm, setCropForm] = useState({ 
    type: '', 
    landSize: '', 
    available: true, 
    price: '', 
    season: '',
    quantity: ''
  });
  const [crops, setCrops] = useState([
    { 
      id: 1, 
      type: 'Wheat', 
      landSize: '5', 
      available: true, 
      price: '25', 
      season: 'Rabi', 
      quantity: '500',
      planted: '2023-11-15', 
      harvest: '2024-04-15',
      status: 'Ready'
    },
    { 
      id: 2, 
      type: 'Rice', 
      landSize: '3', 
      available: true, 
      price: '30', 
      season: 'Kharif', 
      quantity: '300',
      planted: '2023-07-01', 
      harvest: '2023-11-30',
      status: 'Ready'
    },
    { 
      id: 3, 
      type: 'Tomatoes', 
      landSize: '2', 
      available: false, 
      price: '40', 
      season: 'Summer', 
      quantity: '200',
      planted: '2024-01-15', 
      harvest: '2024-05-15',
      status: 'Growing'
    },
    { 
      id: 4, 
      type: 'Organic Carrots', 
      landSize: '1.5', 
      available: true, 
      price: '45', 
      season: 'Winter', 
      quantity: '150',
      planted: '2023-12-01', 
      harvest: '2024-03-15',
      status: 'Ready'
    }
  ]);
  
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Shared LocalStorage keys with Transporter marketplace
  const LS_ROUTE_REQUESTS = 'farmkart_route_requests';
  const LS_ACCEPTED_ROUTES = 'farmkart_accepted_routes';
  const [myRouteRequests, setMyRouteRequests] = useState([]);
  const [routeRequestForm, setRouteRequestForm] = useState({
    from: 'Banaskantha, Gujarat',
    to: '',
    distance: '',
    cargo: '',
    date: '',
    payment: ''
  });
  
  // Route Booking State
  const [availableRoutes, setAvailableRoutes] = useState([
    { id: 1, from: 'Banaskantha, Gujarat', to: 'Mumbai, Maharashtra', distance: '520 km', price: 3500, transporter: 'Fast Logistics', date: '2024-01-20', status: 'Available' },
    { id: 2, from: 'Banaskantha, Gujarat', to: 'Delhi NCR', distance: '780 km', price: 5200, transporter: 'Green Transport', date: '2024-01-22', status: 'Available' },
    { id: 3, from: 'Banaskantha, Gujarat', to: 'Ahmedabad, Gujarat', distance: '150 km', price: 1200, transporter: 'Quick Move', date: '2024-01-18', status: 'Available' },
  ]);
  
  const [bookedRoutes, setBookedRoutes] = useState([
    { id: 1, from: 'Banaskantha, Gujarat', to: 'Pune, Maharashtra', distance: '650 km', price: 4200, transporter: 'Safe Cargo', date: '2024-01-15', status: 'Confirmed', bookingId: 'BK001' }
  ]);
  
  // Global Order Marketplace State
  const [globalOrders, setGlobalOrders] = useState([
    { id: 1, business: 'Fresh Mart Pvt Ltd', crop: 'Wheat', quantity: '500 kg', priceOffered: 28, location: 'Mumbai, Maharashtra', deadline: '2024-01-25', status: 'Open', type: 'Business' },
    { id: 2, business: 'Organic Foods Co.', crop: 'Rice', quantity: '300 kg', priceOffered: 35, location: 'Delhi NCR', deadline: '2024-01-28', status: 'Open', type: 'Business' },
    { id: 3, business: 'Green Grocers', crop: 'Tomatoes', quantity: '200 kg', priceOffered: 45, location: 'Ahmedabad, Gujarat', deadline: '2024-01-22', status: 'Open', type: 'Business' },
    { id: 4, business: 'Farm Direct Store', crop: 'Carrots', quantity: '150 kg', priceOffered: 50, location: 'Surat, Gujarat', deadline: '2024-01-30', status: 'Open', type: 'Retailer' },
  ]);
  
  const [myAcceptedOrders, setMyAcceptedOrders] = useState([
    { id: 1, business: 'Healthy Foods Ltd', crop: 'Wheat', quantity: '200 kg', priceOffered: 27, location: 'Pune, Maharashtra', deadline: '2024-01-20', status: 'Accepted', acceptedDate: '2024-01-10' }
  ]);
  
  const [farmerData] = useState({
    name: 'Ramesh Patel',
    farmName: 'Green Fields Farm',
    address: 'Village Khetpura, Tehsil Deesa, Banaskantha, Gujarat - 385535',
    phone: '+91 9876543210',
    email: 'ramesh.patel@greenfields.com',
    experience: '15 years',
    totalLand: '25 acres',
    organicCertified: true,
    stats: {
      totalCrops: 8,
      activeSales: 5,
      monthlyEarnings: 45000,
      customerRating: 4.7,
      totalOrders: 156,
      pendingOrders: 12
    }
  });

  const [orders] = useState([
    { id: 1, customer: 'John Doe', crop: 'Wheat', quantity: '50 kg', amount: 1250, status: 'Pending', date: '2024-01-15' },
    { id: 2, customer: 'Jane Smith', crop: 'Rice', quantity: '30 kg', amount: 900, status: 'Delivered', date: '2024-01-14' },
    { id: 3, customer: 'Mike Johnson', crop: 'Organic Carrots', quantity: '20 kg', amount: 900, status: 'Processing', date: '2024-01-13' },
    { id: 4, customer: 'Sarah Williams', crop: 'Wheat', quantity: '100 kg', amount: 2500, status: 'Delivered', date: '2024-01-12' }
  ]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCropForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addCrop = (e) => {
    e.preventDefault();
    if (!cropForm.type || !cropForm.landSize || !cropForm.price) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    setCrops((prev) => [
      ...prev,
      { 
        id: Date.now(), 
        ...cropForm, 
        planted: new Date().toISOString().split('T')[0],
        status: 'Growing'
      }
    ]);
    setCropForm({ type: '', landSize: '', available: true, price: '', season: '', quantity: '' });
    showSnackbar('Crop added successfully!', 'success');
  };

  const toggleAvailability = (id) => {
    setCrops((prev) => prev.map((c) => {
      if (c.id === id) {
        const newAvailable = !c.available;
        showSnackbar(
          `${c.type} is now ${newAvailable ? 'available' : 'unavailable'} for sale`,
          'info'
        );
        return { ...c, available: newAvailable };
      }
      return c;
    }));
  };

  const deleteCrop = (id) => {
    const crop = crops.find(c => c.id === id);
    setCrops((prev) => prev.filter((c) => c.id !== id));
    showSnackbar(`${crop.type} removed successfully`, 'info');
  };

  // Load my route requests and their acceptance status
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(LS_ROUTE_REQUESTS) || '[]');
      const accepted = JSON.parse(localStorage.getItem(LS_ACCEPTED_ROUTES) || '[]');
      const acceptedIds = new Set(accepted.map(r => r.requestId));
      const mine = all.filter(r => r.requester?.startsWith(farmerData.name));
      const withStatus = mine.map(r => ({ ...r, status: acceptedIds.has(r.id) ? 'Accepted' : 'Open' }));
      setMyRouteRequests(withStatus);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_ROUTE_REQUESTS || e.key === LS_ACCEPTED_ROUTES) {
        try {
          const all = JSON.parse(localStorage.getItem(LS_ROUTE_REQUESTS) || '[]');
          const accepted = JSON.parse(localStorage.getItem(LS_ACCEPTED_ROUTES) || '[]');
          const acceptedIds = new Set(accepted.map(r => r.requestId));
          const mine = all.filter(r => r.requester?.startsWith(farmerData.name));
          const withStatus = mine.map(r => ({ ...r, status: acceptedIds.has(r.id) ? 'Accepted' : 'Open' }));
          setMyRouteRequests(withStatus);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [farmerData.name]);

  // Refresh when opening the Routes tab
  useEffect(() => {
    if (activeSection === 'routes') {
      try {
        const all = JSON.parse(localStorage.getItem(LS_ROUTE_REQUESTS) || '[]');
        const accepted = JSON.parse(localStorage.getItem(LS_ACCEPTED_ROUTES) || '[]');
        const acceptedIds = new Set(accepted.map(r => r.requestId));
        const mine = all.filter(r => r.requester?.startsWith(farmerData.name));
        const withStatus = mine.map(r => ({ ...r, status: acceptedIds.has(r.id) ? 'Accepted' : 'Open' }));
        setMyRouteRequests(withStatus);
      } catch (_) {}
    }
  }, [activeSection, farmerData.name]);

  const postTransportRequest = (e) => {
    e.preventDefault();
    const { from, to, distance, cargo, date, payment } = routeRequestForm;
    if (!from || !to || !cargo || !date || !payment) {
      showSnackbar('Please fill all required fields for transport request', 'error');
      return;
    }
    const req = {
      id: Date.now(),
      requester: `${farmerData.name} (Farmer)`,
      from,
      to,
      distance: distance || 'TBD',
      cargo,
      date,
      payment: parseInt(payment, 10) || 0,
      type: 'Farmer',
      status: 'Open'
    };
    try {
      const existing = JSON.parse(localStorage.getItem(LS_ROUTE_REQUESTS) || '[]');
      const updated = [req, ...existing];
      localStorage.setItem(LS_ROUTE_REQUESTS, JSON.stringify(updated));
      const accepted = JSON.parse(localStorage.getItem(LS_ACCEPTED_ROUTES) || '[]');
      const acceptedIds = new Set(accepted.map(r => r.requestId));
      setMyRouteRequests([{ ...req, status: acceptedIds.has(req.id) ? 'Accepted' : 'Open' }, ...myRouteRequests]);
      setRouteRequestForm({ from: 'Banaskantha, Gujarat', to: '', distance: '', cargo: '', date: '', payment: '' });
      showSnackbar('Transport request posted to marketplace!', 'success');
    } catch (_) {
      showSnackbar('Failed to post request', 'error');
    }
  };

  const cancelRouteRequest = (id) => {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_ROUTE_REQUESTS) || '[]');
      const filtered = existing.filter(r => r.id !== id);
      localStorage.setItem(LS_ROUTE_REQUESTS, JSON.stringify(filtered));
      setMyRouteRequests(myRouteRequests.filter(r => r.id !== id));
      showSnackbar('Request cancelled', 'info');
    } catch (_) {
      showSnackbar('Failed to cancel request', 'error');
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'crops', label: 'My Crops', icon: <Agriculture />, badge: crops.length },
    { id: 'orders', label: 'Orders', icon: <Store />, badge: farmerData.stats.pendingOrders },
    { id: 'routes', label: 'Book Routes', icon: <DirectionsCar />, badge: availableRoutes.length },
    { id: 'marketplace', label: 'Order Marketplace', icon: <ShoppingCart />, badge: globalOrders.filter(o => o.status === 'Open').length },
    { id: 'inventory', label: 'Inventory', icon: <Inventory /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 3 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const seasonColors = {
    'Rabi': 'info',
    'Kharif': 'success',
    'Summer': 'warning',
    'Winter': 'primary'
  };

  const statusColors = {
    'Ready': 'success',
    'Growing': 'info',
    'Harvested': 'default'
  };

  const orderStatusColors = {
    'Pending': 'warning',
    'Processing': 'info',
    'Delivered': 'success',
    'Cancelled': 'error'
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
            <Agriculture color="success" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="success.main">
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
                    bgcolor: 'success.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'success.dark' },
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
            <Agriculture color="success" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="success.main">
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
                    bgcolor: 'success.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'success.dark' },
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

          {/* Farm Stats Card */}
          <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Farm Stats
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Total Land</Typography>
                <Typography variant="body2" fontWeight="bold">{farmerData.totalLand}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Active Crops</Typography>
                <Chip label={crops.filter(c => c.available).length} size="small" color="success" />
              </Stack>
              {farmerData.organicCertified && (
                <Chip 
                  icon={<Verified />} 
                  label="Organic Certified" 
                  size="small" 
                  color="success"
                  sx={{ mt: 1 }}
                />
              )}
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
                {farmerData.farmName}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="success" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={3} color="error">
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
                    <Card sx={{ bgcolor: 'success.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Crops
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              {farmerData.stats.totalCrops}
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
                    <Card sx={{ bgcolor: 'info.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Active Sales
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              {farmerData.stats.activeSales}
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
                    <Card sx={{ bgcolor: 'warning.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Monthly Earnings
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              ₹{(farmerData.stats.monthlyEarnings / 1000).toFixed(1)}k
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
                    <Card sx={{ bgcolor: 'error.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Pending Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="error.main">
                              {farmerData.stats.pendingOrders}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                            <LocalShipping sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Recent Activity */}
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Recent Orders
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Customer</TableCell>
                              <TableCell>Crop</TableCell>
                              <TableCell>Quantity</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orders.slice(0, 4).map((order) => (
                              <TableRow key={order.id}>
                                <TableCell>{order.customer}</TableCell>
                                <TableCell>{order.crop}</TableCell>
                                <TableCell>{order.quantity}</TableCell>
                                <TableCell fontWeight="bold">₹{order.amount}</TableCell>
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
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quick Actions
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button 
                          variant="contained" 
                          fullWidth
                          startIcon={<Add />}
                          onClick={() => showSnackbar('Add crop feature coming soon', 'info')}
                        >
                          Add New Crop
                        </Button>
                        <Button 
                          variant="outlined" 
                          fullWidth
                          startIcon={<Visibility />}
                          onClick={() => setActiveSection('orders')}
                        >
                          View All Orders
                        </Button>
                        <Button 
                          variant="outlined" 
                          fullWidth
                          startIcon={<Inventory />}
                          onClick={() => setActiveSection('inventory')}
                        >
                          Manage Inventory
                        </Button>
                      </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Performance
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Customer Rating</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {farmerData.stats.customerRating}/5.0
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(farmerData.stats.customerRating / 5) * 100}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Order Fulfillment</Typography>
                            <Typography variant="body2" fontWeight="bold">92%</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={92}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* My Crops */}
            {activeSection === 'crops' && (
              <Box>
                {/* Add Crop Form */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Add New Crop
                  </Typography>
                  <Box component="form" onSubmit={addCrop}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Crop Type"
                          name="type"
                          value={cropForm.type}
                          onChange={onChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Land Size (acres)"
                          name="landSize"
                          type="number"
                          value={cropForm.landSize}
                          onChange={onChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Price (₹/kg)"
                          name="price"
                          type="number"
                          value={cropForm.price}
                          onChange={onChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Quantity (kg)"
                          name="quantity"
                          type="number"
                          value={cropForm.quantity}
                          onChange={onChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          select
                          fullWidth
                          label="Season"
                          name="season"
                          value={cropForm.season}
                          onChange={onChange}
                        >
                          <MenuItem value="Rabi">Rabi</MenuItem>
                          <MenuItem value="Kharif">Kharif</MenuItem>
                          <MenuItem value="Summer">Summer</MenuItem>
                          <MenuItem value="Winter">Winter</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={1}>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          fullWidth
                          sx={{ height: 56 }}
                        >
                          <Add />
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* Crops Grid */}
                <Grid container spacing={3}>
                  {crops.map((crop) => (
                    <Grid item xs={12} sm={6} md={4} key={crop.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {crop.type}
                              </Typography>
                              <Chip 
                                label={crop.season} 
                                color={seasonColors[crop.season]}
                                size="small"
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                            <Chip 
                              label={crop.status}
                              color={statusColors[crop.status]}
                              size="small"
                            />
                          </Stack>

                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Land Size
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {crop.landSize} acres
                              </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Price
                              </Typography>
                              <Typography variant="body2" fontWeight="600" color="success.main">
                                ₹{crop.price}/kg
                              </Typography>
                            </Stack>
                            {crop.quantity && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Quantity
                                </Typography>
                                <Typography variant="body2" fontWeight="600">
                                  {crop.quantity} kg
                                </Typography>
                              </Stack>
                            )}
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Planted
                              </Typography>
                              <Typography variant="body2">
                                {crop.planted}
                              </Typography>
                            </Stack>
                            {crop.harvest && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Harvest
                                </Typography>
                                <Typography variant="body2">
                                  {crop.harvest}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>

                          <Divider sx={{ my: 2 }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">Available</Typography>
                              <Switch 
                                checked={crop.available}
                                onChange={() => toggleAvailability(crop.id)}
                                color="success"
                              />
                            </Stack>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => deleteCrop(crop.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Orders */}
            {activeSection === 'orders' && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  All Orders
                </Typography>
                <Divider sx={{ my: 2 }} />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Crop</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>#{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.crop}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
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
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="primary">
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Route Booking */}
            {activeSection === 'routes' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Transportation Route Booking
                </Typography>
                
                {/* Post Transport Request (goes to Transporter marketplace) */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Post Transport Request
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box component="form" onSubmit={postTransportRequest}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="From"
                          value={routeRequestForm.from}
                          onChange={(e) => setRouteRequestForm({ ...routeRequestForm, from: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="To"
                          value={routeRequestForm.to}
                          onChange={(e) => setRouteRequestForm({ ...routeRequestForm, to: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Distance (km)"
                          value={routeRequestForm.distance}
                          onChange={(e) => setRouteRequestForm({ ...routeRequestForm, distance: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Payment (₹)"
                          type="number"
                          value={routeRequestForm.payment}
                          onChange={(e) => setRouteRequestForm({ ...routeRequestForm, payment: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          label="Cargo Details"
                          value={routeRequestForm.cargo}
                          onChange={(e) => setRouteRequestForm({ ...routeRequestForm, cargo: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Date"
                          InputLabelProps={{ shrink: true }}
                          value={routeRequestForm.date}
                          onChange={(e) => setRouteRequestForm({ ...routeRequestForm, date: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button type="submit" variant="contained" fullWidth sx={{ height: 56 }}>
                          Post Request
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* My Posted Route Requests */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight="bold">
                      My Route Requests
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => {
                      try {
                        const all = JSON.parse(localStorage.getItem(LS_ROUTE_REQUESTS) || '[]');
                        const accepted = JSON.parse(localStorage.getItem(LS_ACCEPTED_ROUTES) || '[]');
                        const acceptedIds = new Set(accepted.map(r => r.requestId));
                        const mine = all.filter(r => r.requester?.startsWith(farmerData.name));
                        const withStatus = mine.map(r => ({ ...r, status: acceptedIds.has(r.id) ? 'Accepted' : 'Open' }));
                        setMyRouteRequests(withStatus);
                        showSnackbar('Status refreshed', 'success');
                      } catch (_) {
                        showSnackbar('Failed to refresh', 'error');
                      }
                    }}>Refresh</Button>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  {myRouteRequests.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No requests posted yet</Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {myRouteRequests.map((req) => (
                        <Grid item xs={12} key={req.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">From</Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                      {req.from}
                                    </Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">To</Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                      {req.to}
                                    </Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <DirectionsCar fontSize="small" color="action" />
                                    <Typography variant="body2">{req.distance}</Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                    <CalendarMonth fontSize="small" color="action" />
                                    <Typography variant="body2">{req.date}</Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <Stack spacing={0.5} alignItems="flex-end">
                                    <Chip label={req.status} color={req.status === 'Accepted' ? 'success' : 'warning'} />
                                    <Typography variant="body1" fontWeight="bold" color="success.main">₹{req.payment}</Typography>
                                  </Stack>
                                </Grid>
                              </Grid>
                              {req.status !== 'Accepted' && (
                                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                                  <Button variant="outlined" color="error" onClick={() => cancelRouteRequest(req.id)}>
                                    Cancel Request
                                  </Button>
                                </Stack>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Paper>
                
                {/* Booked Routes */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    My Booked Routes
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {bookedRoutes.length > 0 ? (
                    <Grid container spacing={2}>
                      {bookedRoutes.map((route) => (
                        <Grid item xs={12} key={route.id}>
                          <Card sx={{ bgcolor: 'success.lighter' }}>
                            <CardContent>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={3}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">From</Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                      {route.from}
                                    </Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">To</Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                      {route.to}
                                    </Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">Distance</Typography>
                                    <Typography variant="body2" fontWeight="600">{route.distance}</Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">Price</Typography>
                                    <Typography variant="body1" fontWeight="bold" color="success.main">₹{route.price}</Typography>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <Chip label={route.status} color="success" />
                                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>ID: {route.bookingId}</Typography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                      No booked routes yet
                    </Typography>
                  )}
                </Paper>
                
                {/* Available Routes */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Available Routes
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={3}>
                    {availableRoutes.map((route) => (
                      <Grid item xs={12} md={6} key={route.id}>
                        <Card variant="outlined" sx={{ '&:hover': { boxShadow: 3 } }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                                    {route.transporter}
                                  </Typography>
                                  <Chip label={route.status} color="success" size="small" sx={{ mt: 0.5 }} />
                                </Box>
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                  ₹{route.price}
                                </Typography>
                              </Stack>
                              
                              <Stack spacing={1.5}>
                                <Stack direction="row" spacing={1}>
                                  <LocationOn color="action" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">From</Typography>
                                    <Typography variant="body2" fontWeight="600">{route.from}</Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" spacing={1}>
                                  <LocationOn color="success" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">To</Typography>
                                    <Typography variant="body2" fontWeight="600">{route.to}</Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <DirectionsCar fontSize="small" color="action" />
                                    <Typography variant="body2">{route.distance}</Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <CalendarMonth fontSize="small" color="action" />
                                    <Typography variant="body2">{route.date}</Typography>
                                  </Stack>
                                </Stack>
                              </Stack>
                              
                              <Button 
                                variant="contained" 
                                fullWidth
                                onClick={() => {
                                  setBookedRoutes([...bookedRoutes, { ...route, status: 'Confirmed', bookingId: `BK${Date.now().toString().slice(-3)}` }]);
                                  setAvailableRoutes(availableRoutes.filter(r => r.id !== route.id));
                                  showSnackbar(`Route booked successfully! Booking ID: BK${Date.now().toString().slice(-3)}`, 'success');
                                }}
                              >
                                Book This Route
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            )}
            
            {/* Order Marketplace */}
            {activeSection === 'marketplace' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Global Order Marketplace
                </Typography>
                
                {/* My Accepted Orders */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    My Accepted Orders
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {myAcceptedOrders.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Business</TableCell>
                            <TableCell>Crop</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Price/kg</TableCell>
                            <TableCell>Total</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Deadline</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {myAcceptedOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Business fontSize="small" color="primary" />
                                  <Typography variant="body2" fontWeight="600">{order.business}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>{order.crop}</TableCell>
                              <TableCell>{order.quantity}</TableCell>
                              <TableCell>₹{order.priceOffered}</TableCell>
                              <TableCell>
                                <Typography fontWeight="bold" color="success.main">
                                  ₹{order.priceOffered * parseInt(order.quantity)}
                                </Typography>
                              </TableCell>
                              <TableCell>{order.location}</TableCell>
                              <TableCell>{order.deadline}</TableCell>
                              <TableCell>
                                <Chip label={order.status} color="success" size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                      No accepted orders yet. Browse available orders below.
                    </Typography>
                  )}
                </Paper>
                
                {/* Available Global Orders */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Available Orders from Businesses
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={3}>
                    {globalOrders.map((order) => (
                      <Grid item xs={12} md={6} lg={4} key={order.id}>
                        <Card variant="outlined" sx={{ height: '100%', '&:hover': { boxShadow: 3 } }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Business color="primary" />
                                    <Typography variant="h6" fontWeight="bold">
                                      {order.business}
                                    </Typography>
                                  </Stack>
                                  <Chip label={order.type} size="small" color="info" />
                                </Box>
                                <Chip label={order.status} color="warning" size="small" />
                              </Stack>
                              
                              <Divider />
                              
                              <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Crop Required</Typography>
                                  <Typography variant="body2" fontWeight="bold">{order.crop}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Quantity</Typography>
                                  <Typography variant="body2" fontWeight="bold">{order.quantity}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Price Offered</Typography>
                                  <Typography variant="body1" fontWeight="bold" color="success.main">
                                    ₹{order.priceOffered}/kg
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Total Value</Typography>
                                  <Typography variant="h6" fontWeight="bold" color="success.main">
                                    ₹{order.priceOffered * parseInt(order.quantity)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Location</Typography>
                                  <Typography variant="body2">
                                    <LocationOn fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                    {order.location}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Deadline</Typography>
                                  <Typography variant="body2" color="error.main" fontWeight="600">
                                    {order.deadline}
                                  </Typography>
                                </Stack>
                              </Stack>
                              
                              <Button 
                                variant="contained" 
                                fullWidth
                                startIcon={<CheckCircle />}
                                onClick={() => {
                                  setMyAcceptedOrders([...myAcceptedOrders, { ...order, status: 'Accepted', acceptedDate: new Date().toISOString().split('T')[0] }]);
                                  setGlobalOrders(globalOrders.filter(o => o.id !== order.id));
                                  showSnackbar(`Order accepted! You will supply ${order.quantity} of ${order.crop} to ${order.business}`, 'success');
                                }}
                              >
                                Accept Order
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            )}

            {/* Inventory */}
            {activeSection === 'inventory' && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Inventory Management
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={3}>
                  {crops.filter(c => c.available).map((crop) => (
                    <Grid item xs={12} sm={6} md={4} key={crop.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {crop.type}
                          </Typography>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2">Available Stock</Typography>
                              <Chip label={`${crop.quantity || 0} kg`} size="small" color="success" />
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2">Price per kg</Typography>
                              <Typography variant="body2" fontWeight="bold">₹{crop.price}</Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((parseInt(crop.quantity) / 500) * 100, 100)}
                              sx={{ mt: 1, height: 8, borderRadius: 1 }}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
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
                          { id: 1, title: 'New Order Received', message: 'You have a new order for 50kg of wheat', time: '10 minutes ago', type: 'success', read: false },
                          { id: 2, title: 'Payment Received', message: 'Payment of ₹2,500 has been credited', time: '2 hours ago', type: 'success', read: false },
                          { id: 3, title: 'Crop Update Reminder', message: 'Update your crop inventory for better visibility', time: '1 day ago', type: 'warning', read: true },
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
                                      <Chip label="New" color="success" size="small" />
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
                        bgcolor: 'success.main',
                        fontSize: '3rem'
                      }}
                    >
                      <Agriculture sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {farmerData.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {farmerData.farmName}
                    </Typography>
                    {farmerData.organicCertified && (
                      <Chip 
                        icon={<Verified />} 
                        label="Organic Certified" 
                        color="success" 
                        sx={{ mb: 2 }}
                      />
                    )}
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Experience</Typography>
                        <Typography variant="body2" fontWeight="bold">{farmerData.experience}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Land</Typography>
                        <Typography variant="body2" fontWeight="bold">{farmerData.totalLand}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Orders</Typography>
                        <Typography variant="body2" fontWeight="bold">{farmerData.stats.totalOrders}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Rating</Typography>
                        <Chip label={`${farmerData.stats.customerRating}/5.0`} size="small" color="success" />
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Farm Information
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Farmer Name" defaultValue={farmerData.name} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Farm Name" defaultValue={farmerData.farmName} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" defaultValue={farmerData.phone} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" type="email" defaultValue={farmerData.email} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          label="Address" 
                          multiline 
                          rows={3} 
                          defaultValue={farmerData.address} 
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Total Land (acres)" defaultValue={farmerData.totalLand} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Experience" defaultValue={farmerData.experience} />
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

export default FarmerDashboard;

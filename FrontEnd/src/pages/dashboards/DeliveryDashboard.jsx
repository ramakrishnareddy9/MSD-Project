import { useEffect, useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Switch,
  LinearProgress, Snackbar, Alert, MenuItem
} from '@mui/material';
import {
  LocalShipping, Route, AccountCircle,
  Add, Delete, Notifications, Menu as MenuIcon, Dashboard,
  CheckCircle, Schedule, Cancel, LocationOn, Speed, AttachMoney,
  DirectionsCar, Home, ShoppingCart, Business,
  Agriculture, CalendarMonth
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';

const DeliveryDashboard = () => {
  const [form, setForm] = useState({ 
    vehicle: '', 
    vehicleType: 'Truck',
    capacity: '',
    costPerKm: '', 
    available: true, 
    pickup: '', 
    drop: '' 
  });
  const [slots, setSlots] = useState([
    { 
      id: 1, 
      vehicle: 'MH-12-AB-1234', 
      vehicleType: 'Truck',
      capacity: '5 tons',
      costPerKm: '15', 
      available: true, 
      pickup: 'Mumbai', 
      drop: 'Pune',
      distance: '150 km',
      status: 'Available'
    },
    { 
      id: 2, 
      vehicle: 'MH-14-CD-5678', 
      vehicleType: 'Van',
      capacity: '2 tons',
      costPerKm: '12', 
      available: false, 
      pickup: 'Delhi', 
      drop: 'Jaipur',
      distance: '280 km',
      status: 'In Transit'
    },
    { 
      id: 3, 
      vehicle: 'GJ-01-EF-9012', 
      vehicleType: 'Mini Truck',
      capacity: '1 ton',
      costPerKm: '10', 
      available: true, 
      pickup: 'Ahmedabad', 
      drop: 'Surat',
      distance: '265 km',
      status: 'Available'
    }
  ]);
  
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Route Marketplace State
  const LS_ROUTE_REQUESTS = 'farmkart_route_requests';
  const LS_ACCEPTED_ROUTES = 'farmkart_accepted_routes';
  const [availableRouteRequests, setAvailableRouteRequests] = useState([
    { id: 1, requester: 'Ramesh Patel (Farmer)', from: 'Banaskantha, Gujarat', to: 'Mumbai, Maharashtra', distance: '520 km', cargo: 'Wheat - 500 kg', date: '2024-01-25', payment: 3500, type: 'Farmer', status: 'Open' },
    { id: 2, requester: 'Fresh Mart Pvt Ltd (Business)', from: 'Ahmedabad, Gujarat', to: 'Delhi NCR', distance: '780 km', cargo: 'Mixed Vegetables - 800 kg', date: '2024-01-28', payment: 5200, type: 'Business', status: 'Open' },
    { id: 3, requester: 'Meera Sharma (Farmer)', from: 'Pune, Maharashtra', to: 'Bangalore, Karnataka', distance: '850 km', cargo: 'Rice - 600 kg', date: '2024-01-22', payment: 6000, type: 'Farmer', status: 'Open' },
    { id: 4, requester: 'Organic Foods Co. (Business)', from: 'Surat, Gujarat', to: 'Kolkata, West Bengal', distance: '1850 km', cargo: 'Organic Produce - 1000 kg', date: '2024-01-30', payment: 12000, type: 'Business', status: 'Open' },
  ]);
  
  const [acceptedRoutes, setAcceptedRoutes] = useState([
    { id: 1, requester: 'Suresh Kumar (Farmer)', from: 'Haryana', to: 'Mumbai, Maharashtra', distance: '1400 km', cargo: 'Dairy Products - 400 kg', date: '2024-01-20', payment: 9500, type: 'Farmer', status: 'Accepted', acceptedDate: '2024-01-15', jobId: 'TR001' }
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedRequests = localStorage.getItem(LS_ROUTE_REQUESTS);
      if (savedRequests) {
        const parsed = JSON.parse(savedRequests);
        if (Array.isArray(parsed)) setAvailableRouteRequests(parsed);
      }
      const savedAccepted = localStorage.getItem(LS_ACCEPTED_ROUTES);
      if (savedAccepted) {
        const parsed = JSON.parse(savedAccepted);
        if (Array.isArray(parsed)) setAcceptedRoutes(parsed);
      }
    } catch (_) {}
  }, []);

  // Persist when lists change
  useEffect(() => {
    try { localStorage.setItem(LS_ROUTE_REQUESTS, JSON.stringify(availableRouteRequests)); } catch (_) {}
  }, [availableRouteRequests]);

  useEffect(() => {
    try { localStorage.setItem(LS_ACCEPTED_ROUTES, JSON.stringify(acceptedRoutes)); } catch (_) {}
  }, [acceptedRoutes]);

  const [transporterData] = useState({
    name: 'Express Logistics',
    ownerName: 'Rajesh Kumar',
    phone: '+91 9876543210',
    email: 'rajesh@expresslogistics.com',
    license: 'DL-1420110012345',
    experience: '10 years',
    stats: {
      totalDeliveries: 1234,
      activeRoutes: 5,
      monthlyEarnings: 85000,
      rating: 4.8,
      onTimeDelivery: 96,
      totalDistance: 45000
    }
  });

  const [deliveries] = useState([
    { id: 1, orderId: 'ORD-001', from: 'Mumbai', to: 'Pune', distance: '150 km', amount: 2250, status: 'In Transit', date: '2024-01-20', customer: 'John Doe' },
    { id: 2, orderId: 'ORD-002', from: 'Delhi', to: 'Jaipur', distance: '280 km', amount: 3360, status: 'Delivered', date: '2024-01-19', customer: 'Jane Smith' },
    { id: 3, orderId: 'ORD-003', from: 'Ahmedabad', to: 'Surat', distance: '265 km', amount: 2650, status: 'Pending', date: '2024-01-18', customer: 'Mike Johnson' },
    { id: 4, orderId: 'ORD-004', from: 'Bangalore', to: 'Chennai', distance: '350 km', amount: 5250, status: 'In Transit', date: '2024-01-17', customer: 'Sarah Williams' }
  ]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addSlot = (e) => {
    e.preventDefault();
    if (!form.vehicle || !form.costPerKm || !form.pickup || !form.drop || !form.capacity) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    setSlots((prev) => [
      ...prev,
      { 
        id: Date.now(), 
        ...form,
        distance: 'TBD',
        status: form.available ? 'Available' : 'Unavailable'
      }
    ]);
    setForm({ vehicle: '', vehicleType: 'Truck', capacity: '', costPerKm: '', available: true, pickup: '', drop: '' });
    showSnackbar('Vehicle route added successfully!', 'success');
  };

  const toggleAvailability = (id) => {
    setSlots((prev) => prev.map((s) => {
      if (s.id === id) {
        const newAvailable = !s.available;
        showSnackbar(
          `Vehicle ${s.vehicle} is now ${newAvailable ? 'available' : 'unavailable'}`,
          'info'
        );
        return { ...s, available: newAvailable, status: newAvailable ? 'Available' : 'Unavailable' };
      }
      return s;
    }));
  };

  const deleteSlot = (id) => {
    const slot = slots.find(s => s.id === id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    showSnackbar(`Vehicle ${slot.vehicle} removed successfully`, 'info');
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    { id: 'routes', label: 'My Routes', icon: <Route />, badge: slots.length },
    { id: 'marketplace', label: 'Route Marketplace', icon: <ShoppingCart />, badge: availableRouteRequests.filter(r => r.status === 'Open').length },
    { id: 'deliveries', label: 'Deliveries', icon: <LocalShipping />, badge: deliveries.filter(d => d.status === 'Pending').length },
    { id: 'vehicles', label: 'Vehicles', icon: <DirectionsCar /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 2 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const statusColors = {
    'Available': 'success',
    'In Transit': 'info',
    'Unavailable': 'default',
    'Maintenance': 'warning'
  };

  const deliveryStatusColors = {
    'Delivered': 'success',
    'In Transit': 'info',
    'Pending': 'warning',
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
            <LocalShipping color="warning" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="warning.main">
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
                    bgcolor: 'warning.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'warning.dark' },
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
            <LocalShipping color="warning" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="warning.main">
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
                    bgcolor: 'warning.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'warning.dark' },
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
          <Paper sx={{ p: 2, bgcolor: 'warning.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Quick Stats
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Active Routes</Typography>
                <Chip label={slots.filter(s => s.available).length} size="small" color="warning" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Pending</Typography>
                <Chip label={deliveries.filter(d => d.status === 'Pending').length} size="small" color="error" />
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
                {transporterData.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="warning" onClick={() => setActiveSection('notifications')}>
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
            {/* Overview */}
            {activeSection === 'overview' && (
              <Box>
                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'warning.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Deliveries
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              {transporterData.stats.totalDeliveries}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                            <LocalShipping sx={{ fontSize: 32 }} />
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
                              Active Routes
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              {transporterData.stats.activeRoutes}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                            <Route sx={{ fontSize: 32 }} />
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
                              Monthly Earnings
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              ₹{(transporterData.stats.monthlyEarnings / 1000).toFixed(1)}k
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
                    <Card sx={{ bgcolor: 'error.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Distance
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="error.main">
                              {(transporterData.stats.totalDistance / 1000).toFixed(1)}k
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              km
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                            <Speed sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Performance & Recent Deliveries */}
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Performance Metrics
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Customer Rating</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {transporterData.stats.rating}/5.0
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(transporterData.stats.rating / 5) * 100}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">On-Time Delivery</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {transporterData.stats.onTimeDelivery}%
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={transporterData.stats.onTimeDelivery}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quick Actions
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button 
                          variant="contained" 
                          fullWidth
                          startIcon={<Add />}
                          onClick={() => showSnackbar('Add route feature coming soon', 'info')}
                        >
                          Add New Route
                        </Button>
                        <Button 
                          variant="outlined" 
                          fullWidth
                          startIcon={<Visibility />}
                          onClick={() => setActiveSection('deliveries')}
                        >
                          View Deliveries
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Recent Deliveries
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Order ID</TableCell>
                              <TableCell>Route</TableCell>
                              <TableCell>Distance</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {deliveries.slice(0, 5).map((delivery) => (
                              <TableRow key={delivery.id}>
                                <TableCell>
                                  <Typography fontWeight="bold">{delivery.orderId}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Typography variant="body2">{delivery.from}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      → {delivery.to}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>{delivery.distance}</TableCell>
                                <TableCell>
                                  <Typography fontWeight="bold" color="success.main">
                                    ₹{delivery.amount}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={delivery.status}
                                    color={deliveryStatusColors[delivery.status]}
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
                </Grid>
              </Box>
            )}

            {/* My Routes */}
            {activeSection === 'routes' && (
              <Box>
                {/* Add Route Form */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Add New Route
                  </Typography>
                  <Box component="form" onSubmit={addSlot}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Vehicle Number"
                          name="vehicle"
                          value={form.vehicle}
                          onChange={onChange}
                          placeholder="MH-12-AB-1234"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          select
                          fullWidth
                          label="Vehicle Type"
                          name="vehicleType"
                          value={form.vehicleType}
                          onChange={onChange}
                        >
                          <MenuItem value="Truck">Truck</MenuItem>
                          <MenuItem value="Van">Van</MenuItem>
                          <MenuItem value="Mini Truck">Mini Truck</MenuItem>
                          <MenuItem value="Tempo">Tempo</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Capacity"
                          name="capacity"
                          value={form.capacity}
                          onChange={onChange}
                          placeholder="5 tons"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Cost/km (₹)"
                          name="costPerKm"
                          type="number"
                          value={form.costPerKm}
                          onChange={onChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Pickup Location"
                          name="pickup"
                          value={form.pickup}
                          onChange={onChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Drop Location"
                          name="drop"
                          value={form.drop}
                          onChange={onChange}
                          required
                        />
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

                {/* Routes Grid */}
                <Grid container spacing={3}>
                  {slots.map((slot) => (
                    <Grid item xs={12} sm={6} md={4} key={slot.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {slot.vehicle}
                              </Typography>
                              <Chip 
                                label={slot.vehicleType} 
                                color="info"
                                size="small"
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                            <Chip 
                              label={slot.status}
                              color={statusColors[slot.status]}
                              size="small"
                            />
                          </Stack>

                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Capacity
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {slot.capacity}
                              </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Cost per km
                              </Typography>
                              <Typography variant="body2" fontWeight="600" color="warning.main">
                                ₹{slot.costPerKm}
                              </Typography>
                            </Stack>
                            <Divider />
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {slot.pickup} → {slot.drop}
                              </Typography>
                            </Stack>
                            {slot.distance && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Distance
                                </Typography>
                                <Typography variant="body2" fontWeight="600">
                                  {slot.distance}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>

                          <Divider sx={{ my: 2 }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">Available</Typography>
                              <Switch 
                                checked={slot.available}
                                onChange={() => toggleAvailability(slot.id)}
                                color="warning"
                              />
                            </Stack>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => deleteSlot(slot.id)}
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

            {/* Route Marketplace */}
            {activeSection === 'marketplace' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Route Marketplace - Available Jobs
                </Typography>
                
                {/* My Accepted Routes */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    My Accepted Jobs
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {acceptedRoutes.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Job ID</TableCell>
                            <TableCell>Requester</TableCell>
                            <TableCell>From → To</TableCell>
                            <TableCell>Distance</TableCell>
                            <TableCell>Cargo</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Payment</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {acceptedRoutes.map((route) => (
                            <TableRow key={route.id}>
                              <TableCell>
                                <Chip label={route.jobId} color="success" size="small" />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {route.type === 'Farmer' ? <Agriculture fontSize="small" color="success" /> : <Business fontSize="small" color="primary" />}
                                  <Typography variant="body2" fontWeight="600">{route.requester}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', color: 'action.active' }} /> {route.from}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', color: 'success.main' }} /> {route.to}
                                </Typography>
                              </TableCell>
                              <TableCell>{route.distance}</TableCell>
                              <TableCell>{route.cargo}</TableCell>
                              <TableCell>{route.date}</TableCell>
                              <TableCell>
                                <Typography fontWeight="bold" color="success.main">
                                  ₹{route.payment}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={route.status} color="success" size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                      No accepted jobs yet. Browse available route requests below.
                    </Typography>
                  )}
                </Paper>
                
                {/* Available Route Requests */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Available Route Requests
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={3}>
                    {availableRouteRequests.map((request) => (
                      <Grid item xs={12} md={6} key={request.id}>
                        <Card variant="outlined" sx={{ height: '100%', '&:hover': { boxShadow: 4 } }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    {request.type === 'Farmer' ? (
                                      <Agriculture color="success" />
                                    ) : (
                                      <Business color="primary" />
                                    )}
                                    <Typography variant="h6" fontWeight="bold">
                                      {request.requester}
                                    </Typography>
                                  </Stack>
                                  <Chip 
                                    label={request.type} 
                                    size="small" 
                                    color={request.type === 'Farmer' ? 'success' : 'primary'}
                                  />
                                </Box>
                                <Box textAlign="right">
                                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                                    ₹{request.payment}
                                  </Typography>
                                  <Chip label={request.status} color="warning" size="small" sx={{ mt: 0.5 }} />
                                </Box>
                              </Stack>
                              
                              <Divider />
                              
                              <Stack spacing={1.5}>
                                <Stack direction="row" spacing={1}>
                                  <LocationOn color="action" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Pickup Location</Typography>
                                    <Typography variant="body2" fontWeight="600">{request.from}</Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" spacing={1}>
                                  <LocationOn color="success" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Drop Location</Typography>
                                    <Typography variant="body2" fontWeight="600">{request.to}</Typography>
                                  </Box>
                                </Stack>
                                
                                <Divider />
                                
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Distance</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    <DirectionsCar fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                    {request.distance}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Cargo</Typography>
                                  <Typography variant="body2" fontWeight="600">{request.cargo}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Required Date</Typography>
                                  <Typography variant="body2" color="error.main" fontWeight="600">
                                    <CalendarMonth fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                    {request.date}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Payment</Typography>
                                  <Typography variant="h6" fontWeight="bold" color="success.main">
                                    ₹{request.payment}
                                  </Typography>
                                </Stack>
                              </Stack>
                              
                              <Button 
                                variant="contained" 
                                color="warning"
                                fullWidth
                                size="large"
                                startIcon={<CheckCircle />}
                                onClick={() => {
                                  const jobId = `TR${Date.now().toString().slice(-3)}`;
                                  const accepted = { ...request, status: 'Accepted', acceptedDate: new Date().toISOString().split('T')[0], jobId, requestId: request.id };
                                  const remaining = availableRouteRequests.filter(r => r.id !== request.id);
                                  setAcceptedRoutes([...acceptedRoutes, accepted]);
                                  setAvailableRouteRequests(remaining);
                                  showSnackbar(`Route accepted! Job ID: ${jobId}. You will transport ${request.cargo} from ${request.from} to ${request.to}`, 'success');
                                }}
                              >
                                Accept This Job
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {availableRouteRequests.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <LocalShipping sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Route Requests Available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Check back later for new transportation requests from farmers and businesses.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}

            {/* Deliveries */}
            {activeSection === 'deliveries' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  All Deliveries
                </Typography>
                <Paper sx={{ p: 3 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Route</TableCell>
                          <TableCell>Distance</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deliveries.map((delivery) => (
                          <TableRow key={delivery.id}>
                            <TableCell>
                              <Typography fontWeight="bold">{delivery.orderId}</Typography>
                            </TableCell>
                            <TableCell>{delivery.customer}</TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant="body2">{delivery.from}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  → {delivery.to}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{delivery.distance}</TableCell>
                            <TableCell>
                              <Typography fontWeight="bold" color="success.main">
                                ₹{delivery.amount}
                              </Typography>
                            </TableCell>
                            <TableCell>{delivery.date}</TableCell>
                            <TableCell>
                              <Chip 
                                label={delivery.status}
                                color={deliveryStatusColors[delivery.status]}
                                size="small"
                                icon={
                                  delivery.status === 'Delivered' ? <CheckCircle /> :
                                  delivery.status === 'In Transit' ? <LocalShipping /> :
                                  delivery.status === 'Pending' ? <Schedule /> :
                                  <Cancel />
                                }
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
              </Box>
            )}

            {/* Vehicles */}
            {activeSection === 'vehicles' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Vehicle Fleet
                </Typography>
                <Grid container spacing={3}>
                  {slots.map((slot) => (
                    <Grid item xs={12} sm={6} md={4} key={slot.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                              <DirectionsCar />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {slot.vehicle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {slot.vehicleType}
                              </Typography>
                            </Box>
                          </Stack>

                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Capacity</Typography>
                              <Typography variant="body2" fontWeight="600">{slot.capacity}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Rate</Typography>
                              <Typography variant="body2" fontWeight="600">₹{slot.costPerKm}/km</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Status</Typography>
                              <Chip 
                                label={slot.status}
                                color={statusColors[slot.status]}
                                size="small"
                              />
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
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
                          { id: 1, title: 'New Delivery Request', message: 'New delivery request for Route A', time: '15 minutes ago', type: 'info', read: false },
                          { id: 2, title: 'Delivery Completed', message: 'Delivery #789 marked as completed', time: '1 hour ago', type: 'success', read: true },
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
                                      <Chip label="New" color="warning" size="small" />
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
                        bgcolor: 'warning.main',
                        fontSize: '3rem'
                      }}
                    >
                      <LocalShipping sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {transporterData.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      Owner: {transporterData.ownerName}
                    </Typography>
                    <Chip label="Verified Transporter" color="success" icon={<CheckCircle />} sx={{ mb: 2 }} />
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Experience</Typography>
                        <Typography variant="body2" fontWeight="bold">{transporterData.experience}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Deliveries</Typography>
                        <Typography variant="body2" fontWeight="bold">{transporterData.stats.totalDeliveries}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Rating</Typography>
                        <Chip label={`${transporterData.stats.rating}/5.0`} size="small" color="success" />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">On-Time Rate</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {transporterData.stats.onTimeDelivery}%
                        </Typography>
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
                        <TextField fullWidth label="Business Name" defaultValue={transporterData.name} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Owner Name" defaultValue={transporterData.ownerName} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" defaultValue={transporterData.phone} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" type="email" defaultValue={transporterData.email} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="License Number" defaultValue={transporterData.license} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Experience" defaultValue={transporterData.experience} />
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

export default DeliveryDashboard;

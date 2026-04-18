import { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Switch,
  LinearProgress, Snackbar, Alert, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Tooltip
} from '@mui/material';
import {
  LocalShipping, Route, AccountCircle,
  Add, Delete, Notifications, Menu as MenuIcon, Dashboard,
  CheckCircle, Schedule, Cancel, LocationOn, Speed, AttachMoney,
  DirectionsCar, ShoppingCart, Business,
  Agriculture, CalendarMonth, Visibility, PlayArrow,
  Assignment, Inventory, HourglassTop, Done, Close, Refresh,
  CurrencyRupee, StarRate, Timer, FlashOn, TwoWheeler
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { deliveryAPI, orderAPI, authAPI, analyticsAPI, vehicleAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────
const VEHICLE_TYPES_LARGE = ['Truck', 'Mini Truck', 'Trailer', 'Tanker', 'Container'];
const VEHICLE_TYPES_SMALL = ['Bike', 'Scooter', 'Van', 'Bicycle', 'On Foot'];

const STATUS_COLOR = {
  scheduled: 'info',
  in_transit: 'warning',
  at_checkpoint: 'secondary',
  delivered: 'success',
  cancelled: 'error',
  delayed: 'error',
  assigned: 'default',
  accepted: 'primary',
  picked_up: 'info',
  out_for_delivery: 'warning',
  failed: 'error',
  rescheduled: 'secondary',
  pending: 'warning',
  confirmed: 'info',
  processing: 'primary',
  shipped: 'info',
};

const STATUS_LABEL = {
  scheduled: 'Scheduled',
  in_transit: 'In Transit',
  at_checkpoint: 'At Checkpoint',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  delayed: 'Delayed',
  assigned: 'Assigned',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  failed: 'Failed',
  rescheduled: 'Rescheduled',
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
};

// ─── Seed data for waiting/open orders (simulating what business/restaurant/farmer pays) ──
const SEED_WAITING_ORDERS = [
  {
    id: 'wo1', orderNumber: 'ORD20240001', requester: 'Fresh Mart Pvt Ltd', requesterType: 'business',
    from: 'Banaskantha, Gujarat', to: 'Mumbai, Maharashtra', distance: '520 km',
    cargo: 'Wheat – 500 kg', date: '2024-01-28', amount: 3800, priority: 'high',
    type: 'large', status: 'pending_transport'
  },
  {
    id: 'wo2', orderNumber: 'ORD20240002', requester: 'Green Cuisine Restaurant', requesterType: 'restaurant',
    from: 'Pune Wholesale Market', to: 'Koregaon Park, Pune', distance: '12 km',
    cargo: 'Mixed Vegetables – 80 kg', date: '2024-01-25', amount: 320, priority: 'urgent',
    type: 'small', status: 'pending_transport'
  },
  {
    id: 'wo3', orderNumber: 'ORD20240003', requester: 'Rohan Patel (Farmer)', requesterType: 'farmer',
    from: 'Anand, Gujarat', to: 'Ahmedabad Hub', distance: '70 km',
    cargo: 'Milk – 200 L', date: '2024-01-26', amount: 900, priority: 'normal',
    type: 'large', status: 'pending_transport'
  },
  {
    id: 'wo4', orderNumber: 'ORD20240004', requester: 'Aarav Customer', requesterType: 'customer',
    from: 'FarmKart Pune Hub', to: 'Baner, Pune', distance: '8 km',
    cargo: 'Fruits & Veggies – 5 kg', date: '2024-01-25', amount: 60, priority: 'normal',
    type: 'small', status: 'pending_transport'
  },
  {
    id: 'wo5', orderNumber: 'ORD20240005', requester: 'Metro Foods Ltd', requesterType: 'business',
    from: 'Surat, Gujarat', to: 'Kolkata, West Bengal', distance: '1850 km',
    cargo: 'Organic Produce – 1000 kg', date: '2024-01-30', amount: 12000, priority: 'normal',
    type: 'large', status: 'pending_transport'
  },
];

// ─── Local Storage helpers ────────────────────────────────────────────────────
const LS = {
  VEHICLES: 'farmkart_delivery_vehicles',
  ACCEPTED_JOBS: 'farmkart_delivery_accepted_jobs',
  WAITING_ORDERS: 'farmkart_delivery_waiting_orders',
  DELIVERIES: 'farmkart_delivery_history',
};

const lsGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};
const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

// ─── Component ────────────────────────────────────────────────────────────────
const DeliveryDashboard = ({ mode = 'large' }) => {
  const { user } = useAuth();
  const isLarge = mode === 'large';

  // ── Section navigation ──
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showMsg = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // ── Loading states ──
  const [loading, setLoading] = useState(true);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ── API-driven Fleet ──
  const [vehicles, setVehicles] = useState([]);
  const [metrics, setMetrics] = useState({
    activeVehicles: 0,
    totalDeliveries: 0,
    earnings: 0,
    acceptanceRate: 0
  });
  const [vehicleForm, setVehicleForm] = useState({ number: '', type: isLarge ? 'Truck' : 'Bike', capacity: '', costPerKm: '' });

  // ── API-driven Orders ──
  const [waitingOrders, setWaitingOrders] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);

  // ── Action dialogs ──
  const [assignDialog, setAssignDialog] = useState({ open: false, job: null, selectedVehicle: '' });
  const [detailDialog, setDetailDialog] = useState({ open: false, item: null });

  // ── Initialize: Fetch delivery data on mount ──────────────────────────────────
  useEffect(() => {
    const initializeDeliveryData = async () => {
      try {
        setLoading(true);

        // Get current user (delivery provider)
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          // Get delivery provider's vehicles
          const vehiclesRes = await vehicleAPI.getAll({ ownerId: userRes.data._id });
          if (vehiclesRes.success && vehiclesRes.data) {
            const mappedVehicles = vehiclesRes.data.map(v => ({
              id: v._id || v.id,
              number: v.name || 'Vehicle',
              type: v.type || 'Truck',
              capacity: v.capacity || 0,
              costPerKm: v.costPerKm || 0,
              available: v.status === 'Available',
              status: v.status || 'Available'
            }));
            setVehicles(mappedVehicles);
            setMetrics(prev => ({
              ...prev,
              activeVehicles: mappedVehicles.filter(v => v.available).length
            }));
          }

          // Get available shipment/delivery tasks
          const shipmentsRes = await deliveryAPI.shipments.getAll({ status: 'pending' });
          if (shipmentsRes.success && shipmentsRes.data) {
            setWaitingOrders(shipmentsRes.data.map((s, idx) => ({
              id: idx + 1,
              orderNumber: s.orderId || `ORD${Date.now()}`,
              requester: s.sender?.name || 'Sender',
              from: s.pickup?.address || 'Origin',
              to: s.delivery?.address || 'Destination',
              distance: s.distance || '0 km',
              cargo: s.description || 'Cargo',
              amount: s.fare || 0,
              priority: s.priority || 'normal',
              status: 'pending_transport'
            })));
          }

          // Get accepted jobs
          const tasksRes = await deliveryAPI.tasks.getAll({ assignedTo: userRes.data._id });
          if (tasksRes.success && tasksRes.data) {
            setAcceptedJobs(tasksRes.data.map((t, idx) => ({
              id: idx + 1,
              orderNumber: t.orderId || `ORD${Date.now()}`,
              requester: t.buyerId?.name || 'Buyer',
              from: t.pickup?.address || 'Origin',
              to: t.delivery?.address || 'Destination',
              distance: t.distance || '0 km',
              cargo: t.description || 'Cargo',
              amount: t.fare || 0,
              status: t.status || 'assigned'
            })));

            setMetrics(prev => ({
              ...prev,
              totalDeliveries: tasksRes.data.filter(t => t.status === 'completed').length,
              earnings: tasksRes.data.reduce((sum, t) => sum + (t.fare || 0), 0)
            }));
          }
        }
      } catch (error) {
        console.error('Error initializing delivery data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDeliveryData();
  }, []);

  // ── Fetch from backend ──
  const fetchShipments = useCallback(async () => {
    if (!user?.token || user?.token?.startsWith('mock')) return;
    setLoadingShipments(true);
    try {
      const res = await deliveryAPI.shipments.getAll();
      if (res.success) setShipments(res.data.shipments || []);
    } catch { /* backend unavailable */ }
    finally { setLoadingShipments(false); }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user?.token || user?.token?.startsWith('mock')) return;
    setLoadingTasks(true);
    try {
      const res = await deliveryAPI.tasks.getAll();
      if (res.success) setTasks(res.data.tasks || []);
    } catch { /* backend unavailable */ }
    finally { setLoadingTasks(false); }
  }, [user]);

  useEffect(() => {
    if (isLarge) fetchShipments();
    else fetchTasks();
  }, [isLarge, fetchShipments, fetchTasks]);

  // ─────────────────────────────────────────────────────────────────────────
  // Business Logic: Accept a waiting order job
  // ─────────────────────────────────────────────────────────────────────────
  const handleAcceptJob = (job) => {
    // Open assign vehicle dialog
    setAssignDialog({ open: true, job, selectedVehicle: '' });
  };

  const confirmAcceptJob = () => {
    const { job, selectedVehicle } = assignDialog;
    if (!selectedVehicle) { showMsg('Please select a vehicle', 'error'); return; }
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) return;

    const jobId = `JOB${Date.now().toString().slice(-5)}`;
    const newJob = {
      ...job,
      jobId,
      assignedVehicle: vehicle.number,
      vehicleType: vehicle.type,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    };

    // Add to accepted jobs
    setAcceptedJobs(prev => [newJob, ...prev]);

    // Remove from waiting
    setWaitingOrders(prev => prev.filter(o => o.id !== job.id));

    // Mark vehicle as in use
    setVehicles(prev => prev.map(v => v.id === selectedVehicle
      ? { ...v, available: false, status: 'In Transit' }
      : v));

    setAssignDialog({ open: false, job: null, selectedVehicle: '' });
    showMsg(`Job ${jobId} accepted! ${vehicle.number} assigned for pickup.`, 'success');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Business Logic: Update job status (start → out_for_delivery → delivered)
  // ─────────────────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (job, newStatus) => {
    // Try real API first
    try {
      if (!user?.token?.startsWith('mock')) {
        if (isLarge && job._id) {
          if (newStatus === 'in_transit') await deliveryAPI.shipments.updateTracking(job._id, [], 'Started transit');
          if (newStatus === 'delivered') await deliveryAPI.shipments.markDelivered(job._id);
        } else if (!isLarge && job._id) {
          if (newStatus === 'accepted') await deliveryAPI.tasks.accept(job._id);
          if (newStatus === 'out_for_delivery') await deliveryAPI.tasks.start(job._id);
          if (newStatus === 'delivered') await deliveryAPI.tasks.complete(job._id, { receiverName: 'Customer', notes: 'Delivered' });
        }
      }
    } catch { /* fallback to local */ }

    setAcceptedJobs(prev => prev.map(j => j.id === job.id || j.jobId === job.jobId
      ? { ...j, status: newStatus, [`${newStatus}At`]: new Date().toISOString() }
      : j));

    // Free vehicle when delivered
    if (newStatus === 'delivered') {
      setVehicles(prev => prev.map(v => v.number === job.assignedVehicle
        ? { ...v, available: true, status: 'Available' }
        : v));
    }

    const labels = {
      in_transit: 'Started — vehicle is now in transit!',
      out_for_delivery: 'Out for delivery!',
      picked_up: 'Cargo picked up from source!',
      delivered: '✅ Delivery completed! Earnings updated.',
    };
    showMsg(labels[newStatus] || `Status updated to ${newStatus}`, 'success');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle management
  // ─────────────────────────────────────────────────────────────────────────
  const addVehicle = (e) => {
    e.preventDefault();
    if (!vehicleForm.number || !vehicleForm.type || !vehicleForm.capacity || !vehicleForm.costPerKm) {
      showMsg('Please fill all vehicle fields', 'error');
      return;
    }
    const newV = { ...vehicleForm, id: `v${Date.now()}`, available: true, status: 'Available' };
    setVehicles(prev => [...prev, newV]);
    setVehicleForm({ number: '', type: isLarge ? 'Truck' : 'Bike', capacity: '', costPerKm: '' });
    showMsg('Vehicle added to fleet!', 'success');
  };

  const deleteVehicle = (id) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    showMsg('Vehicle removed from fleet', 'info');
  };

  const toggleVehicleAvailability = (id) => {
    setVehicles(prev => prev.map(v => v.id === id
      ? { ...v, available: !v.available, status: !v.available ? 'Available' : 'Unavailable' }
      : v));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Menu definition
  // ─────────────────────────────────────────────────────────────────────────
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    {
      id: 'waiting', label: 'Waiting Orders',
      icon: <HourglassTop />,
      badge: waitingOrders.length,
      badgeColor: 'error'
    },
    {
      id: 'my_jobs', label: 'My Jobs',
      icon: <Assignment />,
      badge: acceptedJobs.filter(j => j.status !== 'delivered' && j.status !== 'cancelled').length,
      badgeColor: 'warning'
    },
    {
      id: isLarge ? 'shipments' : 'tasks',
      label: isLarge ? 'Live Shipments' : 'Live Tasks',
      icon: <LocalShipping />,
      badge: isLarge ? shipments.filter(s => s.status === 'in_transit').length : tasks.filter(t => t.status === 'out_for_delivery').length,
    },
    { id: 'vehicles', label: 'Fleet', icon: isLarge ? <DirectionsCar /> : <TwoWheeler /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 2 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const sidebarColor = isLarge ? 'warning' : 'info';

  // ─────────────────────────────────────────────────────────────────────────
  // Next action button logic
  // ─────────────────────────────────────────────────────────────────────────
  const getNextAction = (job) => {
    const s = job.status;
    if (isLarge) {
      if (s === 'accepted' || s === 'scheduled') return { label: 'Start Transit', nextStatus: 'in_transit', color: 'primary', icon: <PlayArrow /> };
      if (s === 'in_transit') return { label: 'Mark Delivered', nextStatus: 'delivered', color: 'success', icon: <CheckCircle /> };
      if (s === 'delivered') return null;
      if (s === 'cancelled') return null;
    } else {
      if (s === 'assigned' || s === 'accepted') return { label: 'Start Pickup', nextStatus: 'picked_up', color: 'primary', icon: <FlashOn /> };
      if (s === 'picked_up') return { label: 'Out for Delivery', nextStatus: 'out_for_delivery', color: 'warning', icon: <LocalShipping /> };
      if (s === 'out_for_delivery') return { label: 'Mark Delivered', nextStatus: 'delivered', color: 'success', icon: <CheckCircle /> };
      if (s === 'delivered') return null;
      if (s === 'cancelled') return null;
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Sidebar Drawer content
  // ─────────────────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <LocalShipping color={sidebarColor} sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" color={`${sidebarColor}.main`}>
            FarmKart
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isLarge ? 'Large-Scale Delivery' : 'Last-Mile Delivery'}
          </Typography>
        </Box>
      </Stack>
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={activeSection === item.id}
            onClick={() => { setActiveSection(item.id); setDrawerOpen(false); }}
            sx={{
              borderRadius: 2, mb: 0.5,
              '&.Mui-selected': {
                bgcolor: `${sidebarColor}.main`, color: 'white',
                '&:hover': { bgcolor: `${sidebarColor}.dark` },
                '& .MuiListItemIcon-root': { color: 'white' }
              }
            }}
          >
            <ListItemIcon>
              {item.badge ? (
                <Badge badgeContent={item.badge} color={item.badgeColor || 'error'}>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Paper sx={{ p: 2, bgcolor: `${sidebarColor}.50`, borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Quick Stats
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Waiting</Typography>
            <Chip label={stats.pendingWaiting} size="small" color="error" />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Active Jobs</Typography>
            <Chip label={stats.activeJobs} size="small" color={sidebarColor} />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Vehicles Free</Typography>
            <Chip label={stats.vehiclesAvailable} size="small" color="success" />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}
      >
        <SidebarContent />
      </Drawer>

      {/* Desktop Sidebar */}
      <Box sx={{
        width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' },
        bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider'
      }}>
        <Box sx={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <SidebarContent />
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isLarge ? 'Long-haul • Farm-to-Hub Transport' : 'Last-mile • Hub-to-Customer Delivery'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Refresh data">
                <IconButton onClick={() => { if (isLarge) fetchShipments(); else fetchTasks(); }}>
                  <Refresh />
                </IconButton>
              </Tooltip>
              <IconButton color={sidebarColor} onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={2} color="error"><Notifications /></Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>

            {/* ====== OVERVIEW ====== */}
            {activeSection === 'overview' && (
              <Box>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { label: 'Waiting Orders', value: stats.pendingWaiting, color: 'error', icon: <HourglassTop sx={{ fontSize: 32 }} />, action: () => setActiveSection('waiting') },
                    { label: 'Active Jobs', value: stats.activeJobs, color: sidebarColor, icon: <Assignment sx={{ fontSize: 32 }} />, action: () => setActiveSection('my_jobs') },
                    { label: 'Earnings (Total)', value: `₹${stats.monthlyEarnings.toLocaleString()}`, color: 'success', icon: <CurrencyRupee sx={{ fontSize: 32 }} /> },
                    { label: 'Fleet Available', value: `${stats.vehiclesAvailable}/${vehicles.length}`, color: 'info', icon: <DirectionsCar sx={{ fontSize: 32 }} />, action: () => setActiveSection('vehicles') },
                  ].map((stat, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                      <Card
                        sx={{ cursor: stat.action ? 'pointer' : 'default', '&:hover': stat.action ? { boxShadow: 4 } : {} }}
                        onClick={stat.action}
                      >
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                              <Typography variant="h4" fontWeight="bold" color={`${stat.color}.main`}>
                                {stat.value}
                              </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: `${stat.color}.main`, width: 56, height: 56 }}>
                              {stat.icon}
                            </Avatar>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Grid container spacing={3}>
                  {/* Performance */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Performance</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Customer Rating</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.rating}/5.0 ⭐</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={(stats.rating / 5) * 100} sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">On-Time Rate</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.onTimeRate}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={stats.onTimeRate} color="success" sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Total Completed</Typography>
                          <Chip label={stats.totalDeliveries} size="small" color="success" />
                        </Stack>
                      </Stack>
                    </Paper>

                    <Paper sx={{ p: 3, mt: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Quick Actions</Typography>
                      <Stack spacing={2} sx={{ mt: 1 }}>
                        <Button variant="contained" color={sidebarColor} fullWidth startIcon={<HourglassTop />} onClick={() => setActiveSection('waiting')}>
                          View Waiting Orders ({stats.pendingWaiting})
                        </Button>
                        <Button variant="outlined" fullWidth startIcon={<Add />} onClick={() => setActiveSection('vehicles')}>
                          Add Vehicle to Fleet
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Recent Jobs */}
                  <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Recent Jobs</Typography>
                        <Button size="small" onClick={() => setActiveSection('my_jobs')}>View All</Button>
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      {acceptedJobs.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <LocalShipping sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                          <Typography color="text.secondary">No jobs accepted yet.</Typography>
                          <Button variant="contained" color={sidebarColor} sx={{ mt: 2 }} onClick={() => setActiveSection('waiting')}>
                            Browse Waiting Orders
                          </Button>
                        </Box>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Job ID</TableCell>
                                <TableCell>Route</TableCell>
                                <TableCell>Cargo</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {acceptedJobs.slice(0, 6).map((job) => (
                                <TableRow key={job.jobId || job.id} hover>
                                  <TableCell>
                                    <Chip label={job.jobId || job.id} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">{job.from}</Typography>
                                    <br />
                                    <Typography variant="caption" color="text.secondary">→ {job.to}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">{job.cargo}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography fontWeight="bold" color="success.main" variant="body2">₹{job.amount}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={STATUS_LABEL[job.status] || job.status}
                                      color={STATUS_COLOR[job.status] || 'default'}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ====== WAITING ORDERS (Paid, pending vehicle assignment) ====== */}
            {activeSection === 'waiting' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">Waiting Orders</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Orders that have been paid — awaiting vehicle assignment
                    </Typography>
                  </Box>
                  <Chip
                    label={`${waitingOrders.length} pending`}
                    color="error"
                    icon={<HourglassTop />}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Stack>

                {waitingOrders.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>All caught up!</Typography>
                    <Typography color="text.secondary">No orders waiting for vehicle assignment.</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {waitingOrders.map((order) => (
                      <Grid item xs={12} md={6} key={order.id}>
                        <Card variant="outlined" sx={{
                          height: '100%',
                          borderColor: order.priority === 'urgent' ? 'error.main' : order.priority === 'high' ? 'warning.main' : 'divider',
                          borderWidth: order.priority === 'urgent' ? 2 : 1,
                          '&:hover': { boxShadow: 6 },
                          transition: 'box-shadow 0.2s'
                        }}>
                          <CardContent>
                            <Stack spacing={2}>
                              {/* Header */}
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    {order.requesterType === 'farmer' ? <Agriculture color="success" fontSize="small" /> :
                                      order.requesterType === 'restaurant' ? <Schedule color="warning" fontSize="small" /> :
                                        <Business color="primary" fontSize="small" />}
                                    <Typography fontWeight="bold">{order.requester}</Typography>
                                  </Stack>
                                  <Chip
                                    label={order.orderNumber}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                                <Stack alignItems="flex-end" spacing={0.5}>
                                  <Typography variant="h6" fontWeight="bold" color="success.main">
                                    ₹{order.amount?.toLocaleString()}
                                  </Typography>
                                  {order.priority === 'urgent' && <Chip label="URGENT" color="error" size="small" />}
                                  {order.priority === 'high' && <Chip label="HIGH" color="warning" size="small" />}
                                  {order.priority === 'normal' && <Chip label="Normal" size="small" />}
                                </Stack>
                              </Stack>

                              <Divider />

                              {/* Route */}
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <LocationOn color="action" fontSize="small" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">From</Typography>
                                    <Typography variant="body2" fontWeight="600">{order.from}</Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <LocationOn color="success" fontSize="small" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">To</Typography>
                                    <Typography variant="body2" fontWeight="600">{order.to}</Typography>
                                  </Box>
                                </Stack>
                              </Stack>

                              <Divider />

                              {/* Details */}
                              <Grid container spacing={1}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Cargo</Typography>
                                  <Typography variant="body2" fontWeight="600">{order.cargo}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Distance</Typography>
                                  <Typography variant="body2" fontWeight="600">{order.distance}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Required By</Typography>
                                  <Typography variant="body2" fontWeight="600" color="error.main">
                                    {order.date}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Type</Typography>
                                  <Chip label={isLarge ? 'Long-haul' : 'Last-mile'} size="small" color={isLarge ? 'warning' : 'info'} />
                                </Grid>
                              </Grid>

                              {/* Action */}
                              <Button
                                variant="contained"
                                color={sidebarColor}
                                fullWidth
                                size="large"
                                startIcon={<DirectionsCar />}
                                onClick={() => handleAcceptJob(order)}
                                disabled={vehicles.filter(v => v.available).length === 0}
                              >
                                {vehicles.filter(v => v.available).length === 0
                                  ? 'No Vehicles Available'
                                  : 'Assign Vehicle & Accept'
                                }
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* ====== MY JOBS (Accepted, ongoing) ====== */}
            {activeSection === 'my_jobs' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">My Jobs</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Accepted orders — manage their delivery status
                    </Typography>
                  </Box>
                </Stack>

                {acceptedJobs.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <Assignment sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>No jobs yet</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                      Go to Waiting Orders to accept jobs and assign vehicles.
                    </Typography>
                    <Button variant="contained" color={sidebarColor} onClick={() => setActiveSection('waiting')}>
                      View Waiting Orders
                    </Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {acceptedJobs.map((job) => {
                      const nextAction = getNextAction(job);
                      const isDone = job.status === 'delivered';
                      const isCancelled = job.status === 'cancelled';
                      return (
                        <Grid item xs={12} md={6} key={job.jobId || job.id}>
                          <Card sx={{
                            borderLeft: 4,
                            borderColor: isDone ? 'success.main' : isCancelled ? 'error.main' : `${sidebarColor}.main`,
                            opacity: isDone || isCancelled ? 0.85 : 1
                          }}>
                            <CardContent>
                              <Stack spacing={2}>
                                {/* Header */}
                                <Stack direction="row" justifyContent="space-between" alignItems="start">
                                  <Box>
                                    <Typography variant="h6" fontWeight="bold">
                                      {job.jobId}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {job.orderNumber}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={STATUS_LABEL[job.status] || job.status}
                                    color={STATUS_COLOR[job.status] || 'default'}
                                  />
                                </Stack>

                                <Divider />

                                {/* Route & Info */}
                                <Stack spacing={1}>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Requester</Typography>
                                    <Typography variant="body2" fontWeight="600">{job.requester}</Typography>
                                  </Stack>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Route</Typography>
                                    <Typography variant="body2" fontWeight="600">{job.from} → {job.to}</Typography>
                                  </Stack>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Cargo</Typography>
                                    <Typography variant="body2" fontWeight="600">{job.cargo}</Typography>
                                  </Stack>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Vehicle</Typography>
                                    <Chip label={job.assignedVehicle} size="small" icon={<DirectionsCar />} />
                                  </Stack>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Earnings</Typography>
                                    <Typography variant="body2" fontWeight="bold" color="success.main">₹{job.amount}</Typography>
                                  </Stack>
                                </Stack>

                                {/* Action */}
                                {nextAction && (
                                  <Button
                                    variant="contained"
                                    color={nextAction.color}
                                    fullWidth
                                    startIcon={nextAction.icon}
                                    onClick={() => handleStatusUpdate(job, nextAction.nextStatus)}
                                  >
                                    {nextAction.label}
                                  </Button>
                                )}

                                {isDone && (
                                  <Chip
                                    label="✅ Completed — Earnings Credited"
                                    color="success"
                                    fullWidth
                                    sx={{ py: 1 }}
                                  />
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>
            )}

            {/* ====== LIVE SHIPMENTS (Large-scale) ====== */}
            {activeSection === 'shipments' && isLarge && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Live Shipments (Backend)</Typography>
                  <Button startIcon={<Refresh />} onClick={fetchShipments} disabled={loadingShipments}>
                    {loadingShipments ? <CircularProgress size={20} /> : 'Refresh'}
                  </Button>
                </Stack>
                <Paper sx={{ p: 3 }}>
                  {loadingShipments ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                  ) : shipments.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <LocalShipping sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary">
                        No backend shipments found. <br />
                        Make sure the backend is connected or use the <strong>Waiting Orders</strong> tab (uses localStorage).
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Shipment #</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Origin → Destination</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {shipments.map((s) => (
                            <TableRow key={s._id} hover>
                              <TableCell><Chip label={s.shipmentNumber} size="small" /></TableCell>
                              <TableCell>{s.type?.replace(/_/g, ' ')}</TableCell>
                              <TableCell>
                                <Stack><Typography variant="body2">{s.origin?.address?.city}</Typography>
                                  <Typography variant="caption" color="text.secondary">→ {s.destination?.address?.city}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip label={STATUS_LABEL[s.status] || s.status} color={STATUS_COLOR[s.status] || 'default'} size="small" />
                              </TableCell>
                              <TableCell>
                                {s.status === 'scheduled' && (
                                  <Button size="small" variant="outlined" startIcon={<PlayArrow />}
                                    onClick={() => deliveryAPI.shipments.updateTracking(s._id, [], 'Started').then(fetchShipments)}>
                                    Start
                                  </Button>
                                )}
                                {s.status === 'in_transit' && (
                                  <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                                    onClick={() => deliveryAPI.shipments.markDelivered(s._id).then(fetchShipments)}>
                                    Deliver
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

            {/* ====== LIVE TASKS (Small-scale) ====== */}
            {activeSection === 'tasks' && !isLarge && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Live Delivery Tasks (Backend)</Typography>
                  <Button startIcon={<Refresh />} onClick={fetchTasks} disabled={loadingTasks}>
                    {loadingTasks ? <CircularProgress size={20} /> : 'Refresh'}
                  </Button>
                </Stack>
                <Paper sx={{ p: 3 }}>
                  {loadingTasks ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                  ) : tasks.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <TwoWheeler sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary">
                        No backend tasks found. <br />
                        Make sure the backend is connected or use the <strong>Waiting Orders</strong> tab.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Task #</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Time Slot</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tasks.map((t) => (
                            <TableRow key={t._id} hover>
                              <TableCell><Chip label={t.taskNumber} size="small" /></TableCell>
                              <TableCell>{t.type?.replace(/_/g, ' ')}</TableCell>
                              <TableCell>
                                <Typography variant="body2">{t.timeSlot?.slot?.replace(/_/g, ' ')}</Typography>
                                <Typography variant="caption" color="text.secondary">{t.timeSlot?.date?.split('T')[0]}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={t.priority}
                                  color={t.priority === 'urgent' ? 'error' : t.priority === 'high' ? 'warning' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip label={STATUS_LABEL[t.status] || t.status} color={STATUS_COLOR[t.status] || 'default'} size="small" />
                              </TableCell>
                              <TableCell>
                                {t.status === 'assigned' && (
                                  <Button size="small" variant="outlined" onClick={() => deliveryAPI.tasks.accept(t._id).then(fetchTasks)}>
                                    Accept
                                  </Button>
                                )}
                                {t.status === 'accepted' && (
                                  <Button size="small" variant="outlined" color="warning" onClick={() => deliveryAPI.tasks.start(t._id).then(fetchTasks)}>
                                    Start
                                  </Button>
                                )}
                                {t.status === 'out_for_delivery' && (
                                  <Button size="small" variant="contained" color="success"
                                    onClick={() => deliveryAPI.tasks.complete(t._id, { receiverName: 'Customer' }).then(fetchTasks)}>
                                    Complete
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

            {/* ====== VEHICLE FLEET ====== */}
            {activeSection === 'vehicles' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>Vehicle Fleet</Typography>

                {/* Add Vehicle Form */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Add Vehicle</Typography>
                  <Box component="form" onSubmit={addVehicle}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField fullWidth label="Vehicle Number" placeholder="MH-12-AB-1234"
                          value={vehicleForm.number} onChange={e => setVehicleForm(p => ({ ...p, number: e.target.value }))} required />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField select fullWidth label="Type"
                          value={vehicleForm.type} onChange={e => setVehicleForm(p => ({ ...p, type: e.target.value }))}>
                          {(isLarge ? VEHICLE_TYPES_LARGE : VEHICLE_TYPES_SMALL).map(t => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField fullWidth label="Capacity" placeholder={isLarge ? '5 tons' : '50 kg'}
                          value={vehicleForm.capacity} onChange={e => setVehicleForm(p => ({ ...p, capacity: e.target.value }))} required />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField fullWidth label="Cost/km (₹)" type="number"
                          value={vehicleForm.costPerKm} onChange={e => setVehicleForm(p => ({ ...p, costPerKm: e.target.value }))} required />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Button type="submit" variant="contained" color={sidebarColor} fullWidth sx={{ height: 56 }} startIcon={<Add />}>
                          Add to Fleet
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* Fleet Grid */}
                <Grid container spacing={3}>
                  {vehicles.map((v) => (
                    <Grid item xs={12} sm={6} md={4} key={v.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar sx={{ bgcolor: v.available ? 'success.main' : 'grey.500' }}>
                                {isLarge ? <DirectionsCar /> : <TwoWheeler />}
                              </Avatar>
                              <Box>
                                <Typography fontWeight="bold">{v.number}</Typography>
                                <Typography variant="caption" color="text.secondary">{v.type}</Typography>
                              </Box>
                            </Stack>
                            <Chip label={v.status} color={v.available ? 'success' : 'default'} size="small" />
                          </Stack>
                          <Divider sx={{ mb: 2 }} />
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Capacity</Typography>
                              <Typography variant="body2" fontWeight="600">{v.capacity}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Rate</Typography>
                              <Typography variant="body2" fontWeight="600" color={`${sidebarColor}.main`}>₹{v.costPerKm}/km</Typography>
                            </Stack>
                          </Stack>
                          <Divider sx={{ my: 2 }} />
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">Available</Typography>
                              <Switch checked={v.available} onChange={() => toggleVehicleAvailability(v.id)} color={sidebarColor} />
                            </Stack>
                            <IconButton size="small" color="error" onClick={() => deleteVehicle(v.id)}>
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

            {/* ====== NOTIFICATIONS ====== */}
            {activeSection === 'notifications' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>Notifications</Typography>
                <Stack spacing={2}>
                  {[
                    { id: 1, title: 'New Order Waiting', message: `Order ORD20240006 — 300 kg Rice from Nasik to Pune needs ${isLarge ? 'transport' : 'last-mile delivery'}`, time: '5 min ago', type: 'warning', read: false },
                    { id: 2, title: 'Job Completed', message: 'JOB001 has been successfully delivered and earnings credited.', time: '2 hours ago', type: 'success', read: true },
                    { id: 3, title: 'Vehicle Due for Service', message: 'MH-12-AB-1234 is due for its routine maintenance check.', time: '1 day ago', type: 'info', read: true },
                  ].map((n) => (
                    <Card key={n.id} sx={{ bgcolor: n.read ? 'background.paper' : 'action.hover' }}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Avatar sx={{ bgcolor: n.type === 'warning' ? 'warning.main' : n.type === 'success' ? 'success.main' : 'info.main', width: 40, height: 40 }}>
                            {n.type === 'warning' ? <HourglassTop /> : n.type === 'success' ? <CheckCircle /> : <Notifications />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography fontWeight={n.read ? 'normal' : 'bold'}>{n.title}</Typography>
                              {!n.read && <Chip label="New" color="error" size="small" />}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                            <Typography variant="caption" color="text.secondary">{n.time}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                  <Button fullWidth variant="outlined" onClick={() => showMsg('All marked as read', 'success')}>
                    Mark All as Read
                  </Button>
                </Stack>
              </Box>
            )}

            {/* ====== PROFILE ====== */}
            {activeSection === 'profile' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: `${sidebarColor}.main`, fontSize: '2.5rem' }}>
                      {isLarge ? <LocalShipping sx={{ fontSize: 50 }} /> : <TwoWheeler sx={{ fontSize: 50 }} />}
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold">{user?.name || 'Delivery Partner'}</Typography>
                    <Typography color="text.secondary" gutterBottom>{user?.email || 'partner@farmkart.com'}</Typography>
                    <Chip label={isLarge ? 'Large-Scale Partner' : 'Last-Mile Partner'} color={sidebarColor} icon={<CheckCircle />} sx={{ mb: 2 }} />
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={1.5}>
                      {[
                        { label: 'Fleet Size', value: vehicles.length },
                        { label: 'Total Deliveries', value: stats.totalDeliveries },
                        { label: 'Rating', value: `${stats.rating} ⭐` },
                        { label: 'On-Time Rate', value: `${stats.onTimeRate}%` },
                      ].map(item => (
                        <Stack key={item.label} direction="row" justifyContent="space-between">
                          <Typography variant="body2">{item.label}</Typography>
                          <Typography variant="body2" fontWeight="bold">{item.value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Business Information</Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={2}>
                      {[
                        { label: 'Full Name', value: user?.name || '' },
                        { label: 'Email', value: user?.email || '' },
                        { label: 'Phone', value: user?.phone || '' },
                        { label: 'License Number', value: 'DL-' + (user?._id?.slice(-8) || '14200112') },
                        { label: 'Account Type', value: isLarge ? 'Large-Scale Transporter' : 'Last-Mile Delivery' },
                        { label: 'Status', value: 'Active & Verified' },
                      ].map(field => (
                        <Grid item xs={12} sm={6} key={field.label}>
                          <TextField fullWidth label={field.label} defaultValue={field.value} />
                        </Grid>
                      ))}
                      <Grid item xs={12}>
                        <Button variant="contained" color={sidebarColor} size="large" onClick={() => showMsg('Profile updated!', 'success')}>
                          Update Profile
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}

          </Container>
        </Box>
      </Box>

      {/* ── Assign Vehicle Dialog ── */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, job: null, selectedVehicle: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DirectionsCar color={sidebarColor} />
            <Typography fontWeight="bold">Assign Vehicle for Job</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {assignDialog.job && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight="bold">{assignDialog.job.orderNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {assignDialog.job.from} → {assignDialog.job.to}
                </Typography>
                <Typography variant="body2" color="text.secondary">{assignDialog.job.cargo}</Typography>
                <Typography variant="h6" color="success.main" fontWeight="bold">₹{assignDialog.job.amount}</Typography>
              </Paper>

              <Typography variant="subtitle1" fontWeight="bold">Select Available Vehicle:</Typography>

              {vehicles.filter(v => v.available).length === 0 ? (
                <Alert severity="error">No vehicles available. Mark a vehicle as available in Fleet management.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {vehicles.filter(v => v.available).map(v => (
                    <Grid item xs={12} sm={6} key={v.id}>
                      <Card
                        variant="outlined"
                        onClick={() => setAssignDialog(p => ({ ...p, selectedVehicle: v.id }))}
                        sx={{
                          cursor: 'pointer',
                          borderColor: assignDialog.selectedVehicle === v.id ? `${sidebarColor}.main` : 'divider',
                          borderWidth: assignDialog.selectedVehicle === v.id ? 2 : 1,
                          bgcolor: assignDialog.selectedVehicle === v.id ? `${sidebarColor}.50` : 'background.paper',
                          '&:hover': { boxShadow: 2 }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ bgcolor: `${sidebarColor}.main`, width: 36, height: 36 }}>
                              {isLarge ? <DirectionsCar fontSize="small" /> : <TwoWheeler fontSize="small" />}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="bold" variant="body2">{v.number}</Typography>
                              <Typography variant="caption" color="text.secondary">{v.type} • {v.capacity}</Typography>
                              <br />
                              <Typography variant="caption" color="success.main">₹{v.costPerKm}/km</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignDialog({ open: false, job: null, selectedVehicle: '' })}>Cancel</Button>
          <Button
            variant="contained"
            color={sidebarColor}
            onClick={confirmAcceptJob}
            disabled={!assignDialog.selectedVehicle}
            startIcon={<CheckCircle />}
          >
            Accept & Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeliveryDashboard;

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {
  AccountCircle,
  Add,
  Assignment,
  CheckCircle,
  Delete,
  DirectionsCar,
  DoneAll,
  HourglassTop,
  LocalShipping,
  Menu as MenuIcon,
  Notifications,
  Refresh,
  Route,
  TwoWheeler,
  Update
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { authAPI, notificationAPI, orderAPI, userAPI, vehicleAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

const VEHICLE_TYPES_LARGE = ['Truck', 'Van', 'Car', 'Other'];
const VEHICLE_TYPES_SMALL = ['Bike', 'Scooter', 'Bicycle', 'Van', 'Other'];

const DELIVERY_STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const getNextOrderAction = (status) => {
  if (['pending', 'confirmed', 'processing'].includes(status)) {
    return { label: 'Mark Shipped', status: 'shipped', color: 'warning' };
  }
  if (status === 'shipped') {
    return { label: 'Mark Delivered', status: 'delivered', color: 'success' };
  }
  return null;
};

const mapVehicle = (vehicle) => ({
  id: vehicle._id || vehicle.id,
  number: vehicle.name || vehicle.plateNumber || 'Vehicle',
  type: vehicle.type || 'Truck',
  capacity: Number(vehicle.capacity || 0),
  costPerKm: Number(vehicle.costPerKm || 0),
  available: vehicle.status === 'Available',
  status: vehicle.status || 'Available'
});

const mapOrder = (order) => {
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const primaryItem = items[0];
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerId?.name || 'Buyer',
    sellerName: order.sellerId?.name || 'Seller',
    productSummary: primaryItem
      ? `${primaryItem.productName || 'Product'}${items.length > 1 ? ` +${items.length - 1}` : ''}`
      : 'Order',
    quantity: totalQuantity,
    total: Number(order.total || 0),
    status: order.status,
    requestStatus: order.delivery?.requestStatus || 'none',
    requestedVehicle: order.delivery?.requestedVehicleId
      ? {
          id: order.delivery.requestedVehicleId._id,
          name: order.delivery.requestedVehicleId.name || order.delivery.requestedVehicleId.plateNumber || 'Vehicle',
          type: order.delivery.requestedVehicleId.type || 'Vehicle',
          capacity: Number(order.delivery.requestedVehicleId.capacity || 0)
        }
      : null,
    requestedAt: order.delivery?.requestedAt,
    deliveryAddress: order.deliveryAddress,
    history: Array.isArray(order.statusHistory) ? order.statusHistory : []
  };
};

const DeliveryDashboard = ({ mode = 'large' }) => {
  const { user, updateUser } = useAuth();
  const isLarge = mode === 'large';
  const sidebarColor = isLarge ? 'warning' : 'info';

  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotalPages, setNotificationTotalPages] = useState(1);

  const [vehicleForm, setVehicleForm] = useState({
    number: '',
    type: isLarge ? 'Truck' : 'Bike',
    capacity: '',
    costPerKm: ''
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    accountType: '',
    address: ''
  });

  useRealtimeNotifications({
    enabled: !loading,
    onNotification: (payload) => {
      fetchNotifications(notificationPage, notificationFilter);

      if (['order', 'delivery'].includes(payload?.type)) {
        refreshAll();
      }
    }
  });

  const [assignDialog, setAssignDialog] = useState({
    open: false,
    order: null,
    selectedVehicleId: ''
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showMessage = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const pendingRequests = useMemo(
    () => orders.filter((o) => o.requestStatus === 'requested'),
    [orders]
  );

  const activeDeliveries = useMemo(
    () => orders.filter((o) => o.requestStatus === 'accepted' && !['delivered', 'cancelled'].includes(o.status)),
    [orders]
  );

  const completedDeliveries = useMemo(
    () => orders.filter((o) => o.requestStatus === 'accepted' && ['delivered', 'cancelled'].includes(o.status)),
    [orders]
  );

  const stats = useMemo(() => {
    const availableVehicles = vehicles.filter((v) => v.available).length;
    const totalEarnings = completedDeliveries
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      pendingRequests: pendingRequests.length,
      activeDeliveries: activeDeliveries.length,
      completedDeliveries: completedDeliveries.length,
      availableVehicles,
      totalVehicles: vehicles.length,
      totalEarnings
    };
  }, [pendingRequests, activeDeliveries, completedDeliveries, vehicles]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const fetchOrders = useCallback(async () => {
    const response = await orderAPI.getAll({ limit: 200 });
    const list = response?.data?.orders || [];
    const mapped = list.map(mapOrder);
    setOrders(mapped);
  }, []);

  const fetchVehicles = useCallback(async () => {
    if (!user?._id) return;
    const response = await vehicleAPI.getAll({ ownerId: user._id });
    const list = response?.data || [];
    setVehicles(list.map(mapVehicle));
  }, [user?._id]);

  const fetchNotifications = useCallback(async (page = notificationPage, filter = notificationFilter) => {
    const params = { page, limit: 8 };
    if (filter === 'unread') params.unread = true;
    if (filter !== 'all' && filter !== 'unread') params.type = filter;

    const response = await notificationAPI.getAll(params);
    const mapped = (response?.data || []).map((entry) => ({
      id: entry._id || entry.id,
      title: entry.title || 'Notification',
      message: entry.message || '',
      time: new Date(entry.createdAt || Date.now()).toLocaleString('en-IN'),
      read: !!entry.isRead,
      type: entry.type || 'info'
    }));

    setNotifications(mapped);
    setNotificationTotalPages(response?.pagination?.totalPages || 1);
  }, [notificationFilter, notificationPage]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchOrders(), fetchVehicles()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, fetchVehicles]);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const me = await authAPI.getCurrentUser();
        const currentUser = me?.data?.user || me?.data;

        setProfileForm({
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          phone: currentUser?.phone || '',
          licenseNumber: currentUser?.licenseNumber || '',
          accountType: currentUser?.accountType || (isLarge ? 'Large-Scale Delivery Partner' : 'Last-Mile Delivery Partner'),
          address: currentUser?.address || currentUser?.addresses?.[0]?.line1 || ''
        });

        await Promise.all([fetchOrders(), fetchVehicles(), fetchNotifications(1, 'all')]);
      } catch (error) {
        showMessage(error.message || 'Failed to initialize delivery dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [fetchOrders, fetchVehicles, fetchNotifications, isLarge]);

  useEffect(() => {
    if (activeSection === 'notifications') {
      fetchNotifications(notificationPage, notificationFilter);
    }
  }, [activeSection, notificationPage, notificationFilter, fetchNotifications]);

  const handleOpenAssignDialog = (order) => {
    const availableVehicles = vehicles.filter((v) => v.available);
    let defaultVehicle = '';
    if (order.requestedVehicle?.id && availableVehicles.some((v) => v.id === order.requestedVehicle.id)) {
      defaultVehicle = order.requestedVehicle.id;
    }
    setAssignDialog({
      open: true,
      order,
      selectedVehicleId: defaultVehicle
    });
  };

  const handleAcceptRequest = async () => {
    const { order, selectedVehicleId } = assignDialog;
    if (!order || !selectedVehicleId) {
      showMessage('Select a vehicle before accepting request', 'error');
      return;
    }

    try {
      await orderAPI.respondDeliveryRequest(order.id, 'accepted', selectedVehicleId);
      showMessage(`Delivery request for ${order.orderNumber} accepted`, 'success');
      setAssignDialog({ open: false, order: null, selectedVehicleId: '' });
      await refreshAll();
    } catch (error) {
      showMessage(error.message || 'Failed to accept delivery request', 'error');
    }
  };

  const handleRejectRequest = async (orderId) => {
    try {
      await orderAPI.respondDeliveryRequest(orderId, 'rejected');
      showMessage('Delivery request rejected', 'info');
      await refreshAll();
    } catch (error) {
      showMessage(error.message || 'Failed to reject delivery request', 'error');
    }
  };

  const handleDeliveryStatusUpdate = async (orderId, nextStatus) => {
    try {
      await orderAPI.updateStatus(orderId, nextStatus);
      showMessage(`Order marked as ${nextStatus}`, 'success');
      await refreshAll();
    } catch (error) {
      showMessage(error.message || 'Failed to update delivery status', 'error');
    }
  };

  const addVehicle = async (event) => {
    event.preventDefault();
    if (!vehicleForm.number || !vehicleForm.type || !vehicleForm.capacity || !vehicleForm.costPerKm) {
      showMessage('Fill all vehicle fields', 'error');
      return;
    }

    try {
      await vehicleAPI.create({
        name: vehicleForm.number,
        type: vehicleForm.type,
        capacity: Number(vehicleForm.capacity),
        plateNumber: vehicleForm.number,
        costPerKm: Number(vehicleForm.costPerKm)
      });
      showMessage('Vehicle added successfully', 'success');
      setVehicleForm({ number: '', type: isLarge ? 'Truck' : 'Bike', capacity: '', costPerKm: '' });
      await fetchVehicles();
    } catch (error) {
      showMessage(error.message || 'Failed to add vehicle', 'error');
    }
  };

  const deleteVehicle = async (id) => {
    try {
      await vehicleAPI.delete(id);
      showMessage('Vehicle removed', 'info');
      await fetchVehicles();
    } catch (error) {
      showMessage(error.message || 'Failed to remove vehicle', 'error');
    }
  };

  const toggleVehicleAvailability = async (vehicle) => {
    const nextStatus = vehicle.available ? 'Maintenance' : 'Available';
    try {
      await vehicleAPI.updateStatus(vehicle.id, nextStatus);
      await fetchVehicles();
    } catch (error) {
      showMessage(error.message || 'Failed to update vehicle status', 'error');
    }
  };

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    if (!user?._id) return;

    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        licenseNumber: profileForm.licenseNumber,
        accountType: profileForm.accountType,
        address: profileForm.address
      };
      const response = await userAPI.update(user._id, payload);
      const updatedUser = response?.data?.user;
      if (updatedUser) updateUser(updatedUser);
      showMessage('Profile updated successfully', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to update profile', 'error');
    }
  };

  const markOneNotificationRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      await fetchNotifications(notificationPage, notificationFilter);
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      await fetchNotifications(notificationPage, notificationFilter);
      showMessage('All notifications marked as read', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to update notifications', 'error');
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Route /> },
    { id: 'requests', label: 'Delivery Requests', icon: <HourglassTop />, badge: pendingRequests.length, badgeColor: 'error' },
    { id: 'active', label: 'Active Deliveries', icon: <LocalShipping />, badge: activeDeliveries.length, badgeColor: sidebarColor },
    { id: 'completed', label: 'Completed', icon: <DoneAll /> },
    { id: 'vehicles', label: 'Fleet', icon: isLarge ? <DirectionsCar /> : <TwoWheeler /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: unreadCount || null },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> }
  ];

  const SidebarContent = () => (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: `${sidebarColor}.main` }}>
          <LocalShipping />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">FarmKart Delivery</Typography>
          <Typography variant="caption" color="text.secondary">
            {isLarge ? 'Large-scale transport partner' : 'Last-mile delivery partner'}
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
              borderRadius: 2,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: `${sidebarColor}.main`,
                color: 'white',
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
      <Paper sx={{ p: 2, bgcolor: `${sidebarColor}.50` }}>
        <Typography variant="caption" color="text.secondary">Delivery Operations</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Requests</Typography>
            <Chip size="small" color="error" label={stats.pendingRequests} />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Active</Typography>
            <Chip size="small" color={sidebarColor} label={stats.activeDeliveries} />
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Vehicles Free</Typography>
            <Chip size="small" color="success" label={`${stats.availableVehicles}/${stats.totalVehicles}`} />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Loading delivery operations...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 290 } }}
      >
        <SidebarContent />
      </Drawer>

      <Box sx={{ width: 290, display: { xs: 'none', md: 'block' }, borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', bgcolor: 'background.paper' }}>
          <SidebarContent />
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {menuItems.find((item) => item.id === activeSection)?.label || 'Delivery Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Delivery agency operations: request handling, fleet allocation, and delivery updates
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Refresh dashboard">
                <IconButton onClick={refreshAll} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={18} /> : <Refresh />}
                </IconButton>
              </Tooltip>
              <IconButton color={sidebarColor} onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {activeSection === 'overview' && (
              <Grid container spacing={3}>
                {[
                  { label: 'Incoming Requests', value: stats.pendingRequests, color: 'error', icon: <HourglassTop />, action: 'requests' },
                  { label: 'Active Deliveries', value: stats.activeDeliveries, color: sidebarColor, icon: <LocalShipping />, action: 'active' },
                  { label: 'Completed Deliveries', value: stats.completedDeliveries, color: 'success', icon: <DoneAll />, action: 'completed' },
                  { label: 'Fleet Availability', value: `${stats.availableVehicles}/${stats.totalVehicles}`, color: 'info', icon: isLarge ? <DirectionsCar /> : <TwoWheeler />, action: 'vehicles' }
                ].map((card) => (
                  <Grid item xs={12} sm={6} md={3} key={card.label}>
                    <Card
                      onClick={() => setActiveSection(card.action)}
                      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                            <Typography variant="h4" fontWeight="bold" color={`${card.color}.main`}>{card.value}</Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: `${card.color}.main` }}>{card.icon}</Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">Priority Request Queue</Typography>
                      <Button size="small" onClick={() => setActiveSection('requests')}>View all</Button>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />

                    {pendingRequests.length === 0 ? (
                      <Typography color="text.secondary">No pending delivery requests at the moment.</Typography>
                    ) : (
                      <Stack spacing={2}>
                        {pendingRequests.slice(0, 5).map((order) => (
                          <Paper key={order.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                              <Box>
                                <Typography fontWeight="bold">{order.orderNumber}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {order.buyerName} • {order.productSummary} • Qty {order.quantity}
                                </Typography>
                              </Box>
                              <Chip label={`₹${order.total.toLocaleString()}`} color="success" />
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Performance Snapshot</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="body2">Delivery Pipeline</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {stats.completedDeliveries + stats.activeDeliveries > 0
                              ? Math.round((stats.completedDeliveries / (stats.completedDeliveries + stats.activeDeliveries)) * 100)
                              : 0}% done
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={
                            stats.completedDeliveries + stats.activeDeliveries > 0
                              ? (stats.completedDeliveries / (stats.completedDeliveries + stats.activeDeliveries)) * 100
                              : 0
                          }
                          color="success"
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Estimated Settled Value</Typography>
                        <Typography variant="body2" color="success.main" fontWeight="bold">₹{stats.totalEarnings.toLocaleString()}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeSection === 'requests' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">Delivery Requests Inbox</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Buyer requests assigned to your delivery agency. Accept with a fleet vehicle or reject.
                    </Typography>
                  </Box>
                  <Chip label={`${pendingRequests.length} pending`} color="error" icon={<HourglassTop />} />
                </Stack>

                {pendingRequests.length === 0 ? (
                  <Paper sx={{ p: 5, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 70, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6">No pending requests</Typography>
                    <Typography color="text.secondary">New delivery requests will appear here.</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {pendingRequests.map((order) => (
                      <Grid item xs={12} md={6} key={order.id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Typography variant="h6" fontWeight="bold">{order.orderNumber}</Typography>
                                  <Typography variant="body2" color="text.secondary">{order.buyerName}</Typography>
                                </Box>
                                <Chip color="success" label={`₹${order.total.toLocaleString()}`} />
                              </Stack>

                              <Divider />

                              <Grid container spacing={1}>
                                <Grid item xs={12}>
                                  <Typography variant="body2"><strong>Product:</strong> {order.productSummary}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2"><strong>Qty:</strong> {order.quantity}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2"><strong>Status:</strong> {order.status}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="body2"><strong>Drop:</strong> {order.deliveryAddress?.city || order.deliveryAddress?.line1 || 'N/A'}</Typography>
                                </Grid>
                                {order.requestedVehicle && (
                                  <Grid item xs={12}>
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                      Buyer requested: {order.requestedVehicle.name} ({order.requestedVehicle.type}, cap {order.requestedVehicle.capacity})
                                    </Alert>
                                  </Grid>
                                )}
                              </Grid>

                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  color={sidebarColor}
                                  startIcon={<DirectionsCar />}
                                  onClick={() => handleOpenAssignDialog(order)}
                                >
                                  Accept & Assign Vehicle
                                </Button>
                                <Button
                                  fullWidth
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleRejectRequest(order.id)}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {activeSection === 'active' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>Active Deliveries</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Accepted requests currently handled by your delivery agency.
                </Typography>

                {activeDeliveries.length === 0 ? (
                  <Paper sx={{ p: 5, textAlign: 'center' }}>
                    <Assignment sx={{ fontSize: 70, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6">No active deliveries</Typography>
                    <Typography color="text.secondary">Accept requests from inbox to start deliveries.</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {activeDeliveries.map((order) => {
                      const nextAction = getNextOrderAction(order.status);
                      return (
                        <Grid item xs={12} md={6} key={order.id}>
                          <Card sx={{ borderLeft: 4, borderColor: `${sidebarColor}.main` }}>
                            <CardContent>
                              <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between" alignItems="start">
                                  <Box>
                                    <Typography variant="h6" fontWeight="bold">{order.orderNumber}</Typography>
                                    <Typography variant="body2" color="text.secondary">{order.buyerName}</Typography>
                                  </Box>
                                  <Chip label={order.status} color={order.status === 'shipped' ? 'warning' : 'primary'} />
                                </Stack>

                                <Divider />

                                <Stack spacing={1}>
                                  <Typography variant="body2"><strong>Route:</strong> Seller to {order.deliveryAddress?.city || 'destination'}</Typography>
                                  <Typography variant="body2"><strong>Cargo:</strong> {order.productSummary} • Qty {order.quantity}</Typography>
                                  <Typography variant="body2"><strong>Vehicle:</strong> {order.requestedVehicle?.name || 'Assigned'}</Typography>
                                  <Typography variant="body2"><strong>Value:</strong> ₹{order.total.toLocaleString()}</Typography>
                                </Stack>

                                {nextAction && (
                                  <Button
                                    variant="contained"
                                    color={nextAction.color}
                                    startIcon={nextAction.status === 'delivered' ? <CheckCircle /> : <Update />}
                                    onClick={() => handleDeliveryStatusUpdate(order.id, nextAction.status)}
                                  >
                                    {nextAction.label}
                                  </Button>
                                )}

                                {!DELIVERY_STATUS_FLOW.includes(order.status) && (
                                  <Alert severity="warning">Unsupported status flow: {order.status}</Alert>
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

            {activeSection === 'completed' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>Completed Deliveries</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Historical deliveries processed by this delivery agency.
                </Typography>

                <Paper sx={{ p: 2 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Buyer</TableCell>
                          <TableCell>Vehicle</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {completedDeliveries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography color="text.secondary" sx={{ py: 2 }}>
                                No completed deliveries yet.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          completedDeliveries.map((order) => (
                            <TableRow key={order.id} hover>
                              <TableCell>{order.orderNumber}</TableCell>
                              <TableCell>{order.buyerName}</TableCell>
                              <TableCell>{order.requestedVehicle?.name || 'N/A'}</TableCell>
                              <TableCell>
                                <Chip size="small" label={order.status} color={order.status === 'delivered' ? 'success' : 'default'} />
                              </TableCell>
                              <TableCell align="right">₹{order.total.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}

            {activeSection === 'vehicles' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>Fleet Management</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Manage only your delivery agency fleet. Buyers cannot create or manage these vehicles.
                </Typography>

                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Add Vehicle</Typography>
                  <Box component="form" onSubmit={addVehicle}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Vehicle Name/Number"
                          value={vehicleForm.number}
                          onChange={(event) => setVehicleForm((prev) => ({ ...prev, number: event.target.value }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          select
                          fullWidth
                          label="Type"
                          value={vehicleForm.type}
                          onChange={(event) => setVehicleForm((prev) => ({ ...prev, type: event.target.value }))}
                        >
                          {(isLarge ? VEHICLE_TYPES_LARGE : VEHICLE_TYPES_SMALL).map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Capacity"
                          value={vehicleForm.capacity}
                          onChange={(event) => setVehicleForm((prev) => ({ ...prev, capacity: event.target.value }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Rate/km"
                          value={vehicleForm.costPerKm}
                          onChange={(event) => setVehicleForm((prev) => ({ ...prev, costPerKm: event.target.value }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button fullWidth variant="contained" color={sidebarColor} type="submit" sx={{ height: 56 }} startIcon={<Add />}>
                          Add
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                <Grid container spacing={3}>
                  {vehicles.map((vehicle) => (
                    <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ bgcolor: vehicle.available ? 'success.main' : 'grey.500' }}>
                                {isLarge ? <DirectionsCar /> : <TwoWheeler />}
                              </Avatar>
                              <Box>
                                <Typography fontWeight="bold">{vehicle.number}</Typography>
                                <Typography variant="caption" color="text.secondary">{vehicle.type}</Typography>
                              </Box>
                            </Stack>
                            <Chip size="small" label={vehicle.status} color={vehicle.available ? 'success' : 'default'} />
                          </Stack>

                          <Divider sx={{ mb: 2 }} />

                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Capacity</Typography>
                              <Typography variant="body2" fontWeight="bold">{vehicle.capacity}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">Rate</Typography>
                              <Typography variant="body2" fontWeight="bold">₹{vehicle.costPerKm}/km</Typography>
                            </Stack>
                          </Stack>

                          <Divider sx={{ my: 2 }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body2">Available</Typography>
                              <Switch
                                color={sidebarColor}
                                checked={vehicle.available}
                                onChange={() => toggleVehicleAvailability(vehicle)}
                              />
                            </Stack>
                            <IconButton color="error" onClick={() => deleteVehicle(vehicle.id)}>
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

            {activeSection === 'notifications' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>Notifications</Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {['all', 'unread', 'order', 'delivery', 'alert'].map((filter) => (
                      <Button
                        key={filter}
                        size="small"
                        variant={notificationFilter === filter ? 'contained' : 'outlined'}
                        onClick={() => {
                          setNotificationFilter(filter);
                          setNotificationPage(1);
                        }}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </Stack>

                  {notifications.map((entry) => (
                    <Card
                      key={entry.id}
                      sx={{ bgcolor: entry.read ? 'background.paper' : 'action.hover', cursor: entry.read ? 'default' : 'pointer' }}
                      onClick={() => !entry.read && markOneNotificationRead(entry.id)}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Avatar sx={{ bgcolor: entry.type === 'alert' ? 'warning.main' : entry.type === 'delivery' ? 'success.main' : 'info.main' }}>
                            {entry.type === 'delivery' ? <LocalShipping /> : <Notifications />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography fontWeight={entry.read ? 500 : 700}>{entry.title}</Typography>
                              {!entry.read && <Chip label="New" size="small" color="error" />}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{entry.message}</Typography>
                            <Typography variant="caption" color="text.secondary">{entry.time}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outlined" onClick={markAllNotificationsRead}>Mark all as read</Button>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">Page {notificationPage} of {notificationTotalPages}</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" disabled={notificationPage <= 1} onClick={() => setNotificationPage((prev) => Math.max(1, prev - 1))}>Prev</Button>
                      <Button size="small" variant="outlined" disabled={notificationPage >= notificationTotalPages} onClick={() => setNotificationPage((prev) => Math.min(notificationTotalPages, prev + 1))}>Next</Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            )}

            {activeSection === 'profile' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Avatar sx={{ width: 92, height: 92, mx: 'auto', mb: 2, bgcolor: `${sidebarColor}.main` }}>
                      {isLarge ? <DirectionsCar sx={{ fontSize: 42 }} /> : <TwoWheeler sx={{ fontSize: 42 }} />}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">{profileForm.name || 'Delivery Partner'}</Typography>
                    <Typography variant="body2" color="text.secondary">{profileForm.email}</Typography>
                    <Chip sx={{ mt: 1.5 }} color={sidebarColor} label={isLarge ? 'Large-scale partner' : 'Last-mile partner'} />

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Fleet</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.totalVehicles}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Active Deliveries</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.activeDeliveries}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Completed</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.completedDeliveries}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Delivery Agency Profile</Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="name" label="Name" value={profileForm.name} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="email" label="Email" value={profileForm.email} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="phone" label="Phone" value={profileForm.phone} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="licenseNumber" label="License Number" value={profileForm.licenseNumber} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="accountType" label="Account Type" value={profileForm.accountType} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Role" value={isLarge ? 'Delivery Large' : 'Delivery Small'} disabled />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} name="address" label="Address" value={profileForm.address} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <Button variant="contained" color={sidebarColor} onClick={handleProfileUpdate}>Update Profile</Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Container>
        </Box>
      </Box>

      <Dialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, order: null, selectedVehicleId: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Fleet Vehicle</DialogTitle>
        <DialogContent>
          {assignDialog.order && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                {assignDialog.order.orderNumber}: {assignDialog.order.productSummary} (Qty {assignDialog.order.quantity})
              </Alert>

              {vehicles.filter((vehicle) => vehicle.available).length === 0 ? (
                <Alert severity="error">No available vehicles in your fleet.</Alert>
              ) : (
                <TextField
                  select
                  fullWidth
                  label="Select Available Vehicle"
                  value={assignDialog.selectedVehicleId}
                  onChange={(event) => setAssignDialog((prev) => ({ ...prev, selectedVehicleId: event.target.value }))}
                >
                  {vehicles
                    .filter((vehicle) => vehicle.available)
                    .map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.number} • {vehicle.type} • cap {vehicle.capacity}
                      </MenuItem>
                    ))}
                </TextField>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, order: null, selectedVehicleId: '' })}>Cancel</Button>
          <Button
            variant="contained"
            color={sidebarColor}
            onClick={handleAcceptRequest}
            disabled={!assignDialog.selectedVehicleId}
            startIcon={<CheckCircle />}
          >
            Accept Request
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeliveryDashboard;

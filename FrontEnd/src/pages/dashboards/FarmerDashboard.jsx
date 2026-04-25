import { useEffect, useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  MenuItem, Chip, Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Stack, IconButton, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, Snackbar, Alert, LinearProgress, CircularProgress, Autocomplete
} from '@mui/material';
import {
  Agriculture, Inventory, TrendingUp, AccountCircle,
  Add, Delete, Visibility, Notifications, Menu as MenuIcon,
  LocationOn,
  LocalShipping, AttachMoney, CheckCircle, Cancel,
  Verified, Home, Store, Schedule, Business,
  ShoppingCart, Refresh
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { authAPI, productAPI, orderAPI, inventoryAPI, analyticsAPI, deliveryAPI, categoryAPI, marketplaceRequestAPI, userAPI, notificationAPI } from '../../services/api';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

const defaultFarmerData = {
  _id: '',
  name: 'Farmer',
  farmName: 'My Farm',
  phone: '',
  email: '',
  address: '',
  totalLand: '--',
  experience: '--',
  organicCertified: false,
  stats: {
    totalCrops: 0,
    activeSales: 0,
    monthlyEarnings: 0,
    customerRating: 0,
    totalOrders: 0,
    pendingOrders: 0
  }
};

const FarmerDashboard = () => {
  // State for form input
  const [cropForm, setCropForm] = useState({ 
    type: '', 
    landSize: '', 
    available: true, 
    price: '', 
    season: '',
    quantity: ''
  });

  // API-driven state (replacing mock data)
  const [farmerData, setFarmerData] = useState(null);
  const [crops, setCrops] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [globalOrders, setGlobalOrders] = useState([]);
  const [myAcceptedOrders, setMyAcceptedOrders] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCrops: 0,
    activeSales: 0,
    monthlyEarnings: 0,
    customerRating: 0,
    totalOrders: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [cropCatalog, setCropCatalog] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotalPages, setNotificationTotalPages] = useState(1);
  const [profileForm, setProfileForm] = useState({
    name: '',
    farmName: '',
    phone: '',
    email: '',
    address: '',
    totalLand: '',
    experience: ''
  });

  useRealtimeNotifications({
    enabled: !loading,
    onNotification: () => {
      fetchNotifications(notificationPage, notificationFilter);
    }
  });

  const safeFarmerData = {
    ...defaultFarmerData,
    ...(farmerData || {}),
    stats: {
      ...defaultFarmerData.stats,
      ...(metrics || {}),
      ...(farmerData?.stats || {})
    }
  };
  const orders = myOrders;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const mapNotification = (n) => ({
    id: n._id || n.id,
    title: n.title || 'Notification',
    message: n.message || '',
    time: new Date(n.createdAt || Date.now()).toLocaleString('en-IN'),
    type: n.type === 'alert' ? 'warning' : n.type === 'order' ? 'success' : 'info',
    read: !!n.isRead
  });
  const selectedCropConfig = cropCatalog.find((crop) => crop.name === cropForm.type);
  const seasonOptions = selectedCropConfig?.seasons?.length
    ? selectedCropConfig.seasons
    : ['Kharif', 'Rabi', 'Summer', 'Winter', 'Year-round'];

  const mapRequestToOrderCard = (request, statusLabel = 'Open') => ({
    id: request._id || request.id,
    requestNumber: request.requestNumber,
    business: request.requesterId?.name || 'Business/Restaurant/Community',
    crop: request.cropName || 'Crop',
    quantity: `${request.quantity || 0} ${request.unit || 'kg'}`,
    priceOffered: Number(request.currentOfferPrice ?? request.farmerResponse?.offeredPrice ?? request.offeredPrice ?? 0),
    location: request.location || 'India',
    deadline: request.requiredBy ? new Date(request.requiredBy).toLocaleDateString() : 'N/A',
    status: statusLabel,
    rawStatus: request.status,
    lastOfferedBy: request.lastOfferedBy,
    type: request.requesterType || request.requesterRole || 'business'
  });

  // Initialize: Fetch farmer data on component mount
  useEffect(() => {
    const initializeFarmerData = async () => {
      try {
        setLoading(true);

        // Get current user (farmer profile)
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          const currentUser = userRes.data?.user || userRes.data;
          if (!currentUser?._id) {
            throw new Error('Invalid auth user payload');
          }

          setFarmerData({
            ...defaultFarmerData,
            ...currentUser,
            farmName: currentUser.farmName || defaultFarmerData.farmName,
            totalLand: currentUser.totalLand || defaultFarmerData.totalLand,
            experience: currentUser.experience || defaultFarmerData.experience,
            organicCertified: !!currentUser.organicCertified,
            stats: { ...defaultFarmerData.stats }
          });

          setProfileForm({
            name: currentUser.name || '',
            farmName: currentUser.farmName || '',
            phone: currentUser.phone || '',
            email: currentUser.email || '',
            address: currentUser.address || currentUser.addresses?.[0]?.line1 || '',
            totalLand: currentUser.totalLand || '',
            experience: currentUser.experience || ''
          });

          const cropCatalogRes = await productAPI.getCropCatalog();
          if (cropCatalogRes.success && cropCatalogRes.data?.crops) {
            setCropCatalog(cropCatalogRes.data.crops);
          }

          // Get farmer metrics (orders, earnings, etc.)
          const metricsRes = await analyticsAPI.getUserMetrics(currentUser._id);
          if (metricsRes.success && metricsRes.data.sellerMetrics) {
            const seller = metricsRes.data.sellerMetrics;
            setMetrics({
              totalCrops: 0,
              activeSales: seller.totalOrders || 0,
              monthlyEarnings: seller.totalEarned || 0,
              customerRating: 4.7,
              totalOrders: seller.totalOrders || 0,
              pendingOrders: 0
            });
          }

          // Get farmer's products (crops)
          const productsRes = await productAPI.getAll({ ownerId: currentUser._id });
          if (productsRes.success && productsRes.data?.products) {
            const mappedCrops = productsRes.data.products.map(p => ({
              id: p._id || p.id,
              type: p.name,
              landSize: p.landSize || '1',
              available: p.status === 'active',
              price: p.basePrice || 0,
              season: p.season || 'Year-round',
              quantity: p.stockQuantity || 0,
              planted: new Date(p.createdAt).toLocaleDateString(),
              status: p.status === 'active' ? 'Ready' : 'Growing'
            }));
            setCrops(mappedCrops);
            setMetrics((prev) => ({ ...prev, totalCrops: mappedCrops.length }));
          }

          const openRequestsRes = await marketplaceRequestAPI.getOpenForFarmer();
          if (openRequestsRes.success) {
            const openRequests = openRequestsRes.data?.requests || [];
            setGlobalOrders(openRequests.map((request) => mapRequestToOrderCard(request, request.status || 'Open')));
          }

          const acceptedRequestsRes = await marketplaceRequestAPI.getFarmerAccepted();
          if (acceptedRequestsRes.success) {
            const acceptedRequests = acceptedRequestsRes.data?.requests || [];
            setMyAcceptedOrders(acceptedRequests.map((request) => mapRequestToOrderCard(request, 'Accepted')));
          }

          // Load categories once to support product creation from crop form
          const categoriesRes = await categoryAPI.getAll();
          if (categoriesRes.success && categoriesRes.data) {
            const categories = categoriesRes.data.categories || [];
            if (categories.length > 0) {
              setDefaultCategoryId(categories[0]._id || categories[0].id || '');
            }
          }

          // Get farmer's orders (as seller)
          const ordersRes = await orderAPI.getAll({ sellerId: currentUser._id });
          if (ordersRes.success && ordersRes.data?.orders) {
            const mappedOrders = ordersRes.data.orders.map((o, idx) => ({
              id: idx + 1,
              customer: o.buyerId?.name || 'Customer',
              crop: o.orderItems?.[0]?.productName || 'Product',
              quantity: `${o.orderItems?.[0]?.quantity || 0} kg`,
              amount: o.total || 0,
              status: o.status || 'pending',
              date: new Date(o.createdAt).toLocaleDateString()
            }));
            setMyOrders(mappedOrders);
            setMetrics(prev => ({
              ...prev,
              pendingOrders: mappedOrders.filter(o => String(o.status || '').toLowerCase() === 'pending').length
            }));
          }

          await fetchNotifications(1, 'all');

        }
      } catch (error) {
        console.error('Error initializing farmer data:', error);
        // Fallback to empty state
      } finally {
        setLoading(false);
      }
    };

    initializeFarmerData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchNotifications = async (page = notificationPage, filter = notificationFilter) => {
    const params = { page, limit: 8 };
    if (filter === 'unread') params.unread = true;
    if (filter !== 'all' && filter !== 'unread') params.type = filter;

    const notificationsRes = await notificationAPI.getAll(params);
    if (notificationsRes.success) {
      setNotifications((notificationsRes.data || []).map(mapNotification));
      setNotificationTotalPages(notificationsRes.pagination?.totalPages || 1);
    }
  };

  useEffect(() => {
    const totalCrops = crops.length;
    const totalOrders = myOrders.length;
    const activeSales = myOrders.filter((order) => {
      const status = String(order.status || '').toLowerCase();
      return status !== 'cancelled' && status !== 'delivered';
    }).length;
    const pendingOrders = myOrders.filter((order) => String(order.status || '').toLowerCase() === 'pending').length;
    const monthlyEarnings = myOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);

    setMetrics((prev) => ({
      ...prev,
      totalCrops,
      totalOrders,
      activeSales,
      pendingOrders,
      monthlyEarnings: prev.monthlyEarnings || monthlyEarnings
    }));
  }, [crops, myOrders]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCropForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    if (!safeFarmerData._id) {
      showSnackbar('Unable to update profile. User not found.', 'error');
      return;
    }

    try {
      const payload = {
        name: profileForm.name,
        farmName: profileForm.farmName,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
        totalLand: profileForm.totalLand,
        experience: profileForm.experience
      };

      const res = await userAPI.update(safeFarmerData._id, payload);
      const updatedUser = res?.data?.user;

      if (updatedUser) {
        setFarmerData((prev) => ({
          ...prev,
          ...updatedUser,
          stats: prev?.stats || defaultFarmerData.stats
        }));
      }

      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to update profile', 'error');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      await fetchNotifications(notificationPage, notificationFilter);
      showSnackbar('All notifications marked as read', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to update notifications', 'error');
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      await fetchNotifications(notificationPage, notificationFilter);
    } catch {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    }
  };

  useEffect(() => {
    if (activeSection === 'notifications') {
      fetchNotifications(notificationPage, notificationFilter);
    }
  }, [activeSection, notificationPage, notificationFilter]);

  const addCrop = async (e) => {
    e.preventDefault();
    if (!cropForm.type || !cropForm.landSize || !cropForm.price) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }

    if (!cropCatalog.some((crop) => crop.name === cropForm.type)) {
      showSnackbar('Please select crop from the approved list', 'error');
      return;
    }

    try {
      const payload = {
        ownerId: safeFarmerData._id,
        name: cropForm.type,
        unit: 'kg',
        basePrice: Number(cropForm.price),
        stockQuantity: Number(cropForm.quantity || 0),
        landSize: String(cropForm.landSize),
        season: cropForm.season || 'Year-round',
        status: cropForm.available ? 'active' : 'out_of_stock',
        description: `${cropForm.type} from farmer inventory`
      };

      if (defaultCategoryId) {
        payload.categoryId = defaultCategoryId;
      }

      const res = await productAPI.create(payload);
      const p = res?.data?.product;
      if (!p) {
        throw new Error('Product creation failed');
      }

      setCrops((prev) => [
        ...prev,
        {
          id: p._id || p.id,
          type: p.name,
          landSize: p.landSize || cropForm.landSize,
          available: p.status === 'active',
          price: p.basePrice || cropForm.price,
          season: p.season || cropForm.season || 'Year-round',
          quantity: p.stockQuantity || Number(cropForm.quantity || 0),
          planted: new Date(p.createdAt || Date.now()).toLocaleDateString(),
          status: p.status === 'active' ? 'Ready' : 'Growing'
        }
      ]);

      setMetrics((prev) => ({ ...prev, totalCrops: (prev.totalCrops || 0) + 1 }));
      setCropForm({ type: '', landSize: '', available: true, price: '', season: '', quantity: '' });
      showSnackbar('Crop added and saved successfully!', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to save crop', 'error');
    }
  };

  const toggleAvailability = async (id) => {
    const crop = crops.find((c) => c.id === id);
    if (!crop) return;

    const newAvailable = !crop.available;
    try {
      await productAPI.update(id, { status: newAvailable ? 'active' : 'out_of_stock' });
      setCrops((prev) => prev.map((c) => {
        if (c.id === id) {
          return { ...c, available: newAvailable, status: newAvailable ? 'Ready' : 'Growing' };
        }
        return c;
      }));

      showSnackbar(
        `${crop.type} is now ${newAvailable ? 'available' : 'unavailable'} for sale`,
        'info'
      );
    } catch (error) {
      showSnackbar(error.message || 'Failed to update crop availability', 'error');
    }
  };

  const deleteCrop = async (id) => {
    const crop = crops.find(c => c.id === id);
    try {
      await productAPI.delete(id);
      setCrops((prev) => prev.filter((c) => c.id !== id));
      showSnackbar(`${crop?.type || 'Crop'} removed successfully`, 'info');
    } catch (error) {
      showSnackbar(error.message || 'Failed to delete crop', 'error');
    }
  };



  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'crops', label: 'My Crops', icon: <Agriculture />, badge: crops.length },
    { id: 'orders', label: 'Orders', icon: <Store />, badge: safeFarmerData.stats.pendingOrders },
    { id: 'marketplace', label: 'Order Marketplace', icon: <ShoppingCart />, badge: globalOrders.filter(o => o.status === 'Open').length },
    { id: 'inventory', label: 'Inventory', icon: <Inventory /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: unreadCount || null },
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
                                <Typography variant="body2" fontWeight="bold">{safeFarmerData.totalLand}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Active Crops</Typography>
                <Chip label={crops.filter(c => c.available).length} size="small" color="success" />
              </Stack>
              {safeFarmerData.organicCertified && (
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
                {safeFarmerData.farmName}
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
                              {safeFarmerData.stats.totalCrops}
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
                              {safeFarmerData.stats.activeSales}
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
                              ₹{(safeFarmerData.stats.monthlyEarnings / 1000).toFixed(1)}k
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
                              {safeFarmerData.stats.pendingOrders}
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
                              {safeFarmerData.stats.customerRating}/5.0
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(safeFarmerData.stats.customerRating / 5) * 100}
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
                        <Autocomplete
                          options={cropCatalog.map((crop) => crop.name)}
                          value={cropForm.type || null}
                          onChange={(_, value) => {
                            const selectedCrop = cropCatalog.find((crop) => crop.name === value);
                            setCropForm((prev) => ({
                              ...prev,
                              type: value || '',
                              season: selectedCrop?.seasons?.[0] || prev.season
                            }));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              required
                              label="Crop Type"
                              placeholder="Search crop"
                              helperText="Select from approved India crop list"
                            />
                          )}
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
                          {seasonOptions.map((season) => (
                            <MenuItem key={season} value={season}>{season}</MenuItem>
                          ))}
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

            {/* Order Marketplace */}
            {activeSection === 'marketplace' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Request Marketplace
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
                    Available Requests (Matching My Crops)
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {globalOrders.length > 0 ? (
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
                              
                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  startIcon={<CheckCircle />}
                                  onClick={async () => {
                                    try {
                                      await marketplaceRequestAPI.respond(order.id, { action: 'accept' });
                                      setMyAcceptedOrders((prev) => [...prev, { ...order, status: 'Accepted' }]);
                                      setGlobalOrders((prev) => prev.filter((o) => o.id !== order.id));
                                      showSnackbar(`Request accepted! You will supply ${order.quantity} of ${order.crop} to ${order.business}`, 'success');
                                    } catch (error) {
                                      showSnackbar(error.message || 'Failed to accept request', 'error');
                                    }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  onClick={async () => {
                                    const counter = Number(window.prompt('Enter your counter offer price per kg', String(order.priceOffered || 0)));
                                    if (!counter || Number.isNaN(counter) || counter <= 0) {
                                      showSnackbar('Valid counter offer is required', 'error');
                                      return;
                                    }
                                    try {
                                      await marketplaceRequestAPI.respond(order.id, { action: 'counter', offeredPrice: counter });
                                      setGlobalOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, priceOffered: counter, status: 'countered' } : o)));
                                      showSnackbar('Counter offer sent to buyer', 'success');
                                    } catch (error) {
                                      showSnackbar(error.message || 'Failed to send counter offer', 'error');
                                    }
                                  }}
                                >
                                  Counter
                                </Button>
                                <Button
                                  variant="text"
                                  color="error"
                                  onClick={async () => {
                                    try {
                                      await marketplaceRequestAPI.respond(order.id, { action: 'decline' });
                                      setGlobalOrders((prev) => prev.filter((o) => o.id !== order.id));
                                      showSnackbar('Request declined', 'info');
                                    } catch (error) {
                                      showSnackbar(error.message || 'Failed to decline request', 'error');
                                    }
                                  }}
                                >
                                  Decline
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                      No matching requests right now. Requests appear only for crops in My Crops.
                    </Typography>
                  )}
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
                      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                        {['all', 'unread', 'order', 'payment', 'delivery'].map((filter) => (
                          <Button
                            key={filter}
                            size="small"
                            variant={notificationFilter === filter ? 'contained' : 'outlined'}
                            onClick={() => {
                              setNotificationFilter(filter);
                              setNotificationPage(1);
                            }}
                          >
                            {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                          </Button>
                        ))}
                      </Stack>
                      <Stack spacing={2}>
                        {notifications.map((notification) => (
                          <Card
                            key={notification.id}
                            sx={{ bgcolor: notification.read ? 'background.paper' : 'action.hover', cursor: notification.read ? 'default' : 'pointer' }}
                            onClick={() => !notification.read && markNotificationRead(notification.id)}
                          >
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
                      <Button fullWidth variant="outlined" sx={{ mt: 3 }} onClick={markAllNotificationsRead}>
                        Mark All as Read
                      </Button>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">Page {notificationPage} of {notificationTotalPages}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" disabled={notificationPage <= 1} onClick={() => setNotificationPage((p) => Math.max(1, p - 1))}>Prev</Button>
                          <Button size="small" variant="outlined" disabled={notificationPage >= notificationTotalPages} onClick={() => setNotificationPage((p) => Math.min(notificationTotalPages, p + 1))}>Next</Button>
                        </Stack>
                      </Stack>
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
                      {safeFarmerData.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {safeFarmerData.farmName}
                    </Typography>
                    {safeFarmerData.organicCertified && (
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
                        <Typography variant="body2" fontWeight="bold">{safeFarmerData.experience}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Land</Typography>
                        <Typography variant="body2" fontWeight="bold">{safeFarmerData.totalLand}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Orders</Typography>
                        <Typography variant="body2" fontWeight="bold">{safeFarmerData.stats.totalOrders}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Rating</Typography>
                        <Chip label={`${safeFarmerData.stats.customerRating}/5.0`} size="small" color="success" />
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
                        <TextField fullWidth label="Farmer Name" name="name" value={profileForm.name} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Farm Name" name="farmName" value={profileForm.farmName} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" name="phone" value={profileForm.phone} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" name="email" type="email" value={profileForm.email} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          name="address"
                          label="Address" 
                          multiline 
                          rows={3} 
                          value={profileForm.address}
                          onChange={onProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Total Land (acres)" name="totalLand" value={profileForm.totalLand} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Experience" name="experience" value={profileForm.experience} onChange={onProfileChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                          <Button variant="contained" size="large" onClick={handleProfileUpdate}>
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

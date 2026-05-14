import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Box, Container, Grid, AppBar, Toolbar, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Stack, IconButton, Badge,
  Snackbar, Alert, Typography, Divider, CircularProgress
} from '@mui/material';
import {
  Agriculture, Home, Notifications, Menu as MenuIcon,
  AccountBalanceWallet, Inventory, AccountCircle,
  Store, ShoppingCart, TrendingUp
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { authAPI, notificationAPI, userAPI } from '../../services/api';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import VerificationBanner from '../../Components/VerificationBanner';
// Custom hooks for data management
import { useFarmerCrops } from '../../hooks/useFarmerCrops';
import { useFarmerOrders } from '../../hooks/useFarmerOrders';
import { useFarmerPayouts, useFarmerMetrics } from '../../hooks/useFarmerPayouts';
// Memoized panel components
import FarmerCropsPanel from './farmer/FarmerCropsPanel';
import FarmerOrdersPanel from './farmer/FarmerOrdersPanel';
import FarmerPayoutsPanel from './farmer/FarmerPayoutsPanel';
import FarmerProfilePanel from './farmer/FarmerProfilePanel';

const FarmerDashboard = () => {
  // Data management with custom hooks - significantly reduced state
  const { crops, loading: cropsLoading, error: cropsError, fetchCrops, addCrop, updateCrop, deleteCrop } = useFarmerCrops();
  const { orders, openRequests, acceptedRequests, loading: ordersLoading, error: ordersError, fetchOrders, fetchOpenRequests, fetchAcceptedRequests } = useFarmerOrders();
  const { payouts, summary: payoutSummary, loading: payoutsLoading, error: payoutsError, fetchPayouts } = useFarmerPayouts();
  const { metrics, loading: metricsLoading, error: metricsError, fetchMetrics } = useFarmerMetrics();

  // Minimal UI state
  const [farmerData, setFarmerData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [notifications, setNotifications] = useState([]);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotalPages, setNotificationTotalPages] = useState(1);

  useRealtimeNotifications({
    enabled: !!farmerData,
    onNotification: () => {
      if (activeSection === 'notifications') {
        fetchNotifications(notificationPage);
      }
    }
  });

  // Initialize farmer data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          const currentUser = userRes.data?.user || userRes.data;
          setFarmerData(currentUser);
          
          // Fetch all data in parallel
          await Promise.all([
            fetchCrops(currentUser._id),
            fetchOrders(currentUser._id),
            fetchMetrics(currentUser._id),
            fetchPayouts(),
            fetchNotifications(1)
          ]);
        }
      } catch (error) {
        console.error('Error initializing farmer data:', error);
        showSnackbar('Error loading dashboard data', 'error');
      }
    };

    initializeData();
  }, [fetchCrops, fetchOrders, fetchMetrics, fetchPayouts]);

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchNotifications = useCallback(async (page = 1) => {
    try {
      const response = await notificationAPI.getAll({ page, limit: 8 });
      if (response.success) {
        setNotifications(response.data || []);
        setNotificationTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Memoized computed values to prevent unnecessary recalculations
  const totalLoading = useMemo(() => 
    cropsLoading || ordersLoading || payoutsLoading || metricsLoading,
    [cropsLoading, ordersLoading, payoutsLoading, metricsLoading]
  );

  const unreadCount = useMemo(() => 
    notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const menuItems = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'crops', label: 'My Crops', icon: <Agriculture />, badge: crops.length },
    { id: 'orders', label: 'Orders', icon: <Store />, badge: orders.filter(o => o.rawStatus === 'pending').length },
    { id: 'earnings', label: 'Earnings', icon: <AccountBalanceWallet />, badge: payouts.length || null },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart />, badge: openRequests.filter(o => o.status === 'Open').length },
    { id: 'inventory', label: 'Inventory', icon: <Inventory /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: unreadCount || null },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ], [crops, orders, payouts, openRequests, unreadCount]);

  if (!farmerData || totalLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'crops':
        return <FarmerCropsPanel crops={crops} loading={cropsLoading} error={cropsError} onAdd={addCrop} onUpdate={updateCrop} onDelete={deleteCrop} />;
      case 'orders':
        return <FarmerOrdersPanel orders={orders} loading={ordersLoading} error={ordersError} />;
      case 'earnings':
        return <FarmerPayoutsPanel payouts={payouts} summary={payoutSummary} loading={payoutsLoading} error={payoutsError} />;
      case 'profile':
        return <FarmerProfilePanel farmer={farmerData} loading={false} error={null} onUpdate={async (data) => {
          if (!farmerData?._id) {
            throw new Error('Unable to update profile');
          }

          const payload = {
            name: data.name,
            phone: data.phone,
            email: data.email
          };

          const response = await userAPI.update(farmerData._id, payload);
          const updatedUser = response?.data?.user || response?.data;

          if (updatedUser) {
            setFarmerData((prev) => ({
              ...prev,
              ...updatedUser
            }));
          } else {
            setFarmerData((prev) => ({
              ...prev,
              ...payload
            }));
          }
        }} />;
      default:
        // Overview section
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">{metrics.totalCrops || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Total Crops</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="info.main">{metrics.activeSales || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Active Sales</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">₹{(metrics.monthlyEarnings / 1000).toFixed(0)}k</Typography>
                <Typography variant="body2" color="text.secondary">Monthly Earnings</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="error.main">{metrics.totalOrders || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Total Orders</Typography>
              </Box>
            </Grid>
          </Grid>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Agriculture color="success" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="success.main">FarmKart</Typography>
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
                sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: 'success.main', color: 'white' } }}
              >
                <ListItemIcon>{item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Desktop Sidebar */}
      <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ position: 'sticky', top: 0, p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Agriculture color="success" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="success.main">FarmKart</Typography>
          </Stack>
          <List>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                sx={{ borderRadius: 2, mb: 1, '&.Mui-selected': { bgcolor: 'success.main', color: 'white' } }}
              >
                <ListItemIcon>{item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">{farmerData.farmName || 'Farm'}</Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="success" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={unreadCount} color="error"><Notifications /></Badge>
              </IconButton>
              <ProfileDropdown />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {renderContent()}
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
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FarmerDashboard;

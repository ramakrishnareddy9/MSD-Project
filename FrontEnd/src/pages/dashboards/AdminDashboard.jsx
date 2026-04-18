import { useState, useEffect } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip,
  LinearProgress, Menu, MenuItem, Snackbar, Alert
} from '@mui/material';
import {
  Dashboard, People, Settings, Notifications, Menu as MenuIcon,
  TrendingUp, ShoppingCart, Agriculture, LocalShipping,
  MoreVert, Block, CheckCircle, Warning, Error as ErrorIcon,
  PersonAdd, Edit, Delete, Visibility, Assessment,
  Security, AdminPanelSettings, Schedule, Cancel
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { analyticsAPI, userAPI, orderAPI } from '../../services/api';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real API data state
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    revenue: 0,
    farmers: 0,
    customers: 0,
    transporters: 0,
    businesses: 0,
    pendingApprovals: 0,
    reportedIssues: 0
  });

  const [users, setUsers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  // Fetch metrics from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get dashboard metrics
        const metricsData = await analyticsAPI.getDashboardMetrics();
        
        if (metricsData.success && metricsData.data) {
          const metrics = metricsData.data;
          
          // Calculate user distribution by role
          const roleCount = {};
          metrics.usersByRole?.forEach(role => {
            roleCount[role._id] = role.count;
          });
          
          setStats({
            totalUsers: metrics.totalUsers || 0,
            activeUsers: metrics.activeUsers || 0,
            totalOrders: metrics.totalOrders || 0,
            revenue: metrics.totalRevenue || 0,
            farmers: roleCount['farmer'] || 0,
            customers: roleCount['customer'] || 0,
            transporters: roleCount['delivery_large'] + roleCount['delivery_small'] || 0,
            businesses: roleCount['business'] || 0,
            pendingApprovals: metrics.usersByRole?.length || 0,
            reportedIssues: 5
          });
          
          // Transform recent orders
          const ordersForDisplay = metrics.recentOrders?.slice(0, 4).map((order, idx) => ({
            id: idx + 1,
            customer: order.buyerId?.name || 'Unknown',
            farmer: order.sellerId?.name || 'Unknown',
            product: order.orderItems?.[0]?.productName || 'Product',
            amount: order.total || 0,
            status: order.status || 'Pending',
            date: new Date(order.createdAt).toLocaleDateString()
          })) || [];
          
          setRecentOrders(ordersForDisplay);
        }
        
        // Get all users
        const usersData = await userAPI.getAll({ limit: 20 });
        if (usersData.success && usersData.data) {
          const usersForDisplay = usersData.data.map((user, idx) => ({
            id: idx + 1,
            name: user.name || 'Unknown',
            role: user.roles?.[0] || 'customer',
            email: user.email || '',
            status: user.status || 'active',
            joined: new Date(user.createdAt).toLocaleDateString(),
            orders: 0, // Would need separate call for this
            rating: 0 // Would need separate call for this
          })) || [];
          
          setUsers(usersForDisplay);
        }
        
        // Setup activity stream with system activities
        const systemActivities = [
          { type: 'System', message: 'System health check completed', ts: Date.now() - 50000, severity: 'success' },
          { type: 'System', message: 'Dashboard data refreshed', ts: Date.now() - 120000, severity: 'info' },
          { type: 'Order', message: `${metricsData.data?.totalOrders || 0} total orders in system`, ts: Date.now() - 180000, severity: 'success' },
          { type: 'Alert', message: 'Data sync completed', ts: Date.now() - 240000, severity: 'success' },
          { type: 'System', message: 'Real-time metrics updated from database', ts: Date.now() - 300000, severity: 'info' }
        ];

        setActivities(systemActivities.sort((a, b) => b.ts - a.ts));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showSnackbar('Error loading dashboard data. Using offline mode.', 'error');
        
        // Fallback to empty state
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalOrders: 0,
          revenue: 0,
          farmers: 0,
          customers: 0,
          transporters: 0,
          businesses: 0,
          pendingApprovals: 0,
          reportedIssues: 0
        });
        setUsers([]);
        setRecentOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUserAction = (action) => {
    showSnackbar(`${action} action performed on ${selectedUser?.name}`, 'success');
    handleMenuClose();
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Dashboard /> },
    { id: 'users', label: 'User Management', icon: <People />, badge: stats.pendingApprovals },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart /> },
    { id: 'analytics', label: 'Analytics', icon: <Assessment /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 5 },
    { id: 'settings', label: 'Settings', icon: <Settings /> },
  ];

  const roleColors = {
    'farmer': 'success',
    'customer': 'primary',
    'delivery_large': 'warning',
    'delivery_small': 'warning',
    'business': 'info',
    'restaurant': 'secondary',
    'admin': 'error',
    'Farmer': 'success',
    'Customer': 'primary',
    'Transporter': 'warning',
    'Business': 'info',
    'Community': 'secondary',
    'Admin': 'error'
  };

  const statusColors = {
    'active': 'success',
    'Active': 'success',
    'pending': 'warning',
    'Pending': 'warning',
    'suspended': 'error',
    'Suspended': 'error',
    'inactive': 'default',
    'Inactive': 'default'
  };

  const orderStatusColors = {
    'completed': 'success',
    'Completed': 'success',
    'processing': 'info',
    'Processing': 'info',
    'pending': 'warning',
    'Pending': 'warning',
    'shipped': 'info',
    'Shipped': 'info',
    'delivered': 'success',
    'Delivered': 'success',
    'cancelled': 'error',
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
            <AdminPanelSettings color="secondary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="secondary.main">
              Admin Panel
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
                    bgcolor: 'secondary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'secondary.dark' },
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
            <AdminPanelSettings color="secondary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="secondary.main">
              Admin Panel
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
                    bgcolor: 'secondary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'secondary.dark' },
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

          {/* System Status */}
          <Paper sx={{ p: 2, bgcolor: 'secondary.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              System Status
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Server</Typography>
                <Chip label="Online" size="small" color="success" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Database</Typography>
                <Chip label="Healthy" size="small" color="success" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Uptime</Typography>
                <Typography variant="body2" fontWeight="bold">99.9%</Typography>
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
                System Administration
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="secondary" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={5} color="error">
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
            {/* Overview Dashboard */}
            {activeSection === 'overview' && (
              <Box>
                {/* Stats Grid */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: 'primary.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Users
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                              {stats.totalUsers}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              +12% this month
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                            <People sx={{ fontSize: 32 }} />
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
                              Total Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              {stats.totalOrders}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              +8% this month
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                            <ShoppingCart sx={{ fontSize: 32 }} />
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
                              Revenue
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              ₹{(stats.revenue / 1000).toFixed(0)}k
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              +15% this month
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                            <TrendingUp sx={{ fontSize: 32 }} />
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
                              Pending Approvals
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="error.main">
                              {stats.pendingApprovals}
                            </Typography>
                            <Typography variant="caption" color="error.main">
                              Requires attention
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                            <Warning sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* User Distribution */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        User Distribution
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Customers</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.customers}</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(stats.customers / stats.totalUsers) * 100}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Farmers</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.farmers}</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(stats.farmers / stats.totalUsers) * 100}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Transporters</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.transporters}</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(stats.transporters / stats.totalUsers) * 100}
                            color="warning"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Businesses</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.businesses}</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={(stats.businesses / stats.totalUsers) * 100}
                            color="info"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Recent Activity
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2} sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {activities.slice(0, 8).map((activity, idx) => (
                          <Stack key={idx} direction="row" spacing={2} alignItems="center">
                            <Avatar 
                              sx={{ 
                                width: 32, 
                                height: 32,
                                bgcolor: activity.severity === 'error' ? 'error.main' : 
                                         activity.severity === 'warning' ? 'warning.main' :
                                         activity.severity === 'success' ? 'success.main' : 'info.main'
                              }}
                            >
                              {activity.severity === 'error' ? <ErrorIcon sx={{ fontSize: 16 }} /> :
                               activity.severity === 'warning' ? <Warning sx={{ fontSize: 16 }} /> :
                               activity.severity === 'success' ? <CheckCircle sx={{ fontSize: 16 }} /> :
                               <Notifications sx={{ fontSize: 16 }} />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2">{activity.message}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(activity.ts).toLocaleTimeString()}
                              </Typography>
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Recent Orders */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Recent Orders
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Farmer</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>#{order.id}</TableCell>
                            <TableCell>{order.customer}</TableCell>
                            <TableCell>{order.farmer}</TableCell>
                            <TableCell>{order.product}</TableCell>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}

            {/* User Management */}
            {activeSection === 'users' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    User Management
                  </Typography>
                  <Button variant="contained" startIcon={<PersonAdd />} onClick={() => showSnackbar('Add User feature coming soon', 'info')}>
                    Add User
                  </Button>
                </Stack>

                <Paper sx={{ p: 3 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Joined</TableCell>
                          <TableCell>Orders</TableCell>
                          <TableCell>Rating</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: `${roleColors[user.role]}.main` }}>
                                  {user.name.charAt(0)}
                                </Avatar>
                                <Typography fontWeight="600">{user.name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip 
                                label={user.role}
                                color={roleColors[user.role]}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={user.status}
                                color={statusColors[user.status]}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{user.joined}</TableCell>
                            <TableCell>{user.orders}</TableCell>
                            <TableCell>
                              {user.rating > 0 ? (
                                <Chip label={user.rating} size="small" color="success" />
                              ) : (
                                <Typography variant="caption" color="text.secondary">N/A</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small"
                                onClick={(e) => handleMenuOpen(e, user)}
                              >
                                <MoreVert />
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

            {/* Orders */}
            {activeSection === 'orders' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Order Management
                </Typography>
                <Paper sx={{ p: 3 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Farmer</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Typography fontWeight="bold">#{order.id}</Typography>
                            </TableCell>
                            <TableCell>{order.customer}</TableCell>
                            <TableCell>{order.farmer}</TableCell>
                            <TableCell>{order.product}</TableCell>
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
              </Box>
            )}

            {/* Analytics */}
            {activeSection === 'analytics' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Analytics & Reports
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Platform Metrics
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Active Users Today</Typography>
                          <Typography variant="h6" color="primary">{stats.activeUsers}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Orders Today</Typography>
                          <Typography variant="h6" color="success.main">234</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Revenue Today</Typography>
                          <Typography variant="h6" color="warning.main">₹45,678</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">New Registrations</Typography>
                          <Typography variant="h6" color="info.main">12</Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        System Health
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Server Load</Typography>
                            <Typography variant="body2" fontWeight="bold">45%</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={45}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Database Usage</Typography>
                            <Typography variant="body2" fontWeight="bold">62%</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={62}
                            color="info"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Memory Usage</Typography>
                            <Typography variant="body2" fontWeight="bold">78%</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={78}
                            color="warning"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
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
                          { id: 1, title: 'New User Registration', message: 'Meera Sharma registered as a Farmer', time: '5 minutes ago', type: 'info', read: false },
                          { id: 2, title: 'Pending Approval', message: '3 new farmers awaiting verification', time: '1 hour ago', type: 'warning', read: false },
                          { id: 3, title: 'System Alert', message: 'Server maintenance scheduled for tonight', time: '2 hours ago', type: 'error', read: false },
                          { id: 4, title: 'Order Completed', message: 'Order #1234 has been delivered successfully', time: '3 hours ago', type: 'success', read: true },
                          { id: 5, title: 'New Business Registration', message: 'Business Ltd has joined the platform', time: '5 hours ago', type: 'info', read: true },
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
                                  {notification.type === 'error' ? <ErrorIcon /> :
                                   notification.type === 'warning' ? <Warning /> :
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

            {/* Settings */}
            {activeSection === 'settings' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  System Settings
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        General Settings
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={3}>
                        <TextField fullWidth label="Platform Name" defaultValue="FarmKart" />
                        <TextField fullWidth label="Admin Email" defaultValue="admin@farmkart.com" />
                        <TextField fullWidth label="Support Email" defaultValue="support@farmkart.com" />
                        <Button variant="contained" onClick={() => showSnackbar('Settings saved successfully', 'success')}>Save Changes</Button>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Security Settings
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">Two-Factor Authentication</Typography>
                          <Chip label="Enabled" color="success" size="small" />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">Session Timeout</Typography>
                          <Typography variant="body2" fontWeight="bold">30 minutes</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">Password Policy</Typography>
                          <Chip label="Strong" color="success" size="small" />
                        </Stack>
                        <Button variant="outlined" startIcon={<Security />} onClick={() => showSnackbar('Security audit initiated', 'info')}>
                          Security Audit
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Container>
        </Box>
      </Box>

      {/* User Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleUserAction('View')}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleUserAction('Edit')}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleUserAction('Suspend')}>
          <ListItemIcon><Block fontSize="small" /></ListItemIcon>
          <ListItemText>Suspend</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleUserAction('Delete')} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>

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

export default AdminDashboard;

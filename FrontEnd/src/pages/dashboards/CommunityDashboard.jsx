import { useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  People, ShoppingCart, AccountCircle,
  Add, Notifications, Menu as MenuIcon, Dashboard, Home,
  LocalShipping, AttachMoney, Event, Message,
  CheckCircle, Schedule, Cancel, Apartment, Phone,
  Savings, Store
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';

const CommunityDashboard = () => {
  const [bulkOrders, setBulkOrders] = useState([
    { id: 1, item: 'Rice', quantity: '500 kg', notes: 'Premium quality needed', date: '2024-01-15', status: 'Delivered', amount: 15000 },
    { id: 2, item: 'Wheat', quantity: '300 kg', notes: 'Organic preferred', date: '2024-01-10', status: 'In Transit', amount: 9000 },
    { id: 3, item: 'Vegetables Mix', quantity: '200 kg', notes: 'Fresh seasonal vegetables', date: '2024-01-05', status: 'Processing', amount: 8000 },
    { id: 4, item: 'Fruits Basket', quantity: '150 kg', notes: 'Seasonal fruits', date: '2024-01-03', status: 'Delivered', amount: 12000 }
  ]);
  
  const [form, setForm] = useState({ item: '', quantity: '', notes: '' });
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [communityData] = useState({
    name: 'Green Valley Community',
    address: 'Green Valley Housing Society, Sector 15, Pune, Maharashtra - 411045',
    manager: {
      name: 'Rajesh Kumar',
      phone: '+91 9876543210',
      email: 'rajesh.kumar@greenvalley.com',
      position: 'Community Manager',
      joinDate: 'March 2023'
    },
    stats: {
      totalMembers: 450,
      activeOrders: 12,
      totalSpent: 125000,
      monthlySavings: 15000,
      bulkOrders: 45,
      satisfaction: 92
    },
    members: [
      { id: 1, name: 'Amit Sharma', apartment: 'A-101', phone: '+91 9876543211', joinDate: '2023-01-15', status: 'Active' },
      { id: 2, name: 'Priya Patel', apartment: 'B-205', phone: '+91 9876543212', joinDate: '2023-02-20', status: 'Active' },
      { id: 3, name: 'Suresh Reddy', apartment: 'C-304', phone: '+91 9876543213', joinDate: '2023-03-10', status: 'Active' },
      { id: 4, name: 'Rahul Singh', apartment: 'D-405', phone: '+91 9876543214', joinDate: '2023-04-15', status: 'Active' },
      { id: 5, name: 'Anjali Desai', apartment: 'E-502', phone: '+91 9876543215', joinDate: '2023-05-20', status: 'Inactive' }
    ]
  });

  const [announcements] = useState([
    { id: 1, title: 'Bulk Order Discount', message: 'Get 15% off on orders above ₹10,000', date: '2024-01-20', type: 'offer' },
    { id: 2, title: 'Community Meeting', message: 'Monthly meeting scheduled for Jan 25th', date: '2024-01-18', type: 'event' },
    { id: 3, title: 'New Farmer Partnership', message: 'Fresh organic produce now available', date: '2024-01-15', type: 'info' }
  ]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const placeOrder = (e) => {
    e.preventDefault();
    if (!form.item || !form.quantity) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    setBulkOrders((prev) => [...prev, { 
      id: Date.now(), 
      ...form, 
      date: new Date().toISOString().split('T')[0],
      status: 'Processing',
      amount: Math.floor(Math.random() * 10000) + 5000
    }]);
    setForm({ item: '', quantity: '', notes: '' });
    setDialogOpen(false);
    showSnackbar('Bulk order placed successfully!', 'success');
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    { id: 'orders', label: 'Bulk Orders', icon: <ShoppingCart />, badge: communityData.stats.activeOrders },
    { id: 'members', label: 'Members', icon: <People />, badge: communityData.stats.totalMembers },
    { id: 'announcements', label: 'Announcements', icon: <Message /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 6 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const orderStatusColors = {
    'Delivered': 'success',
    'In Transit': 'info',
    'Processing': 'warning',
    'Cancelled': 'error'
  };

  const announcementTypeColors = {
    'offer': 'success',
    'event': 'info',
    'info': 'primary',
    'alert': 'warning'
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
            <People color="info" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="info.main">
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
                    bgcolor: 'info.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'info.dark' },
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
            <People color="info" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="info.main">
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
                    bgcolor: 'info.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'info.dark' },
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

          {/* Community Stats */}
          <Paper sx={{ p: 2, bgcolor: 'info.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Community Stats
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Members</Typography>
                <Chip label={communityData.stats.totalMembers} size="small" color="info" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Active Orders</Typography>
                <Chip label={communityData.stats.activeOrders} size="small" color="warning" />
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
                {communityData.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="info" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={6} color="error">
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
                    <Card sx={{ bgcolor: 'info.lighter' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Members
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              {communityData.stats.totalMembers}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                            <People sx={{ fontSize: 32 }} />
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
                              Active Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              {communityData.stats.activeOrders}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
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
                              Monthly Savings
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              ₹{(communityData.stats.monthlySavings / 1000).toFixed(1)}k
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                            <Savings sx={{ fontSize: 32 }} />
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
                              Total Spent
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="error.main">
                              ₹{(communityData.stats.totalSpent / 1000).toFixed(0)}k
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                            <AttachMoney sx={{ fontSize: 32 }} />
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
                          Recent Bulk Orders
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
                              <TableCell>Item</TableCell>
                              <TableCell>Quantity</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {bulkOrders.slice(0, 5).map((order) => (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <Typography fontWeight="600">{order.item}</Typography>
                                  {order.notes && (
                                    <Typography variant="caption" color="text.secondary">
                                      {order.notes}
                                    </Typography>
                                  )}
                                </TableCell>
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
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>

                    {/* Satisfaction Metrics */}
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Community Satisfaction
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Overall Satisfaction</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {communityData.stats.satisfaction}%
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={communityData.stats.satisfaction}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Order Fulfillment</Typography>
                            <Typography variant="body2" fontWeight="bold">95%</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={95}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    {/* Announcements */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Announcements
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        {announcements.slice(0, 3).map((announcement) => (
                          <Card key={announcement.id} variant="outlined">
                            <CardContent>
                              <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {announcement.title}
                                </Typography>
                                <Chip 
                                  label={announcement.type}
                                  color={announcementTypeColors[announcement.type]}
                                  size="small"
                                />
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {announcement.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {announcement.date}
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                      <Button fullWidth sx={{ mt: 2 }} onClick={() => setActiveSection('announcements')}>
                        View All
                      </Button>
                    </Paper>

                    {/* Quick Stats */}
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quick Stats
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Bulk Orders</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {communityData.stats.bulkOrders}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Avg Order Value</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ₹{Math.floor(communityData.stats.totalSpent / communityData.stats.bulkOrders)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Savings per Member</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            ₹{Math.floor(communityData.stats.monthlySavings / communityData.stats.totalMembers)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Bulk Orders */}
            {activeSection === 'orders' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Bulk Orders
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
                          <TableCell>Item</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bulkOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Typography fontWeight="bold">#{order.id}</Typography>
                            </TableCell>
                            <TableCell>{order.item}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {order.notes || 'N/A'}
                              </Typography>
                            </TableCell>
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

            {/* Members */}
            {activeSection === 'members' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Community Members
                </Typography>
                <Paper sx={{ p: 3 }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Apartment</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Join Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {communityData.members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: 'info.main' }}>
                                  {member.name.charAt(0)}
                                </Avatar>
                                <Typography fontWeight="600">{member.name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Apartment sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography>{member.apartment}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography>{member.phone}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{member.joinDate}</TableCell>
                            <TableCell>
                              <Chip 
                                label={member.status}
                                color={member.status === 'Active' ? 'success' : 'default'}
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

            {/* Announcements */}
            {activeSection === 'announcements' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Community Announcements
                </Typography>
                <Grid container spacing={3}>
                  {announcements.map((announcement) => (
                    <Grid item xs={12} md={6} key={announcement.id}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {announcement.title}
                            </Typography>
                            <Chip 
                              label={announcement.type}
                              color={announcementTypeColors[announcement.type]}
                              size="small"
                            />
                          </Stack>
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                            {announcement.message}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Event sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {announcement.date}
                            </Typography>
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
                          { id: 1, title: 'New Member Joined', message: '3 new members have joined the community', time: '20 minutes ago', type: 'success', read: false },
                          { id: 2, title: 'Bulk Order Ready', message: 'Your bulk order is ready for pickup', time: '2 hours ago', type: 'info', read: false },
                          { id: 3, title: 'Community Event', message: 'Farmers market this Saturday at 9 AM', time: '4 hours ago', type: 'info', read: false },
                          { id: 4, title: 'Payment Reminder', message: 'Monthly contribution due in 3 days', time: '1 day ago', type: 'warning', read: false },
                          { id: 5, title: 'Order Delivered', message: 'Community order #234 has been delivered', time: '2 days ago', type: 'success', read: true },
                          { id: 6, title: 'New Announcement', message: 'Check the latest announcement from admin', time: '3 days ago', type: 'info', read: true },
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
                                      <Chip label="New" color="info" size="small" />
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
                        bgcolor: 'info.main',
                        fontSize: '3rem'
                      }}
                    >
                      <People sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {communityData.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Housing Society
                    </Typography>
                    <Chip label="Verified Community" color="success" icon={<CheckCircle />} sx={{ mb: 2 }} />
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Members</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {communityData.stats.totalMembers}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Bulk Orders</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {communityData.stats.bulkOrders}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Savings</Typography>
                        <Chip 
                          label={`₹${(communityData.stats.monthlySavings / 1000).toFixed(1)}k`}
                          size="small" 
                          color="success" 
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Community Information
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          label="Community Name" 
                          defaultValue={communityData.name} 
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          label="Address" 
                          multiline 
                          rows={2} 
                          defaultValue={communityData.address} 
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Manager Information
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          label="Manager Name" 
                          defaultValue={communityData.manager.name} 
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          label="Position" 
                          defaultValue={communityData.manager.position} 
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          label="Phone" 
                          defaultValue={communityData.manager.phone} 
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          label="Email" 
                          type="email" 
                          defaultValue={communityData.manager.email} 
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
        <DialogTitle>Place Bulk Order</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={placeOrder} sx={{ mt: 2 }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Item Name"
                name="item"
                value={form.item}
                onChange={onChange}
                required
              />
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                value={form.quantity}
                onChange={onChange}
                placeholder="e.g., 500 kg"
                required
              />
              <TextField
                fullWidth
                label="Notes (Optional)"
                name="notes"
                value={form.notes}
                onChange={onChange}
                multiline
                rows={3}
                placeholder="Any special requirements..."
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

export default CommunityDashboard;

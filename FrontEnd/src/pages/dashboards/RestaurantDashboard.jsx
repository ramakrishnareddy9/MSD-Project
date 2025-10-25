import { useState } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Chip
} from '@mui/material';
import {
  Restaurant, ShoppingCart, AccountCircle, Inventory,
  Notifications, Menu as MenuIcon, Home, Schedule, TrendingUp,
  LocalShipping, AttachMoney
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';

const RestaurantDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'orders', label: 'My Orders', icon: <ShoppingCart />, badge: 3 },
    { id: 'bulk', label: 'Bulk Orders', icon: <Inventory /> },
    { id: 'schedule', label: 'Delivery Schedule', icon: <Schedule /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 2 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

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
            <Restaurant color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">
              FarmKart Restaurant
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
                sx={{ borderRadius: 2, mb: 0.5 }}
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
            <Restaurant color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              FarmKart
            </Typography>
          </Stack>
          
          <List>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Stats Card */}
          <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              This Month
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Total Orders</Typography>
                <Typography variant="body2" fontWeight="bold">48</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Amount Spent</Typography>
                <Chip label="₹52,450" size="small" color="primary" />
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1}>
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Restaurant Partner Dashboard
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="primary">
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
            {activeSection === 'overview' && (
              <Box>
                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Active Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">
                              3
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
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              This Month
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              ₹52k
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
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Total Orders
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              156
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
                    <Card>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Pending Delivery
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              2
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                            <LocalShipping sx={{ fontSize: 32 }} />
                          </Avatar>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Welcome Message */}
                <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
                  <Restaurant sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Welcome to Restaurant Dashboard
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Manage your bulk orders, schedule deliveries, and get fresh produce directly from farmers.
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button variant="contained" startIcon={<ShoppingCart />}>
                      Place Bulk Order
                    </Button>
                    <Button variant="outlined" startIcon={<Schedule />}>
                      View Schedule
                    </Button>
                  </Stack>
                </Paper>

                <Typography variant="body2" color="text.secondary" align="center">
                  Restaurant dashboard features coming soon: Bulk ordering, recurring orders, early-morning delivery scheduling, and B2B pricing.
                </Typography>
              </Box>
            )}

            {activeSection !== 'overview' && (
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {menuItems.find(m => m.id === activeSection)?.label} - Coming Soon
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This feature is under development and will be available soon.
                </Typography>
              </Paper>
            )}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default RestaurantDashboard;

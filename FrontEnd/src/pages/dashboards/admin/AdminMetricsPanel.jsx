import React, { memo } from 'react';
import {
  Card, CardContent, Grid, Typography, Box, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Stack, Alert, CircularProgress
} from '@mui/material';
import {
  People, TrendingUp, ShoppingCart, AttachMoney,
  Agriculture, Store, LocalShipping, Business
} from '@mui/icons-material';

/**
 * Memoized component to display admin key metrics
 * Prevents re-renders when parent component updates
 */
const AdminMetricsPanel = memo(({
  stats = {},
  recentOrders = [],
  loading = false,
  error = null
}) => {
  const {
    totalUsers = 0,
    activeUsers = 0,
    totalOrders = 0,
    revenue = 0,
    farmers = 0,
    customers = 0,
    transporters = 0,
    businesses = 0,
    pendingApprovals = 0,
    reportedIssues = 0
  } = stats;

  const metrics = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: People,
      color: 'primary',
      subtext: `${activeUsers} active`
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'success',
      subtext: 'all time'
    },
    {
      title: 'Total Revenue',
      value: `₹${(revenue / 100000).toFixed(1)}L`,
      icon: AttachMoney,
      color: 'info',
      subtext: 'from commissions'
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals,
      icon: Business,
      color: 'warning',
      subtext: 'awaiting review'
    }
  ];

  const userBreakdown = [
    { label: 'Farmers', value: farmers, icon: Agriculture },
    { label: 'Customers', value: customers, icon: People },
    { label: 'Businesses', value: businesses, icon: Store },
    { label: 'Transporters', value: transporters, icon: LocalShipping }
  ];

  if (error) {
    return (
      <Alert severity="error">
        Error loading metrics: {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Key Metrics Cards */}
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: `${metric.color}.light`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon color={metric.color} />
                  </Box>
                  <Box flex={1}>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      {metric.title}
                    </Typography>
                    <Typography variant="h6">
                      {loading ? <CircularProgress size={20} /> : metric.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {metric.subtext}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}

      {/* User Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Distribution
            </Typography>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
                <CircularProgress />
              </Stack>
            ) : (
              <Stack spacing={2}>
                {userBreakdown.map((item, idx) => {
                  const Icon = item.icon;
                  const percentage = totalUsers > 0 ? (item.value / totalUsers) * 100 : 0;
                  return (
                    <Box key={idx}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Icon fontSize="small" color="primary" />
                        <Typography variant="body2">{item.label}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                          {item.value} ({percentage.toFixed(1)}%)
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Platform Statistics */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Platform Status
            </Typography>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
                <CircularProgress />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    User Growth
                  </Typography>
                  <LinearProgress variant="determinate" value={85} />
                  <Typography variant="caption" color="textSecondary">
                    {activeUsers} / {totalUsers} users active
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Order Activity
                  </Typography>
                  <LinearProgress variant="determinate" value={72} />
                  <Typography variant="caption" color="textSecondary">
                    {totalOrders} total orders processed
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Approval Queue
                  </Typography>
                  <LinearProgress variant="determinate" value={pendingApprovals * 10} />
                  <Typography variant="caption" color="textSecondary">
                    {pendingApprovals} pending approvals
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Reported Issues
                  </Typography>
                  <LinearProgress variant="determinate" value={reportedIssues * 10} />
                  <Typography variant="caption" color="textSecondary">
                    {reportedIssues} issues reported
                  </Typography>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Orders */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Orders
            </Typography>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
                <CircularProgress />
              </Stack>
            ) : recentOrders.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                No recent orders
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>Customer</TableCell>
                      <TableCell>Farmer</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{order.farmer}</TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell align="right">
                          ₹{order.amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell>{order.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
});

AdminMetricsPanel.displayName = 'AdminMetricsPanel';

export default AdminMetricsPanel;

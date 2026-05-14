import React, { memo } from 'react';
import {
  Card, CardContent, CardHeader, Grid, Typography, Button, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Paper, LinearProgress, Alert, CircularProgress
} from '@mui/material';
import { AttachMoney, TrendingUp, Download } from '@mui/icons-material';

/**
 * Memoized component to display farmer payouts information
 * Prevents re-renders when parent component updates
 */
const FarmerPayoutsPanel = memo(({
  payouts = [],
  summary = {},
  loading = false,
  error = null,
  onRequestPayout = () => {}
}) => {
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading payouts: {error}
      </Alert>
    );
  }

  const {
    grossAmount = 0,
    commissionDeducted = 0,
    netAmount = 0,
    pendingAmount = 0,
    processedAmount = 0
  } = summary;

  const pendingPercent = grossAmount > 0 ? (pendingAmount / grossAmount) * 100 : 0;

  return (
    <Grid container spacing={2}>
      {/* Summary Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Gross Amount
            </Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>
              ₹{grossAmount.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={100} />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Commission Deducted
            </Typography>
            <Typography variant="h5" sx={{ mb: 1, color: 'error.main' }}>
              ₹{commissionDeducted.toLocaleString('en-IN')}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {((commissionDeducted / (grossAmount || 1)) * 100).toFixed(1)}% of gross
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Net Amount
            </Typography>
            <Typography variant="h5" sx={{ mb: 1, color: 'success.main' }}>
              ₹{netAmount.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={90} />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Pending Payout
            </Typography>
            <Typography variant="h5" sx={{ mb: 1, color: 'warning.main' }}>
              ₹{pendingAmount.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={pendingPercent} />
          </CardContent>
        </Card>
      </Grid>

      {/* Payouts Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Payout History"
            subheader={`Total payouts: ${payouts.length}`}
            action={
              <Button
                startIcon={<TrendingUp />}
                variant="contained"
                size="small"
                onClick={() => onRequestPayout()}
                disabled={loading}
              >
                Request Payout
              </Button>
            }
          />
          <CardContent>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
                <CircularProgress />
              </Stack>
            ) : payouts.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                No payouts yet
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Processing Days</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payouts.map((payout, idx) => (
                      <TableRow key={payout._id || idx} hover>
                        <TableCell>
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          ₹{(payout.amount || 0).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payout.status || 'pending'}
                            size="small"
                            color={
                              payout.status === 'completed'
                                ? 'success'
                                : payout.status === 'processing'
                                ? 'warning'
                                : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {payout.processingDays || '-'}
                        </TableCell>
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

FarmerPayoutsPanel.displayName = 'FarmerPayoutsPanel';

export default FarmerPayoutsPanel;

import React, { memo, useState } from 'react';
import {
  Card, CardContent, CardHeader, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Stack, Button,
  Chip, IconButton, Menu, MenuItem, Typography, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextareaAutosize, FormControl, InputLabel, Select
} from '@mui/material';
import {
  MoreVert, CheckCircle, Close, Warning, Visibility, Gavel
} from '@mui/icons-material';

/**
 * Memoized component to display and manage admin disputes
 * Prevents re-renders when parent component updates
 */
const AdminDisputesPanel = memo(({
  disputes = [],
  loading = false,
  error = null,
  onResolve = async () => {}
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolutionType, setResolutionType] = useState('favor_buyer');
  const [updating, setUpdating] = useState(false);

  const handleMenuOpen = (event, dispute) => {
    setSelectedDispute(dispute);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleResolveClick = (dispute) => {
    setSelectedDispute(dispute);
    setResolution('');
    setResolutionType('favor_buyer');
    setConfirmDialog(true);
    handleMenuClose();
  };

  const handleConfirmResolve = async () => {
    try {
      setUpdating(true);
      await onResolve(selectedDispute._id, {
        resolution: resolutionType,
        comment: resolution
      });
      setConfirmDialog(false);
      setSelectedDispute(null);
    } catch (err) {
      console.error('Error resolving dispute:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'warning',
      in_review: 'info',
      resolved: 'success',
      closed: 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'success'
    };
    return colors[priority] || 'default';
  };

  if (error) {
    return (
      <Alert severity="error">
        Error loading disputes: {error}
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Dispute Management"
          subheader={`Total disputes: ${disputes.length}`}
          action={
            <Button
              startIcon={<Gavel />}
              variant="outlined"
              size="small"
              disabled={loading}
            >
              New Case
            </Button>
          }
        />
        <CardContent>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
              <CircularProgress />
            </Stack>
          ) : disputes.length === 0 ? (
            <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
              No disputes to manage
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Case ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Parties</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {disputes.map((dispute) => (
                    <TableRow key={dispute._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {dispute.caseNumber || dispute._id.slice(-6).toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>{dispute.type || 'Order Dispute'}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {dispute.buyerName || 'Buyer'} vs {dispute.sellerName || 'Seller'}
                        </Typography>
                      </TableCell>
                      <TableCell>{dispute.subject || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<Warning fontSize="small" />}
                          label={dispute.priority || 'medium'}
                          size="small"
                          color={getPriorityColor(dispute.priority)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={dispute.status || 'open'}
                          size="small"
                          color={getStatusColor(dispute.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, dispute)}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dispute Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {selectedDispute?.status !== 'resolved' && (
          <MenuItem onClick={() => handleResolveClick(selectedDispute)}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            Resolve Case
          </MenuItem>
        )}
        <MenuItem>
          <Close fontSize="small" sx={{ mr: 1 }} />
          Close Case
        </MenuItem>
      </Menu>

      {/* Resolution Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => !updating && setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resolve Dispute</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Case: <strong>{selectedDispute?.caseNumber || selectedDispute?._id.slice(-6)}</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Resolution</InputLabel>
              <Select
                value={resolutionType}
                onChange={(e) => setResolutionType(e.target.value)}
                label="Resolution"
              >
                <MenuItem value="favor_buyer">Favor Buyer</MenuItem>
                <MenuItem value="favor_seller">Favor Seller</MenuItem>
                <MenuItem value="settlement">Settlement</MenuItem>
                <MenuItem value="partial_refund">Partial Refund</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="textSecondary">
              Resolution Comments
            </Typography>
            <TextareaAutosize
              minRows={3}
              placeholder="Enter resolution details..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                borderColor: '#ddd',
                fontFamily: 'inherit'
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmResolve}
            variant="contained"
            disabled={updating || !resolution}
          >
            {updating ? 'Resolving...' : 'Resolve'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

AdminDisputesPanel.displayName = 'AdminDisputesPanel';

export default AdminDisputesPanel;

import React, { memo, useState } from 'react';
import {
  Card, CardContent, CardHeader, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Stack, Button,
  IconButton, Menu, MenuItem, Chip, TextField, Alert,
  CircularProgress, Typography, Box, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, FormControl, InputLabel
} from '@mui/material';
import {
  MoreVert, Edit, Delete, Block, CheckCircle,
  Search, Add, Visibility
} from '@mui/icons-material';

/**
 * Memoized component to display and manage admin users
 * Prevents re-renders when parent component updates
 */
const AdminUsersPanel = memo(({
  users = [],
  total = 0,
  loading = false,
  error = null,
  onUpdate = async () => {},
  onDelete = async () => {},
  onFetch = async () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'delete', 'status'
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMenuOpen = (event, user) => {
    setSelectedUser(user);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (user) => {
    setSelectedUser(user);
    setNewStatus(user.status);
    setDialogType('status');
    setConfirmDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDialogType('delete');
    setConfirmDialog(true);
    handleMenuClose();
  };

  const handleConfirmAction = async () => {
    try {
      setUpdating(true);
      if (dialogType === 'status') {
        await onUpdate(selectedUser.userId, newStatus);
      } else if (dialogType === 'delete') {
        await onDelete(selectedUser.userId);
      }
      setConfirmDialog(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'error',
      farmer: 'success',
      customer: 'primary',
      business: 'info',
      delivery_large: 'warning',
      delivery_small: 'warning'
    };
    return colors[role] || 'default';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error';
  };

  if (error) {
    return (
      <Alert severity="error">
        Error loading users: {error}
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title="User Management"
          subheader={`Total users: ${total}`}
          action={
            <Button
              startIcon={<Add />}
              variant="contained"
              size="small"
              disabled={loading}
            >
              Add User
            </Button>
          }
        />
        <CardContent>
          <Stack spacing={2}>
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search by name or email..."
              startAdornment={<Search sx={{ mr: 1 }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              variant="outlined"
            />

            {/* Users Table */}
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
                <CircularProgress />
              </Stack>
            ) : filteredUsers.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                No users found
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Orders</TableCell>
                      <TableCell>Joined</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.userId} hover>
                        <TableCell fontWeight="medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            size="small"
                            color={getRoleColor(user.role)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={user.status === 'active' ? <CheckCircle /> : <Block />}
                            label={user.status}
                            size="small"
                            color={getStatusColor(user.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{user.orders}</TableCell>
                        <TableCell>{user.joined}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, user)}
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
          </Stack>
        </CardContent>
      </Card>

      {/* User Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedUser)}>
          <CheckCircle fontSize="small" sx={{ mr: 1 }} />
          Change Status
        </MenuItem>
        <MenuItem onClick={() => handleDeleteClick(selectedUser)}>
          <Delete fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => !updating && setConfirmDialog(false)}
      >
        <DialogTitle>
          {dialogType === 'delete' ? 'Delete User' : 'Change User Status'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'delete' ? (
            <Typography>
              Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? This action cannot be undone.
            </Typography>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={dialogType === 'delete' ? 'error' : 'primary'}
            disabled={updating}
          >
            {updating ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

AdminUsersPanel.displayName = 'AdminUsersPanel';

export default AdminUsersPanel;

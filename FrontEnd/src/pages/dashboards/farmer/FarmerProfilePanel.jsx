import React, { memo, useState } from 'react';
import {
  Card, CardContent, CardHeader, Grid, TextField, Button, Stack,
  Avatar, Box, Typography, Alert, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Edit, Save, Cancel, Verified } from '@mui/icons-material';

/**
 * Memoized component to display and edit farmer profile
 * Prevents re-renders when parent component updates
 */
const FarmerProfilePanel = memo(({
  farmer = {},
  loading = false,
  error = null,
  onUpdate = async () => {}
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: farmer.name || '',
    farmName: farmer.farmName || '',
    phone: farmer.phone || '',
    email: farmer.email || '',
    address: farmer.address || '',
    totalLand: farmer.totalLand || '',
    experience: farmer.experience || ''
  });
  const [updating, setUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleEdit = () => setEditMode(true);

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      name: farmer.name || '',
      farmName: farmer.farmName || '',
      phone: farmer.phone || '',
      email: farmer.email || '',
      address: farmer.address || '',
      totalLand: farmer.totalLand || '',
      experience: farmer.experience || ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setUpdating(true);
      await onUpdate(formData);
      setEditMode(false);
      setConfirmDialog(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmSave = () => {
    setConfirmDialog(true);
  };

  if (error) {
    return (
      <Alert severity="error">
        Error loading profile: {error}
      </Alert>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack alignItems="center" spacing={2}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    fontSize: '3rem'
                  }}
                >
                  {farmer.name?.[0] || 'F'}
                </Avatar>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">{farmer.name || 'Farmer'}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {farmer.farmName || 'Farm Name'}
                  </Typography>
                  {farmer.organicCertified && (
                    <Stack alignItems="center" sx={{ mt: 1 }}>
                      <Verified color="success" fontSize="small" />
                      <Typography variant="caption" color="success.main">
                        Organic Certified
                      </Typography>
                    </Stack>
                  )}
                </Box>
                {!editMode && (
                  <Button
                    startIcon={<Edit />}
                    variant="outlined"
                    fullWidth
                    onClick={handleEdit}
                    disabled={loading}
                  >
                    Edit Profile
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Farm Information"
              subheader={editMode ? 'Editing mode' : 'View mode'}
            />
            <CardContent>
              {loading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
                  <CircularProgress />
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Farm Name"
                        name="farmName"
                        value={formData.farmName}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address"
                        name="address"
                        multiline
                        rows={2}
                        value={formData.address}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Total Land (acres)"
                        name="totalLand"
                        type="number"
                        value={formData.totalLand}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Experience (years)"
                        name="experience"
                        type="number"
                        value={formData.experience}
                        onChange={handleChange}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                  </Grid>

                  {editMode && (
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Button
                        startIcon={<Cancel />}
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={updating}
                      >
                        Cancel
                      </Button>
                      <Button
                        startIcon={<Save />}
                        variant="contained"
                        onClick={handleConfirmSave}
                        disabled={updating}
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirm Profile Update</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to update your profile information?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

FarmerProfilePanel.displayName = 'FarmerProfilePanel';

export default FarmerProfilePanel;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button, TextField,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress, MenuItem,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  FormControlLabel, Switch
} from '@mui/material';
import {
  People, ShoppingCart, AccountCircle,
  Add, Notifications, Menu as MenuIcon, Dashboard, Home,
  LocalShipping, AttachMoney, Event, Message,
  CheckCircle, Schedule, Cancel, Apartment, Phone,
  Savings, Store, Refresh, ExitToApp, DeleteForever, SwapHoriz, InfoOutlined
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { authAPI, communityAPI, userAPI, notificationAPI, vehicleAPI } from '../../services/api';

const CommunityDashboard = () => {
  const navigate = useNavigate();
  // ── API-driven State ────────────────────────────────────────────────────────
  const [communityData, setCommunityData] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeOrders: 0,
    totalSpent: 0,
    monthlySavings: 0,
    bulkOrders: 0,
    satisfaction: 0
  });
  const [loading, setLoading] = useState(true);

  // ── Form State ──────────────────────────────────────────────────────────────
  // ── UI State ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [communityId, setCommunityId] = useState('');
  const [communityPools, setCommunityPools] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotalPages, setNotificationTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [selectedPoolOrder, setSelectedPoolOrder] = useState(null);
  const [availableFarmers, setAvailableFarmers] = useState([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [farmerInfoDialogOpen, setFarmerInfoDialogOpen] = useState(false);
  const [selectedFarmerInfo, setSelectedFarmerInfo] = useState(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [ownershipTarget, setOwnershipTarget] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'info',
    notifyMembers: true
  });
  const [profileForm, setProfileForm] = useState({
    communityName: '',
    address: '',
    name: '',
    position: '',
    phone: '',
    email: ''
  });
  const safeCommunityData = {
    ...(communityData || {}),
    stats: {
      ...(communityData?.stats || {}),
      ...(stats || {})
    }
  };

  const mapMembersFromCommunity = (community) => {
    return (community?.members || []).map((member, idx) => {
      const memberUser = member?.user || {};
      return {
        id: String(memberUser?._id || member?.user || idx + 1),
        name: memberUser?.name || 'Member',
        apartment: memberUser?.address || memberUser?.city || 'N/A',
        phone: memberUser?.phone || 'N/A',
        joinDate: member?.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'N/A',
        status: 'Active',
        role: memberUser?.roles?.[0] || 'Member',
        email: memberUser?.email || '',
        totalOrders: 0,
        spent: 0
      };
    });
  };

  const refreshCommunityPools = async (nextCommunityId) => {
    const targetCommunityId = String(nextCommunityId || communityId || '');
    if (!targetCommunityId) {
      setCommunityPools([]);
      return;
    }

    try {
      const poolsRes = await communityAPI.getPools(targetCommunityId);
      if (!poolsRes.success) {
        setCommunityPools([]);
        return;
      }

      const pools = poolsRes.data?.pools || [];
      setCommunityPools(pools);

      setStats((prev) => ({
        ...prev,
        activeOrders: pools.filter((pool) => ['collecting', 'ready', 'ordered'].includes(pool.status)).length,
        bulkOrders: pools.length,
        totalSpent: pools.reduce((sum, pool) => (
          sum + (pool.contributions || []).reduce((poolSum, c) => poolSum + Number(c.amount || 0), 0)
        ), 0)
      }));
    } catch {
      setCommunityPools([]);
    }
  };

  // ── Initialize: Fetch community data on mount ──────────────────────────────
  useEffect(() => {
    const initializeCommunityData = async () => {
      try {
        setLoading(true);

        // Get current user (community admin/member)
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          const currentUserData = userRes.data?.user || userRes.data;
          setCurrentUser(currentUserData);
          // Get only communities this user administers
          const communityRes = await communityAPI.getMyAdmin();
          if (communityRes.success && communityRes.data) {
            // Assuming API returns array or single community
            const communityPayload = communityRes.data?.communities || communityRes.data;
            const community = Array.isArray(communityPayload) ? communityPayload[0] : communityPayload;
            if (!community) {
              showSnackbar('You do not manage any community yet', 'error');
              navigate('/dashboard/customer', { replace: true });
              return;
            }
            const resolvedCommunityId = String(community._id || '');
            setCommunityId(resolvedCommunityId);
            setCommunityData({
              id: String(community._id || ''),
              name: community.name || 'Community',
              address: community.address || 'Location',
              adminId: String(community.admin?._id || community.adminId?._id || community.admin || community.adminId || ''),
              manager: {
                name: community.admin?.name || community.adminId?.name || currentUserData?.name,
                phone: community.admin?.phone || community.adminId?.phone || '+91 XXXXXXXXXX',
                email: community.admin?.email || community.adminId?.email || 'contact@community.com',
                position: 'Community Manager',
                joinDate: new Date(community.createdAt).toLocaleDateString()
              },
              stats: {
                totalMembers: community.members?.length || 0,
                activeOrders: 0,
                totalSpent: 0,
                monthlySavings: 0,
                bulkOrders: 0,
                satisfaction: 92
              },
              poolData: community.pools || []
            });

            setProfileForm({
              communityName: currentUserData?.communityName || community.name || '',
              address: currentUserData?.address || community.address || '',
              name: currentUserData?.name || community.admin?.name || community.adminId?.name || '',
              position: currentUserData?.position || 'Community Manager',
              phone: currentUserData?.phone || community.admin?.phone || community.adminId?.phone || '',
              email: currentUserData?.email || community.admin?.email || community.adminId?.email || ''
            });

            const mappedMembers = mapMembersFromCommunity(community);
            setMembers(mappedMembers);
            setStats((prev) => ({
              ...prev,
              totalMembers: mappedMembers.length
            }));

            await refreshCommunityPools(resolvedCommunityId);
            await refreshAnnouncements(resolvedCommunityId);

            await fetchNotifications(1, 'all');
          }
        } else {
          navigate('/dashboard/customer', { replace: true });
        }
      } catch (error) {
        console.error('Error initializing community data:', error);
        showSnackbar(error.message || 'Unable to load community dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };

    initializeCommunityData();
  }, []);

  const [announcements, setAnnouncements] = useState([]);

  const refreshAnnouncements = async (nextCommunityId) => {
    const targetCommunityId = String(nextCommunityId || communityId || '');
    if (!targetCommunityId) {
      setAnnouncements([]);
      return;
    }

    try {
      setAnnouncementLoading(true);
      const res = await communityAPI.getAnnouncements(targetCommunityId);
      if (!res.success) {
        setAnnouncements([]);
        return;
      }

      const mapped = (res.data?.announcements || []).map((item) => ({
        id: item._id || item.id,
        title: item.title,
        message: item.message,
        type: item.type || 'info',
        date: new Date(item.createdAt || Date.now()).toLocaleString('en-IN'),
        createdBy: item.createdBy?.name || 'Admin'
      }));

      setAnnouncements(mapped);
    } catch {
      setAnnouncements([]);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchNotifications = async (page = notificationPage, filter = notificationFilter) => {
    const params = { page, limit: 8 };
    if (filter === 'unread') params.unread = true;
    if (filter !== 'all' && filter !== 'unread') params.type = filter;

    const notificationsRes = await notificationAPI.getAll(params);
    if (notificationsRes.success) {
      setNotifications((notificationsRes.data || []).map((n) => ({
        id: n._id || n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        time: new Date(n.createdAt || Date.now()).toLocaleString('en-IN'),
        type: n.type === 'alert' ? 'warning' : n.type === 'order' ? 'success' : 'info',
        read: !!n.isRead
      })));
      setNotificationTotalPages(notificationsRes.pagination?.totalPages || 1);
    }
  };

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    if (!currentUser?._id) {
      showSnackbar('Unable to update profile', 'error');
      return;
    }

    try {
      const payload = {
        name: profileForm.name,
        communityName: profileForm.communityName,
        address: profileForm.address,
        position: profileForm.position,
        phone: profileForm.phone,
        email: profileForm.email
      };

      const res = await userAPI.update(currentUser._id, payload);
      const updatedUser = res?.data?.user;
      if (updatedUser) {
        setCurrentUser(updatedUser);
        setCommunityData((prev) => ({
          ...prev,
          name: profileForm.communityName || prev?.name,
          address: profileForm.address || prev?.address,
          manager: {
            ...(prev?.manager || {}),
            name: updatedUser.name,
            phone: updatedUser.phone,
            email: updatedUser.email,
            position: updatedUser.position || profileForm.position
          }
        }));
      }

      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to update profile', 'error');
    }
  };

  const isCommunityAdmin = String(safeCommunityData.adminId || '') === String(currentUser?._id || '');
  const ownershipCandidates = members.filter((member) => String(member.id) !== String(currentUser?._id || ''));
  const poolRows = communityPools.map((pool) => {
    const totalAmount = (pool.contributions || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    return {
      id: String(pool._id),
      item: pool.product?.name || 'Product',
      quantity: `${Number(pool.totalQty || 0).toFixed(0)} ${pool.product?.unit || 'kg'}`,
      totalQty: Number(pool.totalQty || 0),
      notes: `Min bulk ${Number(pool.minBulkQty || 0).toFixed(0)} ${pool.product?.unit || 'kg'}`,
      amount: Math.round(totalAmount),
      date: new Date(pool.updatedAt || pool.createdAt || Date.now()).toLocaleDateString(),
      status: pool.status,
      isReadyToOrder: pool.status === 'ready' && Number(pool.totalQty || 0) >= Number(pool.minBulkQty || 0),
      farmerName: pool.assignedFarmer?.name || pool.product?.ownerId?.name || 'Not Selected',
      assignedFarmerId: String(pool.assignedFarmer?._id || pool.product?.ownerId?._id || ''),
      deliveryRequestStatus: pool.deliveryRequestStatus || 'none',
      assignedVehicleName: pool.assignedVehicle?.name || pool.assignedVehicle?.plateNumber || '',
      assignedVehiclePlate: pool.assignedVehicle?.plateNumber || '',
      assignedDeliveryPartnerName: pool.assignedDeliveryPartner?.name || '',
      deliveredAt: pool.deliveredAt ? new Date(pool.deliveredAt).toLocaleDateString('en-IN') : ''
    };
  });

  const resetOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedPoolOrder(null);
    setAvailableFarmers([]);
    setSelectedFarmerId('');
    setAvailableVehicles([]);
    setSelectedVehicleId('');
    setVehiclesLoading(false);
    setFarmerInfoDialogOpen(false);
    setSelectedFarmerInfo(null);
    setFarmersLoading(false);
  };

  const openFarmerInfoDialog = (farmer) => {
    setSelectedFarmerInfo(farmer || null);
    setFarmerInfoDialogOpen(true);
  };

  const openOrderDialog = async (poolOrder) => {
    if (!communityId || !poolOrder?.id) return;

    try {
      setOrderDialogOpen(true);
      setSelectedPoolOrder(poolOrder);
      setFarmersLoading(true);
      setVehiclesLoading(true);
      setAvailableFarmers([]);
      setAvailableVehicles([]);
      setSelectedFarmerId('');
      setSelectedVehicleId('');

      const [farmersRes, vehiclesRes] = await Promise.all([
        communityAPI.getPoolFarmers(communityId, poolOrder.id),
        vehicleAPI.getMarketplaceVehicles({ status: 'Available' })
      ]);

      const farmers = farmersRes?.data?.farmers || [];
      setAvailableFarmers(farmers);

      const vehicles = (vehiclesRes?.data || []).map((vehicle) => ({
        id: String(vehicle._id || vehicle.id),
        name: vehicle.name || vehicle.plateNumber || 'Vehicle',
        type: vehicle.type || 'Other',
        capacity: Number(vehicle.capacity || 0),
        status: vehicle.status || 'Available',
        ownerName: vehicle.owner?.name || 'Delivery Partner',
        ownerId: String(vehicle.owner?._id || vehicle.owner || ''),
        plateNumber: vehicle.plateNumber || ''
      }));
      setAvailableVehicles(vehicles);

      if (farmers.length === 1) {
        setSelectedFarmerId(String(farmers[0].farmerId));
      } else {
        const matched = farmers.find((farmer) => String(farmer.farmerId) === String(poolOrder.assignedFarmerId));
        if (matched) {
          setSelectedFarmerId(String(matched.farmerId));
        }
      }
    } catch (error) {
      showSnackbar(error.message || 'Failed to fetch farmers for this pool order', 'error');
      resetOrderDialog();
    } finally {
      setFarmersLoading(false);
      setVehiclesLoading(false);
    }
  };

  const handleOrderPoolFromFarmer = async () => {
    if (!communityId || !selectedPoolOrder?.id) return;
    if (!selectedFarmerId) {
      showSnackbar('Please select a farmer to place this community order', 'error');
      return;
    }

    if (!selectedVehicleId) {
      showSnackbar('Please assign a delivery vehicle before placing this community order', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await communityAPI.orderPool(communityId, selectedPoolOrder.id, selectedFarmerId, selectedVehicleId);
      showSnackbar(res?.message || 'Bulk order sent to farmer', 'success');
      resetOrderDialog();
      await refreshCommunityPools(communityId);
    } catch (error) {
      showSnackbar(error.message || 'Failed to place bulk order with farmer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnnouncementChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAnnouncementForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreateAnnouncement = async () => {
    if (!communityId) {
      showSnackbar('No community selected', 'error');
      return;
    }

    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      showSnackbar('Title and message are required', 'error');
      return;
    }

    try {
      setAnnouncementLoading(true);
      const res = await communityAPI.createAnnouncement(communityId, {
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        type: announcementForm.type,
        notifyMembers: announcementForm.notifyMembers
      });

      showSnackbar(res?.message || 'Announcement posted', 'success');
      setAnnouncementDialogOpen(false);
      setAnnouncementForm({ title: '', message: '', type: 'info', notifyMembers: true });
      await refreshAnnouncements(communityId);
    } catch (error) {
      showSnackbar(error.message || 'Failed to post announcement', 'error');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!safeCommunityData.id) {
      showSnackbar('No community selected', 'error');
      return;
    }

    const confirmLeave = window.confirm('Are you sure you want to leave this community?');
    if (!confirmLeave) return;

    try {
      setActionLoading(true);
      const res = await communityAPI.leave(safeCommunityData.id);
      showSnackbar(res?.message || 'You left the community successfully', 'success');
      navigate('/dashboard/customer');
    } catch (error) {
      showSnackbar(error.message || 'Failed to leave community', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openTransferDialog = () => {
    if (!ownershipCandidates.length) {
      showSnackbar('No eligible members found to transfer ownership', 'error');
      return;
    }
    setOwnershipTarget(String(ownershipCandidates[0].id));
    setTransferDialogOpen(true);
  };

  const handleTransferOwnership = async () => {
    if (!safeCommunityData.id || !ownershipTarget) {
      showSnackbar('Please select a member', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await communityAPI.transferOwnership(safeCommunityData.id, ownershipTarget);
      const updatedCommunity = res?.data?.community;
      const newOwner = ownershipCandidates.find((m) => String(m.id) === String(ownershipTarget));

      if (updatedCommunity) {
        setCommunityData((prev) => ({
          ...(prev || {}),
          adminId: String(updatedCommunity.admin?._id || ownershipTarget),
          manager: {
            ...(prev?.manager || {}),
            name: updatedCommunity.admin?.name || newOwner?.name || prev?.manager?.name,
            email: updatedCommunity.admin?.email || prev?.manager?.email
          }
        }));
      }

      setTransferDialogOpen(false);
      showSnackbar(res?.message || 'Ownership transferred successfully', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to transfer ownership', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!safeCommunityData.id) {
      showSnackbar('No community selected', 'error');
      return;
    }

    const confirmDelete = window.confirm('This will permanently delete the community, pools, and chat data. Continue?');
    if (!confirmDelete) return;

    try {
      setActionLoading(true);
      const res = await communityAPI.delete(safeCommunityData.id);
      showSnackbar(res?.message || 'Community deleted successfully', 'success');
      navigate('/dashboard/customer');
    } catch (error) {
      showSnackbar(error.message || 'Failed to delete community', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markNotificationRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      await fetchNotifications(notificationPage, notificationFilter);
    } catch {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
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

  useEffect(() => {
    if (activeSection === 'notifications') {
      fetchNotifications(notificationPage, notificationFilter);
    }
  }, [activeSection, notificationPage, notificationFilter]);
  
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    { id: 'orders', label: 'Bulk Orders', icon: <ShoppingCart />, badge: safeCommunityData.stats?.activeOrders || 0 },
    { id: 'members', label: 'Members', icon: <People />, badge: safeCommunityData.stats?.totalMembers || 0 },
    { id: 'announcements', label: 'Announcements', icon: <Message /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: unreadCount || null },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  const orderStatusColors = {
    collecting: 'warning',
    ready: 'success',
    ordered: 'info',
    delivered: 'success',
    allocated: 'default',
    cancelled: 'error'
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
                <Chip label={safeCommunityData.stats.totalMembers || 0} size="small" color="info" />
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Active Orders</Typography>
                <Chip label={safeCommunityData.stats.activeOrders || 0} size="small" color="warning" />
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
                {safeCommunityData.name || 'Community'}
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
                              {safeCommunityData.stats.totalMembers || 0}
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
                              {safeCommunityData.stats.activeOrders || 0}
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
                              ₹{((safeCommunityData.stats.monthlySavings || 0) / 1000).toFixed(1)}k
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
                              ₹{((safeCommunityData.stats.totalSpent || 0) / 1000).toFixed(0)}k
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
                          variant="outlined"
                          onClick={() => setActiveSection('orders')}
                        >
                          Manage Orders
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
                            {poolRows.slice(0, 5).map((order) => (
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
                                    label={String(order.status || '').charAt(0).toUpperCase() + String(order.status || '').slice(1)}
                                    color={orderStatusColors[order.status] || 'default'}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                            {poolRows.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5}>
                                  <Typography align="center" color="text.secondary" py={1.5}>
                                    No bulk pool orders yet.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
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
                              {safeCommunityData.stats.satisfaction || 0}%
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={safeCommunityData.stats.satisfaction || 0}
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
                            {safeCommunityData.stats.bulkOrders || 0}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Avg Order Value</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ₹{Math.floor((safeCommunityData.stats.totalSpent || 0) / Math.max(safeCommunityData.stats.bulkOrders || 1, 1))}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Savings per Member</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            ₹{Math.floor((safeCommunityData.stats.monthlySavings || 0) / Math.max(safeCommunityData.stats.totalMembers || 1, 1))}
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
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        Bulk Orders
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Review ready pools, selected farmers, and order status in one place.
                      </Typography>
                    </Box>
                    <Chip
                      label={`${poolRows.length} Pool${poolRows.length === 1 ? '' : 's'}`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  <Alert severity="info">
                    Only community admin can place ready bulk orders. Select the farmer before placing each order.
                  </Alert>
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}
                >
                  <TableContainer sx={{ overflowX: 'hidden' }}>
                    <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: '17%', fontWeight: 700, whiteSpace: 'normal' }}>Order ID</TableCell>
                          <TableCell sx={{ width: '13%', fontWeight: 700, whiteSpace: 'normal' }}>Item</TableCell>
                          <TableCell sx={{ width: '8%', fontWeight: 700, whiteSpace: 'normal' }}>Quantity</TableCell>
                          <TableCell sx={{ width: '13%', fontWeight: 700, whiteSpace: 'normal' }}>Notes</TableCell>
                          <TableCell sx={{ width: '8%', fontWeight: 700, whiteSpace: 'normal' }}>Amount</TableCell>
                          <TableCell sx={{ width: '9%', fontWeight: 700, whiteSpace: 'normal' }}>Date</TableCell>
                          <TableCell sx={{ width: '10%', fontWeight: 700, whiteSpace: 'normal' }}>Status</TableCell>
                          <TableCell sx={{ width: '12%', fontWeight: 700, whiteSpace: 'normal' }}>Farmer</TableCell>
                          <TableCell sx={{ width: '12%', fontWeight: 700, whiteSpace: 'normal' }}>Delivery</TableCell>
                          <TableCell sx={{ width: '8%', fontWeight: 700, whiteSpace: 'normal' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {poolRows.map((order) => (
                          <TableRow
                            key={order.id}
                            hover
                            sx={{
                              '&:last-child td, &:last-child th': { border: 0 },
                              '& td': { py: 2 }
                            }}
                          >
                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <Typography fontWeight="700" sx={{ wordBreak: 'break-word', lineHeight: 1.3 }}>
                                #{order.id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight="600" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {order.item}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{order.quantity}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {order.notes || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <Typography fontWeight="700" color="success.main">
                                ₹{order.amount}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{order.date}</TableCell>
                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <Chip 
                                label={String(order.status || '').charAt(0).toUpperCase() + String(order.status || '').slice(1)}
                                color={orderStatusColors[order.status] || 'default'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {order.farmerName}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              {order.deliveryRequestStatus !== 'none' ? (
                                <Stack spacing={0.5}>
                                  <Chip
                                    size="small"
                                    label={order.deliveryRequestStatus === 'requested' ? 'Requested' : order.deliveryRequestStatus === 'accepted' ? 'Accepted' : order.deliveryRequestStatus === 'rejected' ? 'Rejected' : order.deliveryRequestStatus}
                                    color={order.deliveryRequestStatus === 'accepted' ? 'success' : order.deliveryRequestStatus === 'rejected' ? 'error' : 'warning'}
                                    sx={{ fontWeight: 600, width: 'fit-content' }}
                                  />
                                  {order.assignedVehicleName && (
                                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                      {order.assignedVehicleName}{order.assignedVehiclePlate ? ` (${order.assignedVehiclePlate})` : ''}
                                    </Typography>
                                  )}
                                  {order.assignedDeliveryPartnerName && (
                                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                      {order.assignedDeliveryPartnerName}
                                    </Typography>
                                  )}
                                  {order.deliveredAt && (
                                    <Typography variant="caption" color="success.main" sx={{ lineHeight: 1.2 }}>
                                      Delivered: {order.deliveredAt}
                                    </Typography>
                                  )}
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">Not requested</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {isCommunityAdmin && order.isReadyToOrder ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  fullWidth
                                  sx={{
                                    minWidth: 0,
                                    whiteSpace: 'normal',
                                    lineHeight: 1.2,
                                    px: 1.25,
                                    py: 1,
                                    borderRadius: 2,
                                    fontSize: '0.8rem',
                                    fontWeight: 700
                                  }}
                                  onClick={() => openOrderDialog(order)}
                                  disabled={actionLoading}
                                >
                                  Select Farmer
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  {order.status === 'ordered' ? 'Already ordered' : 'No action'}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {poolRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={10}>
                              <Box sx={{ py: 6, textAlign: 'center' }}>
                                <Typography variant="h6" fontWeight="700" gutterBottom>
                                  No community pool orders yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Add contributions to a pool and it will appear here once the bulk minimum is reached.
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
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
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: 'info.main' }}>
                                  {(member.name || 'M').charAt(0)}
                                </Avatar>
                                <Typography fontWeight="600">{member.name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Apartment sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography>{member.apartment || 'N/A'}</Typography>
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
                                label={member.status || 'Active'}
                                color={(member.status || 'Active') === 'Active' ? 'success' : 'default'}
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Community Announcements
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAnnouncementDialogOpen(true)}
                    disabled={!isCommunityAdmin}
                  >
                    {isCommunityAdmin ? 'Post Announcement' : 'Post Announcement (Admin only)'}
                  </Button>
                </Stack>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Only community admin can create announcements and notify members. Community members can view them here.
                </Alert>
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
                              {announcement.date} by {announcement.createdBy}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {!announcementLoading && announcements.length === 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">No announcements yet.</Typography>
                      </Paper>
                    </Grid>
                  )}
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
                          <Card key={notification.id} sx={{ bgcolor: notification.read ? 'background.paper' : 'action.hover', cursor: notification.read ? 'default' : 'pointer' }} onClick={() => !notification.read && markNotificationRead(notification.id)}>
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
                        bgcolor: 'info.main',
                        fontSize: '3rem'
                      }}
                    >
                      <People sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {safeCommunityData.name || 'Community'}
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
                          {safeCommunityData.stats.totalMembers || 0}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Bulk Orders</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {safeCommunityData.stats.bulkOrders || 0}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Savings</Typography>
                        <Chip 
                          label={`₹${((safeCommunityData.stats.monthlySavings || 0) / 1000).toFixed(1)}k`}
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
                          name="communityName"
                          label="Community Name" 
                          value={profileForm.communityName}
                          onChange={onProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth 
                          name="address"
                          label="Address" 
                          multiline 
                          rows={2} 
                          value={profileForm.address}
                          onChange={onProfileChange}
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
                          name="name"
                          label="Manager Name" 
                          value={profileForm.name}
                          onChange={onProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          name="position"
                          label="Position" 
                          value={profileForm.position}
                          onChange={onProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          name="phone"
                          label="Phone" 
                          value={profileForm.phone}
                          onChange={onProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          name="email"
                          label="Email" 
                          type="email" 
                          value={profileForm.email}
                          onChange={onProfileChange}
                        />
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

                  <Paper sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Community Actions
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={2}>
                      {!isCommunityAdmin && (
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<ExitToApp />}
                          onClick={handleLeaveCommunity}
                          disabled={actionLoading}
                        >
                          Leave Community
                        </Button>
                      )}

                      {isCommunityAdmin && (
                        <>
                          <Button
                            variant="outlined"
                            color="info"
                            startIcon={<SwapHoriz />}
                            onClick={openTransferDialog}
                            disabled={actionLoading || ownershipCandidates.length === 0}
                          >
                            Transfer Ownership
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteForever />}
                            onClick={handleDeleteCommunity}
                            disabled={actionLoading}
                          >
                            Delete Community
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Container>
        </Box>
      </Box>

      <Dialog open={orderDialogOpen} onClose={resetOrderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Select Farmer for Community Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              {selectedPoolOrder
                ? `Pool: ${selectedPoolOrder.item} (${selectedPoolOrder.quantity})`
                : 'Select farmer for this pool order'}
            </Alert>

            {farmersLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">Loading eligible farmers...</Typography>
              </Stack>
            ) : availableFarmers.length > 0 ? (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" color="text.secondary">
                  Choose a farmer for {selectedPoolOrder?.item || 'this product'}
                </Typography>
                {availableFarmers.map((farmer) => {
                  const isSelected = String(selectedFarmerId) === String(farmer.farmerId);
                  return (
                    <Paper
                      key={farmer.farmerId}
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderColor: isSelected ? 'success.main' : 'divider',
                        bgcolor: isSelected ? 'success.lighter' : 'background.paper'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>
                            {farmer.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            Product: {selectedPoolOrder?.item || 'N/A'} | Price: ₹{Number(farmer.price || 0)}/{farmer.unit || 'kg'} | Stock: {Number(farmer.stockQuantity || 0)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton color="info" onClick={() => openFarmerInfoDialog(farmer)}>
                            <InfoOutlined fontSize="small" />
                          </IconButton>
                          <Button
                            size="small"
                            variant={isSelected ? 'contained' : 'outlined'}
                            color={isSelected ? 'success' : 'primary'}
                            onClick={() => setSelectedFarmerId(String(farmer.farmerId))}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Alert severity="warning">No eligible farmers are available for this pool product right now.</Alert>
            )}

            <Divider />

            {vehiclesLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">Loading available delivery vehicles...</Typography>
              </Stack>
            ) : availableVehicles.length > 0 ? (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assign delivery vehicle ({Number(selectedPoolOrder?.totalQty || 0)} kg required)
                </Typography>
                {availableVehicles.map((vehicle) => {
                  const isSelectedVehicle = String(selectedVehicleId) === String(vehicle.id);
                  const canCarry = Number(vehicle.capacity || 0) >= Number(selectedPoolOrder?.totalQty || 0);
                  return (
                    <Paper
                      key={vehicle.id}
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderColor: isSelectedVehicle ? 'info.main' : 'divider',
                        bgcolor: isSelectedVehicle ? 'info.lighter' : 'background.paper',
                        opacity: canCarry ? 1 : 0.5
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>
                            {vehicle.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            Partner: {vehicle.ownerName} | Type: {vehicle.type} | Capacity: {vehicle.capacity} kg {vehicle.plateNumber ? `| Plate: ${vehicle.plateNumber}` : ''}
                          </Typography>
                          {!canCarry && (
                            <Typography variant="caption" color="error.main">
                              Capacity too low for this pool quantity
                            </Typography>
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant={isSelectedVehicle ? 'contained' : 'outlined'}
                          color={isSelectedVehicle ? 'info' : 'primary'}
                          onClick={() => setSelectedVehicleId(String(vehicle.id))}
                          disabled={!canCarry}
                        >
                          {isSelectedVehicle ? 'Assigned' : 'Assign'}
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Alert severity="warning">No delivery partner vehicles are available right now.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetOrderDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            onClick={handleOrderPoolFromFarmer}
            variant="contained"
            disabled={actionLoading || farmersLoading || vehiclesLoading || !selectedFarmerId || !selectedVehicleId}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={farmerInfoDialogOpen} onClose={() => setFarmerInfoDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Farmer Details</DialogTitle>
        <DialogContent>
          {selectedFarmerInfo ? (
            <Stack spacing={1.5} sx={{ mt: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>{selectedFarmerInfo.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Product: {selectedPoolOrder?.item || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Price: ₹{Number(selectedFarmerInfo.price || 0)}/{selectedFarmerInfo.unit || 'kg'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available Stock: {Number(selectedFarmerInfo.stockQuantity || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Min Order: {Number(selectedFarmerInfo.minOrderQuantity || 1)} {selectedFarmerInfo.unit || 'kg'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phone: {selectedFarmerInfo.phone || 'Not available'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                Email: {selectedFarmerInfo.email || 'Not available'}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No farmer details available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFarmerInfoDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Community Ownership</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Ownership transfer is immediate. The selected member will become the new community admin.
            </Alert>
            <TextField
              select
              fullWidth
              label="Select new owner"
              value={ownershipTarget}
              onChange={(e) => setOwnershipTarget(e.target.value)}
            >
              {ownershipCandidates.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name} ({member.email || member.phone || 'Member'})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleTransferOwnership} variant="contained" disabled={actionLoading || !ownershipTarget}>
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Transfer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={announcementDialogOpen} onClose={() => setAnnouncementDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post Community Announcement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              name="title"
              label="Title"
              value={announcementForm.title}
              onChange={handleAnnouncementChange}
            />
            <TextField
              select
              fullWidth
              name="type"
              label="Type"
              value={announcementForm.type}
              onChange={handleAnnouncementChange}
            >
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="event">Event</MenuItem>
              <MenuItem value="offer">Offer</MenuItem>
              <MenuItem value="alert">Alert</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={4}
              name="message"
              label="Message"
              value={announcementForm.message}
              onChange={handleAnnouncementChange}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={announcementForm.notifyMembers}
                  onChange={handleAnnouncementChange}
                  name="notifyMembers"
                />
              )}
              label="Notify all community members"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementDialogOpen(false)} disabled={announcementLoading}>Cancel</Button>
          <Button onClick={handleCreateAnnouncement} variant="contained" disabled={announcementLoading}>
            {announcementLoading ? <CircularProgress size={20} color="inherit" /> : 'Post'}
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

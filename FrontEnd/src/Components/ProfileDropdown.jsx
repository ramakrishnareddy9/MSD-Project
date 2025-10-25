import { useState } from 'react';
import { Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box, Typography } from '@mui/material';
import { 
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  History as HistoryIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ProfileDropdown = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Get user initials
  const getUserInitials = () => {
    const name = user?.name || 'User';
    return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  // Get role-specific colors
  const getRoleColor = () => {
    const role = user?.role || 'customer';
    const colors = {
      customer: 'primary',
      farmer: 'success',
      transporter: 'warning',
      admin: 'secondary',
      business: 'info',
      community: 'info'
    };
    return colors[role] || 'primary';
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          p: 1,
          borderRadius: 2,
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'all 0.2s'
        }}
      >
        <Avatar
          sx={{
            bgcolor: `${getRoleColor()}.main`,
            width: 48,
            height: 48,
            fontWeight: 'bold',
            boxShadow: 2
          }}
        >
          {getUserInitials()}
        </Avatar>
        
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {user?.role || 'User'}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon 
          sx={{ 
            color: 'text.secondary', 
            fontSize: 20,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }} 
        />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: 'visible',
            mt: 1.5,
            minWidth: 250,
            borderRadius: 2,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: `${getRoleColor()}.main`,
                width: 40,
                height: 40
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {user?.role || 'User'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <MenuItem onClick={() => setActiveTab && setActiveTab('profile')}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => setActiveTab && setActiveTab('settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>

        {user?.role === 'customer' && (
          <MenuItem onClick={() => setActiveTab && setActiveTab('orders')}>
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Order History</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={() => setActiveTab && setActiveTab('notifications')}>
          <ListItemIcon>
            <NotificationsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Notifications</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Help & Support</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={logout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileDropdown;

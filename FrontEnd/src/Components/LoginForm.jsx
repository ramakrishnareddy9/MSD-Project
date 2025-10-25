import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextField, Button, MenuItem, Alert, Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const ROLE_OPTIONS = [
  { label: 'Customer', value: 'customer' },
  { label: 'Farmer', value: 'farmer' },
  { label: 'Business', value: 'business' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Delivery (Large)', value: 'delivery_large' },
  { label: 'Delivery (Small)', value: 'delivery_small' },
  { label: 'Delivery (Legacy)', value: 'delivery' },
  { label: 'Community', value: 'community' },
  { label: 'Admin', value: 'admin' },
];

const DEFAULTS = {
  customer: { email: 'customer@test.com', password: 'password' },
  farmer: { email: 'farmer@test.com', password: 'password' },
  business: { email: 'business@test.com', password: 'password' },
  restaurant: { email: 'restaurant@test.com', password: 'password' },
  delivery_large: { email: 'delivery_large@test.com', password: 'password' },
  delivery_small: { email: 'delivery_small@test.com', password: 'password' },
  delivery: { email: 'delivery@test.com', password: 'password' },
  community: { email: 'community@test.com', password: 'password' },
  admin: { email: 'admin@test.com', password: 'password' }
};

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAutoFill = (role) => {
    const creds = DEFAULTS[role];
    setEmail(creds.email);
    setPassword(creds.password);
    setSelectedRole(role);
  };

  const routeForRole = (role) => {
    switch (role) {
      case 'customer': return '/customer';
      case 'farmer': return '/farmer';
      case 'business': return '/business';
      case 'restaurant': return '/restaurant';
      case 'delivery_large': return '/delivery-large';
      case 'delivery_small': return '/delivery-small';
      case 'delivery': return '/delivery-large';
      case 'admin': return '/admin';
      case 'community': return '/dashboard/community';
      default: return '/';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Login failed');
        setLoading(false);
        return;
      }
  const role = res.role;
  const from = location.state?.from?.pathname || routeForRole(role);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}
      
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email"
        fullWidth
        variant="outlined"
        required
        disabled={loading}
      />
      
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
        fullWidth
        variant="outlined"
        required
        disabled={loading}
      />
      
      <Box>
        <TextField
          label="Select Role (Auto-fill)"
          select
          value={selectedRole}
          onChange={(e) => handleAutoFill(e.target.value)}
          fullWidth
          variant="outlined"
          disabled={loading}
        >
          {ROLE_OPTIONS.map((r) => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Selecting a role auto-fills default credentials.
        </Typography>
      </Box>
      
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        size="large"
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
      </Button>
      
      <Box>
        <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom>
          Default credentials (select role above to auto-fill):
        </Typography>
        <Grid container spacing={1} sx={{ mt: 0.5 }}>
          {Object.entries(DEFAULTS).map(([role, val]) => (
            <Grid item xs={12} sm={6} key={role}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" sx={{ textTransform: 'capitalize', fontWeight: 'medium' }}>
                  {role}:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                  {val.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {val.password}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default LoginForm;

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextField, Button, Alert, Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ selectedDemo }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill credentials when a demo account is selected
  useEffect(() => {
    if (selectedDemo) {
      setEmail(selectedDemo.email);
      setPassword(selectedDemo.password);
      setError(''); // Clear any existing errors
    }
  }, [selectedDemo]);

  const routeForRole = (roles) => {
    // Use the first role to determine the dashboard
    const primaryRole = roles && roles.length > 0 ? roles[0] : 'customer';
    
    switch (primaryRole) {
      case 'customer': return '/customer';
      case 'farmer': return '/farmer';
      case 'business': return '/business';
      case 'restaurant': return '/restaurant';
      case 'delivery_large': return '/delivery-large';
      case 'delivery_small': return '/delivery-small';
      case 'admin': return '/admin';
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
      
      // Get the user's roles from the response
      const userRoles = res.user?.roles || res.roles || ['customer'];
      const from = location.state?.from?.pathname || routeForRole(userRoles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        fullWidth
        variant="outlined"
        required
        disabled={loading}
        autoComplete="email"
      />
      
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        fullWidth
        variant="outlined"
        required
        disabled={loading}
        autoComplete="current-password"
      />
      
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        size="large"
        disabled={loading || !email || !password}
        sx={{ mt: 2, py: 1.5 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
      </Button>

      {selectedDemo && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Demo account selected: {selectedDemo.role}
        </Alert>
      )}
    </Box>
  );
};

export default LoginForm;

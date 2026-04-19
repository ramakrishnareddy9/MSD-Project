import { useState } from 'react';
import { Container, Card, CardContent, Typography, TextField, Button, MenuItem, Box, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardPath } from '../utils/roleRouting';

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', role: 'customer', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(form.password)) {
      setError('Password must contain one uppercase letter, one lowercase letter, and one number');
      return;
    }

    if (!/^[+]?([\d\s\-()]){10,20}$/.test(form.phone)) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);

    try {
      const res = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        password: form.password,
        roles: [form.role]
      });

      if (!res.success) {
        setError(res.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const target = getDashboardPath(res.user || [form.role]);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(4, 120, 87, 0.18)', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary" textAlign="center" sx={{ letterSpacing: '-0.02em' }}>
              Start Fresh
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Create your FarmKart account and access your role dashboard instantly
            </Typography>
            
            <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {error && <Alert severity="error">{error}</Alert>}
              
              <TextField
                label="Full Name"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Enter your full name"
                fullWidth
                variant="outlined"
                required
                disabled={loading}
              />
              
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="Enter your email"
                fullWidth
                variant="outlined"
                required
                disabled={loading}
              />

              <TextField
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={onChange}
                placeholder="Enter your phone number"
                fullWidth
                variant="outlined"
                required
                disabled={loading}
              />

              <TextField
                label="Address"
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Enter your address"
                fullWidth
                variant="outlined"
                disabled={loading}
              />
              
              <TextField
                label="Role"
                name="role"
                select
                value={form.role}
                onChange={onChange}
                fullWidth
                variant="outlined"
                required
                disabled={loading}
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="farmer">Farmer</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="travel_agency">Travel Agency</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="delivery_large">Large Scale Delivery</MenuItem>
                <MenuItem value="delivery_small">Small Scale Delivery</MenuItem>
              </TextField>
              
              <TextField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                placeholder="Enter your password"
                fullWidth
                variant="outlined"
                required
                disabled={loading}
                helperText="Minimum 8 chars with uppercase, lowercase, and number"
              />
              
              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                placeholder="Confirm your password"
                fullWidth
                variant="outlined"
                required
                disabled={loading}
              />
              
              <Button 
                variant="contained" 
                color="primary" 
                type="submit" 
                fullWidth 
                size="large"
                disabled={loading || !form.name || !form.email || !form.password || !form.confirmPassword}
                sx={{ mt: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>
              
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                Already have an account?{' '}
                <Button variant="text" color="primary" onClick={() => navigate('/login')} disabled={loading}>
                  Sign In
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Signup;

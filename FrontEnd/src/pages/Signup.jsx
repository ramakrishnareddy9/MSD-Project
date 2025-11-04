import { useState } from 'react';
import { Container, Card, CardContent, Typography, TextField, Button, MenuItem, Box, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', role: 'customer', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      alert('Account created successfully! Please login with your credentials.');
      navigate('/login');
    }, 1500);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Card sx={{ width: '100%', maxWidth: 450, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary" textAlign="center">
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Join FarmKart today
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

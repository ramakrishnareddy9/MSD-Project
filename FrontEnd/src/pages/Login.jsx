import { Container, Card, CardContent, Typography, Box, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardPath } from '../utils/roleRouting';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setError(res.error || 'Login failed');
        setLoading(false);
        return;
      }
      
      const userRoles = res.user?.roles || res.roles || ['customer'];
      const from = location.state?.from?.pathname || getDashboardPath(userRoles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Card sx={{ width: '100%', maxWidth: 420, boxShadow: '0 18px 48px rgba(3, 105, 161, 0.2)', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary" textAlign="center">
              Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Access your FarmKart workspace
            </Typography>
            
            <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {error && <Alert severity="error">{error}</Alert>}
              
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
                disabled={loading || !email.trim() || !password}
                sx={{ mt: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => navigate('/reset-password')}
                sx={{ textTransform: 'none' }}
              >
                Forgot your password?
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;

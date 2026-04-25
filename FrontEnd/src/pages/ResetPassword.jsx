import { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { showToast } from '../Components/common/Toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset token is missing or invalid');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, form.password, form.confirmPassword);

      if (!response.success) {
        setError(response.message || 'Unable to reset password');
        return;
      }

      setSuccess('Password updated successfully. You can sign in now.');
      showToast.success('Password updated successfully. You can sign in now.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(4, 120, 87, 0.18)', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom textAlign="center">
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Create a new password for your FarmKart account
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="New Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
              />

              <TextField
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !token}
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  py: 1.6,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2
                }}
              >
                Reset Password
              </Button>

              <Button variant="text" onClick={() => navigate('/login')} sx={{ textTransform: 'none' }}>
                Back to Login
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ResetPassword;
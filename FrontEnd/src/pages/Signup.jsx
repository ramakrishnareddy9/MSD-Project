import { useState } from 'react';
import { Container, Card, CardContent, Typography, TextField, Button, MenuItem, Box, Alert } from '@mui/material';

const Signup = () => {
  const [form, setForm] = useState({ name: '', email: '', role: 'customer', password: '' });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e) => {
    e.preventDefault();
    alert('Signup successful (dummy). You can now login with predefined credentials.');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 500 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary">
              Signup
            </Typography>
            <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Name"
                name="name"
                value={form.name}
                onChange={onChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Role"
                name="role"
                select
                value={form.role}
                onChange={onChange}
                fullWidth
                variant="outlined"
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="farmer">Farmer</MenuItem>
                <MenuItem value="transporter">Transporter</MenuItem>
                <MenuItem value="community">Community</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
              <TextField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                fullWidth
                variant="outlined"
              />
              <Button variant="contained" color="primary" type="submit" fullWidth size="large">
                Create Account
              </Button>
              <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                Note: This is a dummy page. Use predefined credentials on the Login page.
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Signup;

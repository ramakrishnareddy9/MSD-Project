import { Container, Card, CardContent, Typography, Box, Paper, Grid, Chip } from '@mui/material';
import LoginForm from '../Components/LoginForm.jsx';
import { useState } from 'react';

const Login = () => {
  const [selectedDemo, setSelectedDemo] = useState(null);

  const demoAccounts = [
    { role: 'Admin', email: 'admin@farmkart.com', password: 'Admin@123', color: 'error' },
    { role: 'Customer', email: 'customer@farmkart.com', password: 'Customer@123', color: 'primary' },
    { role: 'Farmer', email: 'farmer@farmkart.com', password: 'Farmer@123', color: 'success' },
    { role: 'Business', email: 'business@farmkart.com', password: 'Business@123', color: 'warning' },
    { role: 'Restaurant', email: 'restaurant@farmkart.com', password: 'Restaurant@123', color: 'secondary' },
    { role: 'Large Delivery', email: 'delivery.large@farmkart.com', password: 'Delivery@123', color: 'info' },
    { role: 'Small Delivery', email: 'delivery.small@farmkart.com', password: 'Delivery@123', color: 'default' }
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ minHeight: '90vh', py: 4 }}>
        <Grid container spacing={3}>
          {/* Login Form */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary">
                  Login
                </Typography>
                <LoginForm selectedDemo={selectedDemo} />
              </CardContent>
            </Card>
          </Grid>

          {/* Demo Accounts */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: 'background.default' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom color="text.primary">
                  Demo Accounts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click any account to auto-fill credentials
                </Typography>
                
                {demoAccounts.map((account) => (
                  <Paper 
                    key={account.role}
                    elevation={selectedDemo?.email === account.email ? 3 : 1}
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: selectedDemo?.email === account.email ? '2px solid' : '1px solid',
                      borderColor: selectedDemo?.email === account.email ? 'primary.main' : 'divider',
                      '&:hover': { 
                        transform: 'translateX(5px)',
                        boxShadow: 3 
                      }
                    }}
                    onClick={() => setSelectedDemo(account)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip 
                            label={account.role} 
                            size="small" 
                            color={account.color}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          📧 {account.email}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          🔑 {account.password}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  💡 These are test accounts with pre-loaded data
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Login;

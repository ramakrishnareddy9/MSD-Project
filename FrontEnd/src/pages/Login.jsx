import { Container, Card, CardContent, Typography, Box } from '@mui/material';
import LoginForm from '../Components/LoginForm';

const Login = () => {
  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 500 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary">
              Login
            </Typography>
            <LoginForm />
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;

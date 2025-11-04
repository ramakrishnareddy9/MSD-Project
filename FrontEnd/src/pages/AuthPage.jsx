import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Box, Tabs, Tab } from '@mui/material';
import Login from './Login.jsx';
import Signup from './Signup.jsx';

const AuthPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === '/signup' ? 1 : 0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ minHeight: '90vh', py: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="Login" />
            <Tab label="Sign Up" />
          </Tabs>
        </Box>
        
        {activeTab === 0 ? <Login /> : <Signup />}
      </Box>
    </Container>
  );
};

export default AuthPage;

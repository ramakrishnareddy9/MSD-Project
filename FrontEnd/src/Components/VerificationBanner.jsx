import React from 'react';
import { Alert, Box, Link, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const VerificationBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const needsEmail = !user.emailVerified;
  const needsPhone = !user.phoneVerified;
  const needsKyc = user.roles?.includes('business') && user.kycStatus !== 'verified';

  if (!needsEmail && !needsPhone && !needsKyc) return null;

  const parts = [];
  if (needsEmail) parts.push('verify your email');
  if (needsPhone) parts.push('verify your phone');
  if (needsKyc) parts.push('complete KYC');

  const message = `To continue using marketplace features please ${parts.join(' and ')}.`;

  return (
    <Box sx={{ width: '100%', p: 1 }}>
      <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => navigate('/me/verify')}>Take action</Button>}>
        {message}
      </Alert>
    </Box>
  );
};

export default VerificationBanner;

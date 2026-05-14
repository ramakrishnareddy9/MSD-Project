import React from 'react';
import { Box, Button, Typography } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Send to logging service if available
    if (window && window.console) console.error('ErrorBoundary caught', error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}>
          <Typography variant="h5">Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary">An unexpected error occurred. You can try reloading the section.</Typography>
          <Button variant="contained" onClick={this.reset}>Retry</Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

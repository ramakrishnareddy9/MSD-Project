import { createTheme } from '@mui/material/styles';

// Create a custom MUI theme that complements Tailwind
const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#22c55e', // Tailwind green-500
      light: '#4ade80', // Tailwind green-400
      dark: '#16a34a', // Tailwind green-600
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3b82f6', // Tailwind blue-500
      light: '#60a5fa', // Tailwind blue-400
      dark: '#2563eb', // Tailwind blue-600
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444', // Tailwind red-500
    },
    warning: {
      main: '#f59e0b', // Tailwind amber-500
    },
    info: {
      main: '#3b82f6', // Tailwind blue-500
    },
    success: {
      main: '#22c55e', // Tailwind green-500
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

export default muiTheme;

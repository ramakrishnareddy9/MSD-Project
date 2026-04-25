import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, SOCKET_EVENTS } from '../services/socket';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success', 'info', 'warning', 'error'
    duration: 3000
  });

  const showNotification = useCallback((message, severity = 'info', duration = 3000) => {
    setNotification({
      open: true,
      message,
      severity,
      duration
    });
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket();

    const handleRealtimeNotification = (payload = {}) => {
      const severityMap = {
        success: 'success',
        info: 'info',
        warning: 'warning',
        alert: 'warning',
        error: 'error',
        order: 'info',
        delivery: 'info',
        message: 'info',
        system: 'info',
        community: 'info'
      };

      const title = payload.title ? `${payload.title}: ` : '';
      showNotification(`${title}${payload.message || 'You have a new notification'}`, severityMap[payload.type] || 'info');
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleRealtimeNotification);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleRealtimeNotification);
      if (!isAuthenticated) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, isLoading, showNotification]);

  const showSuccess = useCallback((message) => {
    showNotification(message, 'success');
  }, [showNotification]);

  const showError = useCallback((message) => {
    showNotification(message, 'error');
  }, [showNotification]);

  const showWarning = useCallback((message) => {
    showNotification(message, 'warning');
  }, [showNotification]);

  const showInfo = useCallback((message) => {
    showNotification(message, 'info');
  }, [showNotification]);

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    currentUserId: user?._id || null
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

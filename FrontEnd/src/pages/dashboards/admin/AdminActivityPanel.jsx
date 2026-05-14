import React, { memo } from 'react';
import {
  Card, CardContent, CardHeader, Stack, Typography, Chip,
  List, ListItem, ListItemIcon, ListItemText, Divider,
  Alert, CircularProgress, Box, Button
} from '@mui/material';
import {
  CheckCircle, Warning, Info, Error as ErrorIcon,
  SystemUpdate, ShoppingCart, Person, Settings,
  Refresh, TrendingUp, AlertCircle
} from '@mui/icons-material';

/**
 * Memoized component to display admin activity log
 * Prevents re-renders when parent component updates
 */
const AdminActivityPanel = memo(({
  activities = [],
  loading = false,
  error = null,
  onRefresh = () => {}
}) => {
  const getActivityIcon = (type) => {
    const icons = {
      System: SystemUpdate,
      Order: ShoppingCart,
      User: Person,
      Alert: AlertCircle,
      Settings: Settings,
      Analytics: TrendingUp
    };
    return icons[type] || Info;
  };

  const getActivityColor = (severity) => {
    const colors = {
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info'
    };
    return colors[severity] || 'default';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      success: CheckCircle,
      warning: Warning,
      error: ErrorIcon,
      info: Info
    };
    return icons[severity] || Info;
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  if (error) {
    return (
      <Alert severity="error">
        Error loading activities: {error}
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader
        title="System Activity"
        subheader={`Latest ${activities.length} activities`}
        action={
          <Button
            startIcon={<Refresh />}
            size="small"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />
      <CardContent>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
            <CircularProgress />
          </Stack>
        ) : activities.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
            No activities recorded
          </Typography>
        ) : (
          <List disablePadding>
            {activities.map((activity, idx) => {
              const ActivityIcon = getActivityIcon(activity.type);
              const SeverityIcon = getSeverityIcon(activity.severity);

              return (
                <Box key={idx}>
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: `${getActivityColor(activity.severity)}.light`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ActivityIcon
                          fontSize="small"
                          color={getActivityColor(activity.severity)}
                        />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={500}>
                            {activity.type}
                          </Typography>
                          <Chip
                            icon={SeverityIcon}
                            label={activity.severity}
                            size="small"
                            color={getActivityColor(activity.severity)}
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="textPrimary">
                            {activity.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatTime(activity.ts)}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {idx < activities.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
});

AdminActivityPanel.displayName = 'AdminActivityPanel';

export default AdminActivityPanel;

import { Button as MuiButton, CircularProgress } from '@mui/material';

const Button = ({ 
  children, 
  loading = false, 
  disabled = false,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  sx = {},
  ...props 
}) => {
  return (
    <MuiButton
      variant={variant}
      size={size}
      color={color}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      onClick={onClick}
      type={type}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 2,
        ...sx
      }}
      {...props}
    >
      {loading ? (
        <CircularProgress size={24} color="inherit" />
      ) : (
        children
      )}
    </MuiButton>
  );
};

export default Button;

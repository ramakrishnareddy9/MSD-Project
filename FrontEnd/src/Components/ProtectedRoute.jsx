import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './common/Loader';

/**
 * Protected Route Component
 * Implements role-based access control (RBAC) for routes
 * Per REACT_FRONTEND_PROMPT.md lines 96-109
 * 
 * @param {ReactNode} children - Child components to render if authorized
 * @param {string[]} allowedRoles - Array of role names that can access this route
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loader while checking authentication
  if (isLoading) {
    return <Loader />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any of the allowed roles
  if (allowedRoles.length > 0) {
    // User.roles is an array, check if any role matches
    const hasAllowedRole = user.roles?.some(role => allowedRoles.includes(role));
    
    if (!hasAllowedRole) {
      // Redirect to unauthorized page
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
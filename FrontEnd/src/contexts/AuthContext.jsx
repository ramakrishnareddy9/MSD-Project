import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getPrimaryRole } from '../utils/roleRouting';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, check if the user has a valid session by calling /auth/me.
    // The httpOnly cookie is sent automatically by the browser.
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success && response.data?.user) {
        setUser({
          ...response.data.user,
          role: getPrimaryRole(response.data.user)
        });
      } else {
        setUser(null);
      }
    } catch {
      // 401 or network error — user is not logged in
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        const userData = {
          ...response.data.user,
          role: getPrimaryRole(response.data.user)
        };
        
        // Only store user profile in React state — no token, no localStorage.
        // The httpOnly cookie was set by the server.
        setUser(userData);
        return { success: true, role: userData.role, user: userData };
      }
      
      return { success: false, error: response.message || 'Login failed' };
    } catch (error) {
      console.error('API Login error', error);
      const validationMessage = Array.isArray(error?.details) && error.details.length > 0
        ? error.details[0]?.message
        : null;
      return {
        success: false,
        error: validationMessage || error.message || 'Invalid email or password. Please check your credentials.'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const newUser = {
          ...response.data.user,
          role: getPrimaryRole(response.data.user)
        };
        
        // Only store user profile in React state — no token, no localStorage.
        setUser(newUser);
        return { success: true, user: newUser };
      }
      
      return { success: false, error: response.message || 'Registration failed' };
    } catch (error) {
      console.error('API Registration error', error);
      const validationMessage = Array.isArray(error?.details) && error.details.length > 0
        ? error.details[0]?.message
        : null;
      return { success: false, error: validationMessage || error.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    try {
      // Tell the server to clear the httpOnly cookie
      await authAPI.logout();
    } catch {
      // Even if the API call fails, clear local state
    }
    setUser(null);
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      if (!prev) return patch;
      return { ...prev, ...(patch || {}) };
    });
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    isLoading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

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
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('farmkart_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Optionally verify token with backend
        verifyToken(parsed.token);
      } catch {
        setUser(null);
        localStorage.removeItem('farmkart_user');
      }
    }
    setIsLoading(false);
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success) {
        setUser(prev => ({ ...prev, ...response.data.user, token }));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Token verification failed:', error);
      }
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        const userData = {
          ...response.data.user,
          token: response.data.token,
          role: response.data.user.roles[0]
        };
        
        setUser(userData);
        localStorage.setItem('farmkart_user', JSON.stringify(userData));
        return { success: true, role: userData.role, user: userData };
      }
      
      return { success: false, error: response.message || 'Login failed' };
    } catch (error) {
      console.error('API Login error', error);
      return { success: false, error: error.message || 'Invalid email or password. Please check your credentials.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const newUser = {
          ...response.data.user,
          token: response.data.token,
          role: response.data.user.roles[0]
        };
        
        setUser(newUser);
        localStorage.setItem('farmkart_user', JSON.stringify(newUser));
        return { success: true, user: newUser };
      }
      
      return { success: false, error: response.message || 'Registration failed' };
    } catch (error) {
      console.error('API Registration error', error);
      return { success: false, error: error.message || 'Registration failed.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('farmkart_user');
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      try { 
        localStorage.setItem('farmkart_user', JSON.stringify(next)); 
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to update user in localStorage:', error);
        }
      }
      return next;
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

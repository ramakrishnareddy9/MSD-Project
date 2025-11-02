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
    // Try real API first, fallback to mock if backend is not available
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
      console.error('API Login error, trying mock fallback:', error);
      
      // MOCK LOGIN FALLBACK - For development without backend
      const mockUsers = {
        'customer@farmkart.com': { name: 'Aarav Customer', email: 'customer@farmkart.com', roles: ['customer'], password: 'customer123' },
        'farmer1@farmkart.com': { name: 'Rohan Farmer', email: 'farmer1@farmkart.com', roles: ['farmer'], password: 'farmer123' },
        'farmer2@farmkart.com': { name: 'Suman Farmer', email: 'farmer2@farmkart.com', roles: ['farmer'], password: 'farmer123' },
        'business@farmkart.com': { name: 'Fresh Mart Pvt Ltd', email: 'business@farmkart.com', roles: ['business'], password: 'business123' },
        'restaurant@farmkart.com': { name: 'Green Cuisine', email: 'restaurant@farmkart.com', roles: ['restaurant'], password: 'restaurant123' },
        'delivery@farmkart.com': { name: 'Swift Logistics', email: 'delivery@farmkart.com', roles: ['delivery'], password: 'delivery123' },
        'admin@farmkart.com': { name: 'Admin User', email: 'admin@farmkart.com', roles: ['admin'], password: 'admin123' },
        // Legacy test emails
        'customer@test.com': { name: 'Test Customer', email: 'customer@test.com', roles: ['customer'], password: 'password' },
        'farmer@test.com': { name: 'Test Farmer', email: 'farmer@test.com', roles: ['farmer'], password: 'password' }
      };

      const mockUser = mockUsers[email.toLowerCase()];
      
      if (mockUser && mockUser.password === password) {
        const userData = {
          name: mockUser.name,
          email: mockUser.email,
          roles: mockUser.roles,
          token: 'mock-jwt-token-' + Date.now(),
          role: mockUser.roles[0],
          _id: 'mock-user-' + Date.now()
        };
        
        setUser(userData);
        localStorage.setItem('farmkart_user', JSON.stringify(userData));
        console.log('✅ Mock login successful (backend not available)');
        return { success: true, role: userData.role, user: userData };
      }
      
      return { success: false, error: 'Invalid email or password. Please check your credentials.' };
    }
  };

  const register = async (userData) => {
    // Try real API first, fallback to mock if backend is not available
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
      console.error('API Registration error, using mock fallback:', error);
      
      // MOCK REGISTRATION FALLBACK - For development without backend
      const newUser = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        roles: [userData.role || 'customer'],
        token: 'mock-jwt-token-' + Date.now(),
        role: userData.role || 'customer',
        _id: 'mock-user-' + Date.now()
      };
      
      setUser(newUser);
      localStorage.setItem('farmkart_user', JSON.stringify(newUser));
      console.log('✅ Mock registration successful (backend not available)');
      return { success: true, user: newUser };
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

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
      console.error('Token verification failed:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    // MOCK LOGIN - Bypass backend API (for development without MongoDB)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock user data based on email
      const mockUsers = {
        'customer@test.com': { name: 'John Doe', email: 'customer@test.com', roles: ['customer'] },
        'farmer@test.com': { name: 'Ramesh Patel', email: 'farmer@test.com', roles: ['farmer'] },
        'business@test.com': { name: 'ABC Corp', email: 'business@test.com', roles: ['business'] },
        'restaurant@test.com': { name: 'Food Palace', email: 'restaurant@test.com', roles: ['restaurant'] },
        'delivery@test.com': { name: 'Fast Delivery', email: 'delivery@test.com', roles: ['delivery'] },
        'delivery_large@test.com': { name: 'Long Haul Co', email: 'delivery_large@test.com', roles: ['delivery_large'] },
        'delivery_small@test.com': { name: 'Local Couriers', email: 'delivery_small@test.com', roles: ['delivery_small'] },
        'admin@test.com': { name: 'Admin User', email: 'admin@test.com', roles: ['admin'] },
        'community@test.com': { name: 'Community Manager', email: 'community@test.com', roles: ['community'] }
      };

      const mockUser = mockUsers[email.toLowerCase()];
      
      if (mockUser && password === 'password') {
        const userData = {
          ...mockUser,
          token: 'mock-jwt-token-' + Date.now(),
          role: mockUser.roles[0]
        };
        
        setUser(userData);
        localStorage.setItem('farmkart_user', JSON.stringify(userData));
        return { success: true, role: userData.role, user: userData };
      }
      
      return { success: false, error: 'Invalid credentials. Use password: "password"' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
    
    /* REAL API LOGIN - Uncomment when MongoDB is connected
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
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
    */
  };

  const register = async (userData) => {
    // MOCK REGISTRATION - Bypass backend API (for development without MongoDB)
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newUser = {
        name: userData.name,
        email: userData.email,
        roles: [userData.role || 'customer'],
        token: 'mock-jwt-token-' + Date.now(),
        role: userData.role || 'customer'
      };
      
      setUser(newUser);
      localStorage.setItem('farmkart_user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
    
    /* REAL API REGISTRATION - Uncomment when MongoDB is connected
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
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
    */
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
        console.error('Failed to update user in localStorage:', error);
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

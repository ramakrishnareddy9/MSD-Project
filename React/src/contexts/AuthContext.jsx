import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Default credentials for each role
const DEFAULT_CREDENTIALS = {
  customer: { username: 'customer', password: 'customer123' },
  farmer: { username: 'farmer', password: 'farmer123' },
  transporter: { username: 'transporter', password: 'transport123' },
  community: { username: 'community', password: 'community123' },
  business: { username: 'business', password: 'business123' },
  admin: { username: 'admin', password: 'admin123' }
};

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
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (username, password) => {
    // Check credentials against default credentials
    for (const [role, credentials] of Object.entries(DEFAULT_CREDENTIALS)) {
      if (credentials.username === username && credentials.password === password) {
        const userData = { username, role };
        setUser(userData);
        localStorage.setItem('farmkart_user', JSON.stringify(userData));
        return { success: true, role };
      }
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('farmkart_user');
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

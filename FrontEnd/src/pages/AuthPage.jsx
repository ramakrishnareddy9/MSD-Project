import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Email, 
  Lock, 
  Google, 
  Facebook, 
  Twitter, 
  Person,
  Phone,
  CreditCard,
  AccountCircle,
  CheckCircle,
  Business,
  Restaurant,
  LocalShipping,
  AdminPanelSettings,
  Agriculture
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/signup' ? 'Register' : 'Login'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    aadhar: '',
    name: '',
    mobile: '',
    type: 'customer'
  });
  
  // Forget Password Form State
  const [forgetForm, setForgetForm] = useState({ email: '' });

  const routeForRole = (roles) => {
    const primaryRole = roles && roles.length > 0 ? roles[0] : 'customer';
    
    switch (primaryRole) {
      case 'customer': return '/customer';
      case 'farmer': return '/farmer';
      case 'business': return '/business';
      case 'restaurant': return '/restaurant';
      case 'delivery_large': return '/delivery-large';
      case 'delivery_small': return '/delivery-small';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await login(loginForm.email, loginForm.password);
      if (!res.success) {
        setError(res.error || 'Login failed');
        setLoading(false);
        return;
      }
      
      const userRoles = res.user?.roles || res.roles || ['customer'];
      const from = location.state?.from?.pathname || routeForRole(userRoles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      setLoading(false);
      alert('Account created successfully! Please login with your credentials.');
      setActiveTab('Login');
    }, 1500);
  };

  const handleForgetPassword = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      setLoading(false);
      alert('Password reset link sent to your email!');
      setActiveTab('Login');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-400 to-purple-500">
      {/* Left Side - Green Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-green-500 relative">
        <div className="flex flex-col justify-between p-12 text-white w-full">
          {/* Header */}
          <div>
            <div className="flex items-center mb-8">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
                <span className="text-green-500 font-bold text-lg">🌿</span>
              </div>
              <Typography variant="h4" className="font-bold text-white">
                FarmKart
              </Typography>
            </div>
            
            <Typography variant="h6" className="text-white mb-8 leading-relaxed">
              Connecting farmers directly with consumers.<br />
              Fresh produce, fair prices, sustainable<br />
              farming.
            </Typography>
          </div>
          
          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start">
              <CheckCircle className="text-white mr-4 mt-1" />
              <div>
                <Typography className="text-white font-semibold text-lg">Direct from Farmers</Typography>
                <Typography className="text-green-100 text-sm">No middlemen, better prices</Typography>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="text-white mr-4 mt-1" />
              <div>
                <Typography className="text-white font-semibold text-lg">Fresh & Organic</Typography>
                <Typography className="text-green-100 text-sm">Quality assured produce</Typography>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="text-white mr-4 mt-1" />
              <div>
                <Typography className="text-white font-semibold text-lg">Fast Delivery</Typography>
                <Typography className="text-green-100 text-sm">Within 24 hours of harvest</Typography>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Tab Header */}
          <div className="flex mb-8 bg-gray-50 rounded-lg p-1">
            {[
              { key: 'Login', label: 'Login' },
              { key: 'Register', label: 'Register' },
              { key: 'Reset', label: 'Reset' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <Alert severity="error" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Login Form */}
          {activeTab === 'Login' && (
            <div>
              <div className="mb-6">
                <Typography variant="h4" className="font-bold text-gray-800 mb-2">
                  Welcome Back!
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Login to access your FarmKart account
                </Typography>
              </div>

              <div className="space-y-4 mb-6">
                <TextField
                  fullWidth
                  placeholder="Username"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': {
                        border: 'none',
                      },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': {
                        border: 'none',
                      },
                    },
                  }}
                />
              </div>

              <Button
                onClick={handleLogin}
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: '#22c55e',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  marginBottom: '24px',
                  '&:hover': {
                    backgroundColor: '#16a34a',
                  },
                }}
              >
                {loading ? 'Signing in...' : 'Login →'}
              </Button>

              {/* Demo Credentials */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <span className="text-blue-600 text-sm font-semibold">🔵 Demo Credentials:</span>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: <AdminPanelSettings className="text-red-600" />, label: 'Admin:', email: 'admin@farmkart.com', password: 'admin123' },
                    { icon: <AccountCircle className="text-blue-600" />, label: 'Customer:', email: 'customer@farmkart.com', password: 'customer123' },
                    { icon: <Agriculture className="text-green-600" />, label: 'Farmer:', email: 'farmer1@farmkart.com', password: 'farmer123' },
                    { icon: <Business className="text-indigo-600" />, label: 'Business:', email: 'business@farmkart.com', password: 'business123' },
                    { icon: <Restaurant className="text-purple-600" />, label: 'Restaurant:', email: 'restaurant@farmkart.com', password: 'restaurant123' },
                    { icon: <LocalShipping className="text-orange-600" />, label: 'Delivery:', email: 'delivery@farmkart.com', password: 'delivery123' },
                    { icon: <AccountCircle className="text-gray-600" />, label: 'Test Customer:', email: 'customer@test.com', password: 'password' }
                  ].map((item, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        setLoginForm({ email: item.email, password: item.password });
                      }}
                      className="flex items-center cursor-pointer hover:bg-blue-100 p-2 rounded"
                    >
                      {item.icon}
                      <span className="ml-2 text-gray-700 font-medium">{item.label}</span>
                      <span className="ml-2 text-gray-600">{item.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Login */}
              <div className="text-center">
                <Typography variant="body2" className="text-gray-500 mb-4">
                  Or continue with
                </Typography>
                <div className="flex justify-center space-x-4">
                  <IconButton className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                    <Google className="text-red-500" />
                  </IconButton>
                  <IconButton className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                    <Facebook className="text-blue-600" />
                  </IconButton>
                  <IconButton className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                    <Twitter className="text-blue-400" />
                  </IconButton>
                </div>
              </div>
            </div>
          )}

          {/* Register Form */}
          {activeTab === 'Register' && (
            <div>
              <div className="mb-6">
                <Typography variant="h4" className="font-bold text-gray-800 mb-2">
                  Create Account
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Join FarmKart and start shopping fresh produce
                </Typography>
              </div>

              <div className="space-y-4 mb-6">
                <TextField
                  fullWidth
                  placeholder="Full Name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  type="email"
                  placeholder="Email Address"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  type="password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />

                <FormControl fullWidth variant="outlined">
                  <Select
                    value={registerForm.type}
                    onChange={(e) => setRegisterForm({ ...registerForm, type: e.target.value })}
                    displayEmpty
                    required
                    disabled={loading}
                    sx={{
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': { border: 'none' },
                    }}
                  >
                    <MenuItem value="" disabled>Select Account Type</MenuItem>
                    <MenuItem value="customer">Customer</MenuItem>
                    <MenuItem value="farmer">Farmer</MenuItem>
                    <MenuItem value="business">Business</MenuItem>
                    <MenuItem value="restaurant">Restaurant</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <Button
                onClick={handleRegister}
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: '#22c55e',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#16a34a' },
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          )}

          {/* Reset Form */}
          {activeTab === 'Reset' && (
            <div>
              <div className="mb-6">
                <Typography variant="h4" className="font-bold text-gray-800 mb-2">
                  Reset Password
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Enter your email to receive reset instructions
                </Typography>
              </div>

              <div className="space-y-4 mb-6">
                <TextField
                  fullWidth
                  type="email"
                  placeholder="Email Address"
                  value={forgetForm.email}
                  onChange={(e) => setForgetForm({ ...forgetForm, email: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />
              </div>

              <Button
                onClick={handleForgetPassword}
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: '#22c55e',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  marginBottom: '24px',
                  '&:hover': { backgroundColor: '#16a34a' },
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <button 
                  onClick={() => setActiveTab('Login')}
                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

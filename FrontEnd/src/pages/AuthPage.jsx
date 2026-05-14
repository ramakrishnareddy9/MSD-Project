import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  Alert,
  Chip
} from '@mui/material';
import { 
  Email, 
  Lock, 
  Google, 
  Facebook, 
  Twitter, 
  Person,
  Phone,
  AccountCircle,
  CheckCircle,
  Business,
  Restaurant,
  LocalShipping,
  AdminPanelSettings,
  Agriculture
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardPath } from '../utils/roleRouting';
import { authAPI } from '../services/api';

const AuthPage = ({ mode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register: authRegister } = useAuth();
  
  const initialTabFromPath = location.pathname === '/signup' ? 'Register' : 'Login';
  const modeTab = mode === 'register' ? 'Register' : mode === 'reset' ? 'Reset' : mode === 'login' ? 'Login' : null;
  const [activeTab, setActiveTab] = useState(modeTab || initialTabFromPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login Form State (react-hook-form)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  // Register form
  const regForm = useForm({ defaultValues: { role: 'customer' } });
  const { register: regRegister, handleSubmit: regHandleSubmit, formState: { errors: regErrors }, watch: regWatch } = regForm;

  // Reset form
  const resetForm = useForm();
  const { register: resetRegister, handleSubmit: resetHandleSubmit, formState: { errors: resetErrors } } = resetForm;
  
  // Controlled state removed — using react-hook-form for register & reset

  const buildRegisterPayload = (values) => {
    const v = values || {};
    const role = v.role || 'customer';
    const payload = {
      name: (v.name || '').trim(),
      email: (v.email || '').trim().toLowerCase(),
      phone: (v.phone || '').trim(),
      address: (v.address || '').trim(),
      city: (v.city || '').trim(),
      password: v.password,
      roles: [role],
      profileData: {}
    };

    if (role === 'farmer') {
      payload.farmName = (v.farmName || v.name || '').trim() || `${(v.name || '').trim()}'s Farm`;
      payload.totalLand = v.totalLand || '';
      payload.experience = v.experience || '';
      payload.profileData.farmer = {
        farmName: payload.farmName,
        farmSize: Number(payload.totalLand) || 1,
        experience: Number(payload.experience) || 0
      };
    }

    if (role === 'business') {
      payload.businessType = (v.businessType || '').trim() || 'Business';
      payload.owner = (v.owner || v.name || '').trim();
      payload.gst = (v.gst || '').trim();
      payload.profileData.business = {
        companyName: (v.companyName || v.name || '').trim(),
        companyType: 'retailer',
        gstNumber: payload.gst
      };
    }

    if (role === 'restaurant') {
      payload.businessType = 'Restaurant';
      payload.profileData.restaurant = { restaurantName: (v.companyName || v.name || '').trim() };
    }

    if (role === 'travel_agency') {
      payload.profileData.travelAgency = { agencyName: (v.agencyName || v.name || '').trim() };
    }

    if (role === 'delivery_large' || role === 'delivery_small') {
      payload.licenseNumber = v.licenseNumber || '';
      payload.accountType = v.accountType || (role === 'delivery_large' ? 'Large-Scale Transporter' : 'Last-Mile Delivery');
      payload.profileData.delivery = { companyName: (v.companyName || v.name || '').trim(), scale: role === 'delivery_large' ? 'large' : 'small' };
    }

    return payload;
  };

  const handleLogin = handleSubmit(async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await login(data.email.trim(), data.password);
      if (!res.success) {
        setError(res.error || 'Login failed');
        setLoading(false);
        return;
      }

      const userRoles = res.user?.roles || res.roles || ['customer'];
      const from = location.state?.from?.pathname || getDashboardPath(userRoles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  });

  const submitRegister = regHandleSubmit(async (values) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authRegister(buildRegisterPayload(values));

      if (!res.success) {
        setError(res.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const userRoles = res.user?.roles || [values.role || 'customer'];
      const from = location.state?.from?.pathname || getDashboardPath(userRoles);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  });

  const submitReset = resetHandleSubmit(async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(data.email.trim());

      if (response.success) {
        setSuccess(response.message || 'Password reset link sent to your email');
        resetForm.reset();
        setActiveTab('Login');
        return;
      }

      setError(response.message || 'Unable to send password reset link');
    } catch (err) {
      setError(err.message || 'Unable to send password reset link');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-100 via-lime-50 to-amber-100">
      {/* Left Side - Green Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-teal-600 relative">
        <div className="flex flex-col justify-between p-12 text-white w-full">
          {/* Header */}
          <div>
            <div className="flex items-center mb-8">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
                <span className="text-green-500 font-bold text-lg">🌿</span>
              </div>
              <Typography variant="h4" className="font-bold text-white tracking-tight">
                FarmKart
              </Typography>
            </div>

            <Chip label="Production Auth" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', width: 'fit-content', mb: 3 }} />
            
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
      <div className="w-full lg:w-1/2 bg-white/90 backdrop-blur-sm flex items-center justify-center p-8">
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

              {success && (
                <Alert severity="success" className="mb-6">
                  {success}
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

              <form onSubmit={handleLogin} className="space-y-4 mb-6">
                <TextField
                  fullWidth
                  placeholder="Email address"
                  {...register('email', { required: 'Email is required' })}
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
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />

                <TextField
                  fullWidth
                  type="password"
                  placeholder="Password"
                  {...register('password', { required: 'Password is required' })}
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
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ backgroundColor: '#22c55e', borderRadius: '8px', padding: '12px', fontSize: '16px', fontWeight: 600, textTransform: 'none', marginBottom: '24px', '&:hover': { backgroundColor: '#16a34a' } }}>
                  {loading ? 'Signing in...' : 'Login →'}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <span className="text-blue-600 text-sm font-semibold">🔵 Demo Credentials:</span>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: <AdminPanelSettings className="text-red-600" />, label: 'Admin:', email: 'admin@farmkart.com', password: 'admin123' },
                    { icon: <AccountCircle className="text-blue-600" />, label: 'Customer:', email: 'customer1@farmkart.local', password: 'password123' },
                    { icon: <Agriculture className="text-green-600" />, label: 'Farmer:', email: 'farmer1@farmkart.local', password: 'password123' },
                    { icon: <Business className="text-indigo-600" />, label: 'Business:', email: 'business1@farmkart.local', password: 'password123' },
                    { icon: <Restaurant className="text-purple-600" />, label: 'Restaurant:', email: 'restaurant1@farmkart.local', password: 'password123' },
                    { icon: <LocalShipping className="text-orange-600" />, label: 'Travel Agency:', email: 'travelagency@farmkart.local', password: 'password123' }
                  ].map((item, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        // autofill login form fields
                        setValue('email', item.email, { shouldValidate: true, shouldDirty: true });
                        setValue('password', item.password, { shouldValidate: true, shouldDirty: true });
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

              <form onSubmit={submitRegister} className="space-y-4 mb-6">
                <TextField
                  fullWidth
                  placeholder="Full Name"
                  {...regRegister('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })}
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
                  error={!!regErrors.name}
                  helperText={regErrors.name?.message || ''}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <TextField
                  fullWidth
                  type="email"
                  placeholder="Email Address"
                  {...regRegister('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Email className="text-gray-400" /></InputAdornment>) }}
                  variant="outlined"
                  required
                  disabled={loading}
                  error={!!regErrors.email}
                  helperText={regErrors.email?.message || ''}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <TextField
                  fullWidth
                  type="tel"
                  placeholder="Phone Number"
                  {...regRegister('phone', { required: 'Phone is required', minLength: { value: 10, message: 'Enter a valid phone number' } })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Phone className="text-gray-400" /></InputAdornment>) }}
                  variant="outlined"
                  required
                  disabled={loading}
                  error={!!regErrors.phone}
                  helperText={regErrors.phone?.message || ''}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <TextField
                  fullWidth
                  type="password"
                  placeholder="Password"
                  {...regRegister('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Lock className="text-gray-400" /></InputAdornment>) }}
                  variant="outlined"
                  required
                  disabled={loading}
                  error={!!regErrors.password}
                  helperText={regErrors.password?.message || 'Use 8+ characters with uppercase, lowercase and number'}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <TextField
                  fullWidth
                  placeholder="Address"
                  {...regRegister('address')}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><AccountCircle className="text-gray-400" /></InputAdornment>) }}
                  variant="outlined"
                  disabled={loading}
                  error={!!regErrors.address}
                  helperText={regErrors.address?.message || ''}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <TextField
                  fullWidth
                  placeholder="City"
                  {...regRegister('city')}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><AccountCircle className="text-gray-400" /></InputAdornment>) }}
                  variant="outlined"
                  disabled={loading}
                  error={!!regErrors.city}
                  helperText={regErrors.city?.message || ''}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <FormControl fullWidth variant="outlined">
                  <Controller
                    name="role"
                    control={regForm.control}
                    defaultValue="customer"
                    render={({ field }) => (
                      <Select
                        {...field}
                        displayEmpty
                        required
                        disabled={loading}
                        sx={{ backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } }}
                      >
                        <MenuItem value="" disabled>Select Account Type</MenuItem>
                        <MenuItem value="customer">Customer</MenuItem>
                        <MenuItem value="farmer">Farmer</MenuItem>
                        <MenuItem value="business">Business</MenuItem>
                        <MenuItem value="travel_agency">Travel Agency</MenuItem>
                        <MenuItem value="restaurant">Restaurant</MenuItem>
                        <MenuItem value="delivery_large">Delivery Large</MenuItem>
                        <MenuItem value="delivery_small">Delivery Small</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>

                {regWatch('role') === 'farmer' && (
                  <>
                    <TextField fullWidth placeholder="Farm Name" {...regRegister('farmName')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth type="number" placeholder="Total Land (acres)" {...regRegister('totalLand')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth type="number" placeholder="Experience (years)" {...regRegister('experience')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                  </>
                )}

                {regWatch('role') === 'business' && (
                  <>
                    <TextField fullWidth placeholder="Company Name" {...regRegister('companyName')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth placeholder="Business Type" {...regRegister('businessType')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth placeholder="Owner" {...regRegister('owner')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth placeholder="GST Number" {...regRegister('gst')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                  </>
                )}

                {regWatch('role') === 'restaurant' && (
                  <TextField fullWidth placeholder="Restaurant Name" {...regRegister('companyName')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                )}

                {regWatch('role') === 'travel_agency' && (
                  <TextField fullWidth placeholder="Agency Name" {...regRegister('agencyName')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                )}

                {(regWatch('role') === 'delivery_large' || regWatch('role') === 'delivery_small') && (
                  <>
                    <TextField fullWidth placeholder="Company Name" {...regRegister('companyName')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth placeholder="License Number" {...regRegister('licenseNumber')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                    <TextField fullWidth placeholder="Account Type" {...regRegister('accountType')} variant="outlined" disabled={loading} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }} />
                  </>
                )}

                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ backgroundColor: '#22c55e', borderRadius: '8px', padding: '12px', fontSize: '16px', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#16a34a' } }}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </div>
          )}

          {/* Reset Form */}
          {activeTab === 'Reset' && (
            <div>
              <div className="mb-6">
                <Typography variant="h4" className="font-bold text-gray-800 mb-2">
                  Forgot Password
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Enter your email and we will send a reset link
                </Typography>
              </div>

              <form onSubmit={submitReset} className="space-y-4 mb-6">
                <TextField
                  fullWidth
                  type="email"
                  placeholder="Email Address"
                  {...resetRegister('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Email className="text-gray-400" /></InputAdornment>) }}
                  variant="outlined"
                  required
                  disabled={loading}
                  error={!!resetErrors.email}
                  helperText={resetErrors.email?.message || ''}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f5f5f5', borderRadius: '8px', '& fieldset': { border: 'none' } } }}
                />

                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ backgroundColor: '#22c55e', borderRadius: '8px', padding: '12px', fontSize: '16px', fontWeight: 600, textTransform: 'none', marginBottom: '24px', '&:hover': { backgroundColor: '#16a34a' } }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

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

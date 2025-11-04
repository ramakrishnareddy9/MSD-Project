import React, { useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaEnvelope,
  FaLock,
  FaGoogle,
  FaFacebookF,
  FaTwitter,
  FaUser,
  FaPhone,
  FaIdCard,
  FaLeaf,
  FaArrowRight,
  FaCheckCircle
} from "react-icons/fa";

export default function SignUpPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await login(loginForm.email, loginForm.password);
      
      if (!res.success) {
        setError(res.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }
      
      const role = res.role;
      const from = location.state?.from?.pathname || `/dashboard/${role}`;
      navigate(from, { replace: true });
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case "login":
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
              <p className="text-gray-600">Login to access your FarmKart account</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                  required
                  disabled={loading}
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'} <FaArrowRight />
              </button>
            </form>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FaCheckCircle className="text-blue-600" /> Demo Credentials:
              </p>
              <div className="text-xs text-blue-800 space-y-1">
                <p>👤 <strong>Customer:</strong> customer@farmkart.com/customer123</p>
                <p>🌾 <strong>Farmer:</strong> farmer1@farmkart.com/farmer123</p>
                <p>🚚 <strong>Delivery:</strong> delivery@farmkart.com/delivery123</p>
                <p>🍽️ <strong>Restaurant:</strong> restaurant@farmkart.com/restaurant123</p>
                <p>💼 <strong>Business:</strong> business@farmkart.com/business123</p>
                <p>⚙️ <strong>Admin:</strong> admin@farmkart.com/admin123</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                <FaGoogle className="text-red-500" />
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                <FaFacebookF className="text-blue-600" />
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                <FaTwitter className="text-blue-400" />
              </button>
            </div>
          </div>
        );

      case "register":
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
              <p className="text-gray-600">Join FarmKart community today</p>
            </div>
            
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                    required
                  />
                </div>
                
                <div className="relative col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                    required
                  />
                </div>
                
                <div className="relative col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaPhone className="text-gray-400" />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="Mobile Number" 
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                    required
                  />
                </div>
                
                <div className="relative col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaIdCard className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Aadhar Number" 
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                    required
                  />
                </div>
                
                <div className="relative col-span-2">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                    required
                  />
                </div>
                
                <div className="relative col-span-2">
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none appearance-none bg-white"
                    required
                  >
                    <option value="">Select User Type</option>
                    <option value="Customer">🛒 Customer</option>
                    <option value="Farmer">🌾 Farmer</option>
                    <option value="Transporter">🚚 Transporter</option>
                    <option value="Community">👥 Community</option>
                    <option value="Business">💼 Business</option>
                  </select>
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Create Account <FaArrowRight />
              </button>
            </form>
            
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button 
                onClick={() => setActiveTab('login')} 
                className="text-green-600 font-semibold hover:text-green-700 hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        );

      case "forget":
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
              <p className="text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            
            <form className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 outline-none"
                  required
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Send Reset Link <FaArrowRight />
              </button>
            </form>
            
            <div className="text-center">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("login");
                }}
                className="text-green-600 font-semibold hover:text-green-700 hover:underline inline-flex items-center gap-2"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm bg-white/95">
        <div className="grid md:grid-cols-5">
          {/* Left Side - Image/Branding */}
          <div className="hidden md:block md:col-span-2 bg-gradient-to-br from-green-600 to-green-800 p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
            </div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <FaLeaf className="text-5xl text-white" />
                  <h1 className="text-4xl font-bold text-white">FarmKart</h1>
                </div>
                <p className="text-green-100 text-lg leading-relaxed">
                  Connecting farmers directly with consumers. Fresh produce, fair prices, sustainable farming.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="text-green-300 text-xl mt-1" />
                  <div>
                    <h3 className="text-white font-semibold">Direct from Farmers</h3>
                    <p className="text-green-100 text-sm">No middlemen, better prices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="text-green-300 text-xl mt-1" />
                  <div>
                    <h3 className="text-white font-semibold">Fresh & Organic</h3>
                    <p className="text-green-100 text-sm">Quality assured produce</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="text-green-300 text-xl mt-1" />
                  <div>
                    <h3 className="text-white font-semibold">Fast Delivery</h3>
                    <p className="text-green-100 text-sm">Within 24 hours of harvest</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Form */}
          <div className="md:col-span-3 p-8 md:p-12">
            {/* Tabs */}
            <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg">
              <button
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === "login"
                    ? "bg-white text-green-600 shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("login")}
              >
                Login
              </button>
              <button
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === "register"
                    ? "bg-white text-green-600 shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("register")}
              >
                Register
              </button>
              <button
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === "forget"
                    ? "bg-white text-green-600 shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("forget")}
              >
                Reset
              </button>
            </div>
            
            {/* Form Content */}
            <div>{renderForm()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
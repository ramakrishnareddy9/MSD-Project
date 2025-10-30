import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  ShoppingBagIcon,
  UsersIcon,
  TruckIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  HeartIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import clsx from 'clsx';

const ModernNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(3); // Mock notification count
  
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const cartCount = getItemCount();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Shop', path: '/shop', icon: ShoppingBagIcon },
    { name: 'Farmers', path: '/farmers', icon: UsersIcon },
    { name: 'About', path: '/about', icon: ClipboardDocumentListIcon },
  ];

  const profileMenuItems = [
    { name: 'Dashboard', icon: HomeIcon, action: () => navigate(getDashboardPath()) },
    { name: 'My Orders', icon: ShoppingBagIcon, action: () => navigate('/orders') },
    { name: 'Wishlist', icon: HeartIcon, action: () => navigate('/wishlist') },
    { name: 'Settings', icon: Cog6ToothIcon, action: () => navigate('/settings') },
    { name: 'Logout', icon: ArrowRightOnRectangleIcon, action: handleLogout },
  ];

  function getDashboardPath() {
    if (!user) return '/';
    const roleMap = {
      customer: '/customer',
      farmer: '/farmer',
      business: '/business',
      restaurant: '/restaurant',
      delivery: '/delivery-large',
      delivery_large: '/delivery-large',
      delivery_small: '/delivery-small',
      admin: '/admin',
    };
    return roleMap[user.roles?.[0]] || roleMap[user.role] || '/';
  }

  function handleLogout() {
    logout();
    navigate('/');
    setIsProfileOpen(false);
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <>
      <nav 
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg' 
            : 'bg-white shadow-md'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 group"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md"
              >
                <span className="text-white font-bold text-xl">F</span>
              </motion.div>
              <span className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                FarmKart
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {/* Nav Links */}
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2',
                      location.pathname === link.path
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                ))}
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </form>

              {/* Right Side Icons */}
              <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  {notifications > 0 ? (
                    <BellIconSolid className="w-6 h-6 text-gray-700" />
                  ) : (
                    <BellIcon className="w-6 h-6 text-gray-700" />
                  )}
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>

                {/* Cart */}
                <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ShoppingCartIcon className="w-6 h-6 text-gray-700" />
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                {user ? (
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <ChevronDownIcon 
                        className={clsx(
                          'w-4 h-4 text-gray-600 transition-transform duration-200',
                          isProfileOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {isProfileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 border border-gray-100"
                        >
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">{user.name || 'User'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              {user.roles?.[0] || user.role}
                            </span>
                          </div>
                          {profileMenuItems.map((item, index) => (
                            <button
                              key={index}
                              onClick={item.action}
                              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                            >
                              <item.icon className="w-5 h-5 text-gray-400" />
                              <span className="text-sm text-gray-700">{item.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6 text-gray-700" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-white border-t border-gray-200"
            >
              <div className="px-4 py-4 space-y-3">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </form>

                {/* Mobile Nav Links */}
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      'block px-4 py-3 rounded-lg font-medium transition-colors',
                      location.pathname === link.path
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="w-5 h-5" />
                      {link.name}
                    </div>
                  </Link>
                ))}

                {/* Mobile User Section */}
                {user ? (
                  <>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900">{user.name || 'User'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 px-4 py-3 text-center border border-gray-300 rounded-lg font-medium text-gray-700"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 px-4 py-3 text-center bg-green-600 text-white rounded-lg font-medium"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
};

export default ModernNavbar;

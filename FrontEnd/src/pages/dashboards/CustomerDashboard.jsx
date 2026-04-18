import { useEffect, useState, useRef } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, CardMedia, CardActions,
  Typography, Button, IconButton, Chip, TextField, MenuItem,
  Badge, Avatar, Divider, Paper, InputAdornment, AppBar, Toolbar,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Stack, Rating, Snackbar, Alert, Breadcrumbs, Link, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Favorite, FavoriteBorder, Person,
  Add, Remove, Delete, LocalShipping, Menu as MenuIcon, Store,
  AccountCircle, LocalOffer, Verified, Close, Notifications,
  CheckCircle, ArrowForward, Search, TrendingUp, Home, Groups, PersonAdd, Send,
  ThumbUp, ThumbDown, AdminPanelSettings, CardGiftcard,
  Chat, Inventory, Assignment, Agriculture, LocalGroceryStore, Refresh,
  BarChart as BarChartIcon, PieChart as PieChartIcon
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { authAPI, productAPI, cartAPI, wishlistAPI, orderAPI, analyticsAPI } from '../../services/api';

// ─── LocalStorage Keys ─────────────────────────────────────────────────────────
const LS_CART_KEY = 'farmkart_customer_cart';
const LS_WISHLIST_KEY = 'farmkart_customer_wishlist';
const LS_COMMUNITY_POOL_KEY = 'farmkart_community_pool';
const LS_COMMUNITY_CHAT_KEY = 'farmkart_community_chat';
const LS_MY_CONTRIBUTIONS_KEY = 'farmkart_my_contributions';
const LS_BULK_ORDERS_KEY = 'farmkart_bulk_orders';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const chatEndRef = useRef(null);

  // ─── API-driven Core State ──────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ─── UI State ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedCommunityForCheckout, setSelectedCommunityForCheckout] = useState('');

  // ─── Analytics State (for charts) ───────────────────────────────────────────
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [communityContributions, setCommunityContributions] = useState([]);

  // ─── Community State (Keeping for now) ───────────────────────────────────────
  const [myCommunities, setMyCommunities] = useState([]);
  const [availableCommunities, setAvailableCommunities] = useState([]);
  const [createCommunityForm, setCreateCommunityForm] = useState({ name: '', description: '' });
  const [communityPool, setCommunityPool] = useState({});
  const [bulkOrders, setBulkOrders] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [chatMessages, setChatMessages] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [selectedChatCommunity, setSelectedChatCommunity] = useState('');
  const [farmerDialog, setFarmerDialog] = useState({ open: false, communityId: null, productId: null });
  const [selectedFarmer, setSelectedFarmer] = useState('');

  // ─── Initialize: Fetch all customer data on mount ────────────────────────────
  useEffect(() => {
    const initializeCustomerData = async () => {
      try {
        setLoading(true);

        // Get current user profile
        const userRes = await authAPI.getCurrentUser();
        if (userRes.success) {
          // Get all available products (products to browse/buy)
          const productsRes = await productAPI.getAll({ status: 'active', limit: 50 });
          if (productsRes.success && productsRes.data?.products) {
            const mappedProducts = productsRes.data.products.map(p => ({
              id: p._id || p.id,
              name: p.name,
              price: p.basePrice || 0,
              unit: p.unit || '1kg',
              category: p.categoryId?.name || 'General',
              farmer: p.ownerId?.name || 'Farm',
              rating: p.avgRating || 4.5,
              reviews: p.reviewCount || 0,
              image: p.image || 'https://images.unsplash.com/photo-1488459716781-6f03ee1b563b?w=800&h=600&fit=crop&q=80',
              inStock: p.stockQuantity > 0,
              discount: 0,
              description: p.description || 'Premium quality product',
              minBulkQty: 20
            }));
            setProducts(mappedProducts);
          }

          // Get customer's cart
          const cartRes = await cartAPI.getCart();
          if (cartRes.success && cartRes.data?.items) {
            const enrichedCart = cartRes.data.items.map(item => ({
              id: item.productId?._id || item.productId,
              name: item.productId?.name || 'Product',
              price: item.productId?.basePrice || 0,
              quantity: item.quantity || 1,
              image: item.productId?.image || 'https://images.unsplash.com/photo-1488459716781-6f03ee1b563b?w=800&h=600&fit=crop&q=80'
            }));
            setCart(enrichedCart);
          }

          // Get customer's wishlist
          const wishlistRes = await wishlistAPI.getWishlist();
          if (wishlistRes.success && wishlistRes.data?.products) {
            const enrichedWishlist = wishlistRes.data.products.map(p => ({
              id: p._id || p.id,
              name: p.name,
              price: p.basePrice || 0,
              farmer: p.ownerId?.name || 'Farm',
              rating: p.avgRating || 4.5,
              reviews: p.reviewCount || 0,
              image: p.image || 'https://images.unsplash.com/photo-1488459716781-6f03ee1b563b?w=800&h=600&fit=crop&q=80'
            }));
            setWishlist(enrichedWishlist);
          }

          // Get customer's orders
          const ordersRes = await orderAPI.getAll({ buyerId: userRes.data._id });
          if (ordersRes.success && ordersRes.data?.orders) {
            const mappedOrders = ordersRes.data.orders.map((o, idx) => ({
              id: idx + 1,
              product: o.orderItems?.[0]?.productName || 'Product',
              seller: o.sellerId?.name || 'Seller',
              quantity: `${o.orderItems?.[0]?.quantity || 0} ${o.orderItems?.[0]?.unit || 'units'}`,
              amount: o.total || 0,
              status: o.status || 'pending',
              date: new Date(o.createdAt).toLocaleDateString(),
              category: o.orderItems?.[0]?.category || 'General'
            }));
            setMyOrders(mappedOrders);

            // Calculate analytics
            calculateAnalytics(mappedOrders);
          }
        }
      } catch (error) {
        console.error('Error initializing customer data:', error);
        // Fallback: show message
      } finally {
        setLoading(false);
      }
    };

    initializeCustomerData();
  }, []);

  // ─── Category list (derived from fetched products) ──────────────────────────
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // ─── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    const savedCart = localStorage.getItem(LS_CART_KEY);
    const savedWishlist = localStorage.getItem(LS_WISHLIST_KEY);
    const savedPool = localStorage.getItem(LS_COMMUNITY_POOL_KEY);
    const savedChat = localStorage.getItem(LS_COMMUNITY_CHAT_KEY);
    const savedContributions = localStorage.getItem(LS_MY_CONTRIBUTIONS_KEY);
    const savedBulkOrders = localStorage.getItem(LS_BULK_ORDERS_KEY);

    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      setCart(parsed);
    }
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    if (savedPool) setCommunityPool(JSON.parse(savedPool));
    if (savedChat) setChatMessages(JSON.parse(savedChat));
    if (savedContributions) setMyContributions(JSON.parse(savedContributions));
    if (savedBulkOrders) setBulkOrders(JSON.parse(savedBulkOrders));
  }, []);

  // ─── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(LS_CART_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem(LS_COMMUNITY_POOL_KEY, JSON.stringify(communityPool)); }, [communityPool]);
  useEffect(() => { localStorage.setItem(LS_COMMUNITY_CHAT_KEY, JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem(LS_MY_CONTRIBUTIONS_KEY, JSON.stringify(myContributions)); }, [myContributions]);
  useEffect(() => { localStorage.setItem(LS_BULK_ORDERS_KEY, JSON.stringify(bulkOrders)); }, [bulkOrders]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedChatCommunity]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const userName = user?.name || 'You';

  // ─── Cart Functions ─────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      const discountedPrice = product.discount 
        ? product.price - (product.price * product.discount / 100)
        : product.price;
      
      if (existing) {
        showSnackbar(`Increased quantity of ${product.name}`, 'info');
        return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      }
      showSnackbar(`${product.name} added to cart!`, 'success');
      return [...prev, { ...product, finalPrice: discountedPrice, qty: 1 }];
    });
  };

  const updateCartQuantity = (id, newQty) => {
    if (newQty <= 0) { removeFromCart(id); return; }
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p)));
  };

  const removeFromCart = (id) => {
    const item = cart.find(p => p.id === id);
    setCart((prev) => prev.filter((p) => p.id !== id));
    showSnackbar(`${item?.name} removed from cart`, 'info');
  };

  // ─── Submit Cart to Community Pool (replaces direct checkout) ───────────────
  const handleSubmitToCommunity = () => {
    if (cart.length === 0) return;
    if (!selectedCommunityForCheckout) {
      showSnackbar('Please select a community to submit your order to', 'error');
      return;
    }
    
    const communityId = parseInt(selectedCommunityForCheckout);
    const community = myCommunities.find(c => c.id === communityId);
    if (!community) return;

    const newPool = { ...communityPool };
    if (!newPool[communityId]) newPool[communityId] = {};

    const newContributions = [];

    cart.forEach(item => {
      const productId = item.id;
      const product = products.find(p => p.id === productId) || item;
      const amount = (item.finalPrice || item.price) * item.qty;
      
      if (!newPool[communityId][productId]) {
        newPool[communityId][productId] = {
          product: product,
          totalQty: 0,
          minBulkQty: product.minOrderQuantity || 50,
          contributions: [],
          status: 'collecting',
          assignedFarmer: ''
        };
      }

      newPool[communityId][productId].totalQty += item.qty;
      newPool[communityId][productId].contributions.push({
        member: userName,
        qty: item.qty,
        date: new Date().toISOString().split('T')[0],
        amount: amount
      });

      // Check if we reached minimum bulk
      if (newPool[communityId][productId].totalQty >= newPool[communityId][productId].minBulkQty) {
        newPool[communityId][productId].status = 'ready';
      }

      newContributions.push({
        id: Date.now() + Math.random(),
        communityId: communityId,
        communityName: community.name,
        productName: item.name,
        qty: item.qty,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        poolStatus: newPool[communityId][productId].status
      });
    });

    setCommunityPool(newPool);
    setMyContributions(prev => [...prev, ...newContributions]);
    setCart([]);
    setSelectedCommunityForCheckout('');
    showSnackbar(`Order submitted to ${community.name}! Payment of ₹${total.toFixed(0)} added to community fund.`, 'success');
    setActiveSection('community-orders');
  };

  // ─── Wishlist ───────────────────────────────────────────────────────────────
  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        showSnackbar(`${product.name} removed from wishlist`, 'info');
        return prev.filter((p) => p.id !== product.id);
      }
      showSnackbar(`${product.name} added to wishlist!`, 'success');
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => wishlist.some((p) => p.id === productId);

  // ─── Product Filtering ─────────────────────────────────────────────────────
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ─── Cart Calculations ─────────────────────────────────────────────────────
  const total = cart.reduce((sum, p) => sum + (p.finalPrice || p.price) * p.qty, 0);
  const totalItems = cart.reduce((sum, p) => sum + p.qty, 0);
  const savings = cart.reduce((sum, p) => sum + (p.discount || 0) * p.qty * p.price / 100, 0);

  // ─── Community Functions ────────────────────────────────────────────────────
  const createCommunity = (e) => {
    e.preventDefault();
    if (!createCommunityForm.name || !createCommunityForm.description) {
      showSnackbar('Please fill all fields', 'error');
      return;
    }
    const newCommunity = {
      id: Date.now(),
      name: createCommunityForm.name,
      members: 1,
      admin: userName,
      isAdmin: true,
      discount: 15,
      joinedDate: new Date().toISOString().split('T')[0],
      description: createCommunityForm.description
    };
    setMyCommunities([...myCommunities, newCommunity]);
    setCreateCommunityForm({ name: '', description: '' });
    showSnackbar('Community created successfully! You are the admin.', 'success');
    updateUser?.({ isCommunityAdmin: true });
  };

  const joinCommunity = (community) => {
    const joined = {
      ...community,
      isAdmin: false,
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setMyCommunities([...myCommunities, joined]);
    setAvailableCommunities(availableCommunities.filter(c => c.id !== community.id));
    showSnackbar(`Joined ${community.name}! Enjoy ${community.discount}% discount on group orders.`, 'success');
  };

  // ─── Admin: Assign Farmer ──────────────────────────────────────────────────
  const assignFarmer = () => {
    if (!selectedFarmer || !farmerDialog.communityId || !farmerDialog.productId) return;
    const newPool = { ...communityPool };
    const poolItem = newPool[farmerDialog.communityId]?.[farmerDialog.productId];
    if (poolItem) {
      poolItem.assignedFarmer = selectedFarmer;
    }
    setCommunityPool(newPool);
    setFarmerDialog({ open: false, communityId: null, productId: null });
    setSelectedFarmer('');
    showSnackbar(`Farmer "${selectedFarmer}" assigned successfully!`, 'success');
  };

  // ─── Admin: Place Bulk Order to Farmer ─────────────────────────────────────
  const placeBulkOrder = (communityId, productId) => {
    const poolItem = communityPool[communityId]?.[productId];
    if (!poolItem) return;
    
    const community = myCommunities.find(c => c.id === parseInt(communityId));
    const totalAmount = poolItem.contributions.reduce((s, c) => s + c.amount, 0);

    const newOrder = {
      id: Date.now(),
      communityId: parseInt(communityId),
      communityName: community?.name || 'Unknown',
      productId: parseInt(productId),
      productName: poolItem.product.name,
      farmer: poolItem.assignedFarmer || poolItem.product.farmer,
      totalQty: poolItem.totalQty,
      amount: totalAmount,
      status: 'Ordered',
      orderedDate: new Date().toISOString().split('T')[0],
      allocations: poolItem.contributions.map(c => ({ member: c.member, qty: c.qty }))
    };

    setBulkOrders(prev => [...prev, newOrder]);

    // Update pool status
    const newPool = { ...communityPool };
    newPool[communityId][productId].status = 'ordered';
    setCommunityPool(newPool);

    showSnackbar(`Bulk order placed to farmer "${newOrder.farmer}" for ${poolItem.totalQty} ${poolItem.product.unit} of ${poolItem.product.name}!`, 'success');
  };

  // ─── Admin: Mark as Delivered & Allocate ───────────────────────────────────
  const markDelivered = (orderId) => {
    setBulkOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Delivered' } : o));
    showSnackbar('Order marked as delivered! You can now allocate to members.', 'success');
  };

  const markAllocated = (orderId) => {
    setBulkOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Allocated' } : o));
    showSnackbar('Products allocated to community members!', 'success');
  };

  // ─── Chat Functions ─────────────────────────────────────────────────────────
  const sendChatMessage = () => {
    if (!chatInput.trim() || !selectedChatCommunity) return;
    const communityId = parseInt(selectedChatCommunity);
    const newMessage = {
      id: Date.now(),
      sender: userName,
      message: chatInput.trim(),
      timestamp: new Date().toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      avatar: userName.charAt(0).toUpperCase()
    };
    setChatMessages(prev => ({
      ...prev,
      [communityId]: [...(prev[communityId] || []), newMessage]
    }));
    setChatInput('');
  };

  // ─── Get pool stats for a community ────────────────────────────────────────
  const getPoolStats = (communityId) => {
    const pool = communityPool[communityId];
    if (!pool) return { totalProducts: 0, readyCount: 0, collectingCount: 0 };
    const items = Object.values(pool);
    return {
      totalProducts: items.length,
      readyCount: items.filter(i => i.status === 'ready').length,
      collectingCount: items.filter(i => i.status === 'collecting').length,
      orderedCount: items.filter(i => i.status === 'ordered').length
    };
  };

  // Count total unread-style chat messages (simple badge)
  const totalChatMessages = Object.values(chatMessages).reduce((s, msgs) => s + msgs.length, 0);

  // ─── Calculate Analytics ────────────────────────────────────────────────────
  const calculateAnalytics = (orders) => {
    if (!orders || orders.length === 0) {
      setSpendingTrend([]);
      setCategorySpending([]);
      setOrderStatusData([]);
      return;
    }

    // Spending Trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      last7Days.push({ date: dateStr, spent: 0 });
    }

    orders.forEach(order => {
      const orderDate = new Date(order.date);
      const dayIndex = last7Days.findIndex(d => 
        d.date === orderDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      );
      if (dayIndex >= 0) {
        last7Days[dayIndex].spent += order.amount;
      }
    });
    setSpendingTrend(last7Days);

    // Category Spending
    const categoryMap = {};
    orders.forEach(order => {
      const cat = order.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + order.amount;
    });

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];
    const categoryData = Object.entries(categoryMap).map((entry, idx) => ({
      name: entry[0],
      value: Math.round(entry[1]),
      fill: COLORS[idx % COLORS.length]
    }));
    setCategorySpending(categoryData);

    // Order Status
    const statusMap = {};
    orders.forEach(order => {
      const status = order.status || 'unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    const statusColors = {
      pending: '#ff9800',
      processing: '#2196f3',
      delivered: '#4caf50',
      cancelled: '#f44336'
    };

    const statusData = Object.entries(statusMap).map((entry, idx) => ({
      name: entry[0].charAt(0).toUpperCase() + entry[0].slice(1),
      value: entry[1],
      fill: statusColors[entry[0]] || '#999'
    }));
    setOrderStatusData(statusData);
  };

  // ─── Sidebar Menu ──────────────────────────────────────────────────────────
  const menuItems = [
    { id: 'browse', label: 'Browse Products', icon: <Store /> },
    { id: 'cart', label: 'My Cart', icon: <ShoppingCart />, badge: cart.length },
    { id: 'community-orders', label: 'Community Orders', icon: <Inventory />, badge: Object.keys(communityPool).length > 0 ? '!' : 0 },
    { id: 'communities', label: 'My Communities', icon: <Groups />, badge: myCommunities.length },
    { id: 'join-community', label: 'Join Community', icon: <PersonAdd />, badge: availableCommunities.length },
    { id: 'community-chat', label: 'Community Chat', icon: <Chat />, badge: totalChatMessages > 0 ? '•' : 0 },
    { id: 'contributions', label: 'My Contributions', icon: <Assignment /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChartIcon /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Favorite />, badge: wishlist.length },
    { id: 'notifications', label: 'Notifications', icon: <Notifications />, badge: 2 },
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
  ];

  // ─── Product Card ──────────────────────────────────────────────────────────
  const ProductCard = ({ product }) => {
    const discountedPrice = product.discount 
      ? product.price - (product.price * product.discount / 100)
      : product.price;

    return (
      <Card 
        sx={{ 
          height: '100%', display: 'flex', flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img" height="220" image={product.image} alt={product.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80'; }}
            sx={{ objectFit: 'cover' }}
          />
          {product.discount > 0 && (
            <Chip label={`${product.discount}% OFF`} color="error" size="small"
              sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 'bold', boxShadow: 2 }}
            />
          )}
          <Chip icon={<Verified sx={{ fontSize: 16 }} />} label="Verified" color="success" size="small"
            sx={{ position: 'absolute', top: 12, right: 52, fontWeight: 600 }}
          />
          <IconButton
            sx={{
              position: 'absolute', top: 8, right: 8,
              bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: 'rgba(255,255,255,1)', transform: 'scale(1.1)' },
              transition: 'all 0.2s'
            }}
            onClick={() => toggleWishlist(product)}
          >
            {isInWishlist(product.id) ? <Favorite sx={{ color: 'error.main' }} /> : <FavoriteBorder />}
          </IconButton>
          {!product.inStock && (
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
              <Chip label="Out of Stock" color="error" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }} />
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {product.description}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
            <Rating value={product.rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">({product.reviews})</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.light' }}><Person sx={{ fontSize: 14 }} /></Avatar>
            <Typography variant="caption" color="text.secondary">{product.farmer}</Typography>
          </Stack>
          <Chip label={`Min Bulk: ${product.minBulkQty || 50}${product.unit}`} size="small" variant="outlined" color="info" sx={{ mt: 1 }} />
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                {product.discount > 0 ? (
                  <>
                    <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', display: 'block' }}>₹{product.price}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="baseline">
                      <Typography variant="h5" color="primary" fontWeight="bold">₹{discountedPrice.toFixed(0)}</Typography>
                      <Typography variant="caption" color="text.secondary">/{product.unit}</Typography>
                    </Stack>
                  </>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="baseline">
                    <Typography variant="h5" color="primary" fontWeight="bold">₹{product.price}</Typography>
                    <Typography variant="caption" color="text.secondary">/{product.unit}</Typography>
                  </Stack>
                )}
              </Box>
              <Button variant="contained" disabled={!product.inStock} onClick={() => addToCart(product)}
                startIcon={<ShoppingCart />}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}
              >
                Add
              </Button>
            </Stack>
          </Box>
        </CardActions>
      </Card>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ─── Mobile Drawer ─────────────────────────────────────────────────── */}
      <Drawer
        variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 280, boxSizing: 'border-box' } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Store color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">FarmKart</Typography>
          </Stack>
          <List>
            {menuItems.map((item) => (
              <ListItemButton key={item.id} selected={activeSection === item.id}
                onClick={() => { setActiveSection(item.id); setDrawerOpen(false); }}
                sx={{ borderRadius: 2, mb: 0.5,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '& .MuiListItemIcon-root': { color: 'white' } }
                }}
              >
                <ListItemIcon>
                  {item.badge ? (<Badge badgeContent={item.badge} color="error">{item.icon}</Badge>) : item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* ─── Desktop Sidebar ───────────────────────────────────────────────── */}
      <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ position: 'sticky', top: 0, p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Store color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">FarmKart</Typography>
          </Stack>
          <List>
            {menuItems.map((item) => (
              <ListItemButton key={item.id} selected={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                sx={{ borderRadius: 2, mb: 1,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '& .MuiListItemIcon-root': { color: 'white' } }
                }}
              >
                <ListItemIcon>
                  {item.badge ? (<Badge badgeContent={item.badge} color="error">{item.icon}</Badge>) : item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 3 }} />
          <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>Your Stats</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Contributions</Typography>
                <Typography variant="body2" fontWeight="bold">{myContributions.length}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Communities</Typography>
                <Chip label={myCommunities.length} size="small" color="success" />
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Breadcrumbs separator="›" sx={{ fontSize: '0.75rem' }}>
                <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Home sx={{ mr: 0.5, fontSize: 16 }} /> Home
                </Link>
                <Typography color="text.primary" sx={{ fontSize: '0.75rem' }}>
                  {menuItems.find(m => m.id === activeSection)?.label}
                </Typography>
              </Breadcrumbs>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton color="primary" onClick={() => setActiveSection('cart')}>
                <Badge badgeContent={totalItems} color="error"><ShoppingCart /></Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>

            {/* ═══ BROWSE PRODUCTS ═══════════════════════════════════════════ */}
            {activeSection === 'browse' && (
              <Box>
                {/* Info Banner */}
                <Alert severity="info" sx={{ mb: 3 }} icon={<Groups />}>
                  <strong>Community Ordering:</strong> All orders go through your community. Add items to cart, then submit to your community pool. When the community reaches minimum bulk quantity, your admin will order from farmers at discounted rates!
                </Alert>

                {/* Search & Filter */}
                <Paper sx={{ p: 3, mb: 4 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth placeholder="Search for fresh produce, grains, dairy..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (<InputAdornment position="start"><Search color="action" /></InputAdornment>),
                          endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><Close fontSize="small" /></IconButton></InputAdornment>)
                        }}
                        sx={{ bgcolor: 'background.default' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField select fullWidth value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} sx={{ bgcolor: 'background.default' }}>
                        {categories.map((cat) => (<MenuItem key={cat} value={cat}>{cat}</MenuItem>))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Chip icon={<TrendingUp />} label="Trending" clickable color="primary" variant="outlined" />
                        <Chip icon={<LocalOffer />} label="Offers" clickable color="error" variant="outlined" />
                      </Stack>
                    </Grid>
                  </Grid>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">{filteredProducts.length} products found</Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label="Free Delivery" size="small" color="success" />
                      <Chip icon={<Verified sx={{ fontSize: 16 }} />} label="Quality Assured" size="small" color="info" />
                    </Stack>
                  </Stack>
                </Paper>

                <Grid container spacing={3}>
                  {filteredProducts.map((product) => (
                    <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
                      <ProductCard product={product} />
                    </Grid>
                  ))}
                </Grid>
                {filteredProducts.length === 0 && (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>No products found</Typography>
                    <Typography variant="body2" color="text.secondary">Try adjusting your search or filter criteria</Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* ═══ SHOPPING CART → SUBMIT TO COMMUNITY ═══════════════════════ */}
            {activeSection === 'cart' && (
              <Box>
                {myCommunities.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    You need to join a community before you can place orders. <Button size="small" onClick={() => setActiveSection('join-community')}>Join Now</Button>
                  </Alert>
                )}
                {cart.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>Your cart is empty</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Add some fresh produce to get started!</Typography>
                    <Button variant="contained" size="large" onClick={() => setActiveSection('browse')} startIcon={<Store />}>Start Shopping</Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    <Grid item xs={12} lg={8}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>Shopping Cart ({totalItems} items)</Typography>
                        <Divider sx={{ my: 2 }} />
                        {cart.map((item) => (
                          <Card key={item.id} sx={{ mb: 2, bgcolor: 'background.default' }}>
                            <CardContent>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={3}>
                                  <CardMedia component="img" height="120" image={item.image} alt={item.name}
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80'; }}
                                    sx={{ borderRadius: 2, objectFit: 'cover', width: '100%' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography variant="h6" fontWeight="600">{item.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    ₹{item.finalPrice || item.price}/{item.unit}
                                    {item.discount > 0 && (<Chip label={`${item.discount}% OFF`} size="small" color="error" sx={{ ml: 1 }} />)}
                                  </Typography>
                                  <Chip label={`by ${item.farmer}`} size="small" sx={{ mt: 1 }} />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                    <IconButton size="small" onClick={() => updateCartQuantity(item.id, item.qty - 1)}
                                      sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'error.lighter' } }}
                                    ><Remove fontSize="small" /></IconButton>
                                    <Typography sx={{ minWidth: 50, textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{item.qty}</Typography>
                                    <IconButton size="small" onClick={() => updateCartQuantity(item.id, item.qty + 1)}
                                      sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'success.lighter' } }}
                                    ><Add fontSize="small" /></IconButton>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                  <Stack spacing={1} alignItems="flex-end">
                                    <Typography variant="h6" color="primary" fontWeight="bold">₹{((item.finalPrice || item.price) * item.qty).toFixed(0)}</Typography>
                                    <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}><Delete fontSize="small" /></IconButton>
                                  </Stack>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} lg={4}>
                      <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Submit to Community</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Alert severity="info" sx={{ mb: 2 }} icon={<Groups />}>
                          Your order will be added to the community pool. Payment goes to the community fund. When bulk minimum is reached, the admin orders from farmers.
                        </Alert>
                        <TextField select fullWidth label="Select Community" value={selectedCommunityForCheckout}
                          onChange={(e) => setSelectedCommunityForCheckout(e.target.value)}
                          sx={{ mb: 2 }} required
                        >
                          {myCommunities.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.name} ({c.discount}% bulk discount)</MenuItem>
                          ))}
                        </TextField>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">Subtotal ({totalItems} items)</Typography>
                            <Typography variant="body2" fontWeight="600">₹{total.toFixed(0)}</Typography>
                          </Stack>
                          {savings > 0 && (
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="success.main">Discount Savings</Typography>
                              <Typography variant="body2" color="success.main" fontWeight="600">-₹{savings.toFixed(0)}</Typography>
                            </Stack>
                          )}
                          {selectedCommunityForCheckout && (
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="info.main">Community Bulk Discount</Typography>
                              <Typography variant="body2" color="info.main" fontWeight="600">
                                Up to {myCommunities.find(c => c.id === parseInt(selectedCommunityForCheckout))?.discount || 0}% extra
                              </Typography>
                            </Stack>
                          )}
                          <Divider />
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="h6" fontWeight="bold">Total</Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold">₹{total.toFixed(0)}</Typography>
                          </Stack>
                          <Button variant="contained" size="large" fullWidth startIcon={<Groups />}
                            sx={{ mt: 2, py: 1.5 }} onClick={handleSubmitToCommunity}
                            disabled={myCommunities.length === 0}
                          >
                            Submit to Community Order
                          </Button>
                          <Button variant="outlined" fullWidth onClick={() => setActiveSection('browse')}>
                            Continue Shopping
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}

            {/* ═══ COMMUNITY ORDERS (Pool + Admin Bulk) ══════════════════════ */}
            {activeSection === 'community-orders' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>Community Order Pool</Typography>

                {myCommunities.map((community) => {
                  const pool = communityPool[community.id];
                  if (!pool || Object.keys(pool).length === 0) return null;
                  const stats = getPoolStats(community.id);

                  return (
                    <Paper key={community.id} sx={{ p: 3, mb: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">{community.name}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Chip label={`${stats.collectingCount} collecting`} size="small" color="warning" />
                            <Chip label={`${stats.readyCount} ready`} size="small" color="success" />
                            {stats.orderedCount > 0 && <Chip label={`${stats.orderedCount} ordered`} size="small" color="info" />}
                          </Stack>
                        </Box>
                        {community.isAdmin && <Chip icon={<AdminPanelSettings />} label="Admin" color="error" />}
                      </Stack>
                      <Divider sx={{ my: 2 }} />

                      {Object.entries(pool).map(([productId, poolItem]) => {
                        const progress = Math.min((poolItem.totalQty / poolItem.minBulkQty) * 100, 100);
                        const isReady = poolItem.totalQty >= poolItem.minBulkQty;

                        return (
                          <Card key={productId} sx={{ mb: 2, bgcolor: 'background.default' }}>
                            <CardContent>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={3}>
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar src={poolItem.product.image} variant="rounded" sx={{ width: 60, height: 60 }} />
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight="bold">{poolItem.product.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">{poolItem.product.farmer}</Typography>
                                    </Box>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    {poolItem.totalQty} / {poolItem.minBulkQty} {poolItem.product.unit} collected
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate" value={progress}
                                    color={isReady ? 'success' : 'warning'}
                                    sx={{ height: 10, borderRadius: 5 }}
                                  />
                                  <Typography variant="caption" color={isReady ? 'success.main' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }}>
                                    {isReady ? '✅ Minimum bulk reached!' : `${(poolItem.minBulkQty - poolItem.totalQty).toFixed(0)} more needed`}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <Chip
                                    label={poolItem.status === 'collecting' ? 'Collecting' : poolItem.status === 'ready' ? 'Ready' : poolItem.status === 'ordered' ? 'Ordered' : poolItem.status}
                                    color={poolItem.status === 'collecting' ? 'warning' : poolItem.status === 'ready' ? 'success' : 'info'}
                                    size="small"
                                  />
                                  {poolItem.assignedFarmer && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                      🧑‍🌾 {poolItem.assignedFarmer}
                                    </Typography>
                                  )}
                                </Grid>
                                <Grid item xs={12} md={3}>
                                  {community.isAdmin && (
                                    <Stack spacing={1}>
                                      {poolItem.status !== 'ordered' && (
                                        <Button size="small" variant="outlined" startIcon={<Agriculture />}
                                          onClick={() => { setFarmerDialog({ open: true, communityId: community.id, productId: parseInt(productId) }); }}
                                        >
                                          {poolItem.assignedFarmer ? 'Change Farmer' : 'Assign Farmer'}
                                        </Button>
                                      )}
                                      {isReady && poolItem.status !== 'ordered' && (
                                        <Button size="small" variant="contained" color="success" startIcon={<LocalGroceryStore />}
                                          onClick={() => placeBulkOrder(community.id, productId)}
                                        >
                                          Place Bulk Order
                                        </Button>
                                      )}
                                    </Stack>
                                  )}
                                </Grid>
                              </Grid>
                              {/* Contribution breakdown */}
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="caption" fontWeight="bold" color="text.secondary">Member Contributions:</Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                                {poolItem.contributions.map((c, idx) => (
                                  <Chip key={idx} avatar={<Avatar>{c.member.charAt(0)}</Avatar>}
                                    label={`${c.member}: ${c.qty} ${poolItem.product.unit} (₹${c.amount.toFixed(0)})`}
                                    size="small" variant="outlined"
                                  />
                                ))}
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Paper>
                  );
                })}

                {Object.keys(communityPool).length === 0 && (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Inventory sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>No community orders yet</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Start by adding products to your cart and submitting to your community.</Typography>
                    <Button variant="contained" size="large" onClick={() => setActiveSection('browse')} startIcon={<Store />}>Browse Products</Button>
                  </Paper>
                )}

                {/* Admin Bulk Orders Placed */}
                {bulkOrders.length > 0 && (
                  <Paper sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      <LocalShipping sx={{ verticalAlign: 'middle', mr: 1 }} /> Bulk Orders Placed by Admin
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Community</TableCell>
                            <TableCell>Farmer</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bulkOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell><Typography fontWeight="600">{order.productName}</Typography></TableCell>
                              <TableCell>{order.communityName}</TableCell>
                              <TableCell><Chip avatar={<Avatar><Agriculture /></Avatar>} label={order.farmer} size="small" /></TableCell>
                              <TableCell>{order.totalQty}</TableCell>
                              <TableCell><Typography fontWeight="bold" color="success.main">₹{order.amount.toFixed(0)}</Typography></TableCell>
                              <TableCell>
                                <Chip label={order.status} size="small"
                                  color={order.status === 'Ordered' ? 'info' : order.status === 'Delivered' ? 'success' : order.status === 'Allocated' ? 'primary' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1}>
                                  {order.status === 'Ordered' && myCommunities.find(c => c.id === order.communityId)?.isAdmin && (
                                    <Button size="small" variant="outlined" color="success" onClick={() => markDelivered(order.id)}>
                                      Mark Delivered
                                    </Button>
                                  )}
                                  {order.status === 'Delivered' && myCommunities.find(c => c.id === order.communityId)?.isAdmin && (
                                    <Button size="small" variant="contained" onClick={() => markAllocated(order.id)}>
                                      Allocate to Members
                                    </Button>
                                  )}
                                  {order.status === 'Allocated' && (
                                    <Typography variant="caption" color="success.main">✅ Distributed</Typography>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Allocation Details */}
                    {bulkOrders.filter(o => o.allocations && o.allocations.length > 0).length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Member Allocations:</Typography>
                        {bulkOrders.map((order) => (
                          <Box key={order.id} sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">{order.productName} — {order.communityName}:</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                              {order.allocations.map((a, idx) => (
                                <Chip key={idx} avatar={<Avatar>{a.member.charAt(0)}</Avatar>} label={`${a.member}: ${a.qty} units`} size="small" variant="outlined"
                                  color={order.status === 'Allocated' ? 'success' : 'default'}
                                />
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>
                )}
              </Box>
            )}

            {/* ═══ MY COMMUNITIES ════════════════════════════════════════════ */}
            {activeSection === 'communities' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>My Communities</Typography>
                {/* Create Community */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.lighter' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    <Groups sx={{ verticalAlign: 'middle', mr: 1 }} /> Create New Community
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box component="form" onSubmit={createCommunity}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Community Name" value={createCommunityForm.name}
                          onChange={(e) => setCreateCommunityForm({ ...createCommunityForm, name: e.target.value })} required />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Description" value={createCommunityForm.description}
                          onChange={(e) => setCreateCommunityForm({ ...createCommunityForm, description: e.target.value })} required />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button type="submit" variant="contained" fullWidth sx={{ height: 56 }}>Create</Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                {/* Community List */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {myCommunities.map((community) => {
                    const stats = getPoolStats(community.id);
                    return (
                      <Grid item xs={12} md={6} key={community.id}>
                        <Card sx={{ height: '100%' }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Typography variant="h6" fontWeight="bold">{community.name}</Typography>
                                  {community.isAdmin && (
                                    <Chip icon={<AdminPanelSettings />} label="Admin" color="error" size="small" sx={{ mt: 1 }} />
                                  )}
                                </Box>
                                <Chip icon={<CardGiftcard />} label={`${community.discount}% OFF`} color="success" />
                              </Stack>
                              <Divider />
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Members</Typography>
                                  <Typography variant="body2" fontWeight="bold">{community.members}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Admin</Typography>
                                  <Typography variant="body2" fontWeight="600">{community.admin}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.secondary">Joined</Typography>
                                  <Typography variant="body2">{community.joinedDate}</Typography>
                                </Stack>
                                {stats.totalProducts > 0 && (
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Active Pool Items</Typography>
                                    <Chip label={stats.totalProducts} size="small" color="info" />
                                  </Stack>
                                )}
                              </Stack>
                              <Button variant="outlined" fullWidth startIcon={<Chat />}
                                onClick={() => { setSelectedChatCommunity(String(community.id)); setActiveSection('community-chat'); }}
                              >
                                Open Chat
                              </Button>
                              <Button variant="contained" fullWidth startIcon={<Inventory />}
                                onClick={() => setActiveSection('community-orders')}
                              >
                                View Community Orders
                              </Button>
                              {community.isAdmin && (
                                <Button variant="contained" color="success" fullWidth onClick={() => navigate('/dashboard/community')}>
                                  Open Community Dashboard
                                </Button>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {/* ═══ JOIN COMMUNITY ════════════════════════════════════════════ */}
            {activeSection === 'join-community' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>Join a Community</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Join a community to start placing orders! All orders go through communities for bulk pricing benefits.
                </Alert>
                <Grid container spacing={3}>
                  {availableCommunities.map((community) => (
                    <Grid item xs={12} md={6} lg={4} key={community.id}>
                      <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 } }}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                              <Typography variant="h6" fontWeight="bold">{community.name}</Typography>
                              <Chip icon={<CardGiftcard />} label={`${community.discount}% OFF`} color="success" />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{community.description}</Typography>
                            <Divider />
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Members</Typography>
                                <Chip label={community.members} size="small" color="primary" />
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Admin</Typography>
                                <Typography variant="body2" fontWeight="600">{community.admin}</Typography>
                              </Stack>
                            </Stack>
                            <Button variant="contained" fullWidth startIcon={<PersonAdd />} onClick={() => joinCommunity(community)}>
                              Join Community
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {availableCommunities.length === 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 6, textAlign: 'center' }}>
                        <Groups sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">No communities available to join</Typography>
                        <Typography variant="body2" color="text.secondary">You've already joined all available communities!</Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* ═══ COMMUNITY CHAT ════════════════════════════════════════════ */}
            {activeSection === 'community-chat' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  <Chat sx={{ verticalAlign: 'middle', mr: 1 }} /> Community Chat
                </Typography>
                <Grid container spacing={3}>
                  {/* Community Selector */}
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Your Communities</Typography>
                      <Divider sx={{ my: 1 }} />
                      <List dense>
                        {myCommunities.map((c) => (
                          <ListItemButton key={c.id} selected={selectedChatCommunity === String(c.id)}
                            onClick={() => setSelectedChatCommunity(String(c.id))}
                            sx={{ borderRadius: 2, mb: 0.5,
                              '&.Mui-selected': { bgcolor: 'primary.lighter', borderLeft: 3, borderColor: 'primary.main' }
                            }}
                          >
                            <ListItemIcon>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{c.name.charAt(0)}</Avatar>
                            </ListItemIcon>
                            <ListItemText primary={c.name}
                              secondary={`${(chatMessages[c.id] || []).length} messages`}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                            />
                            {(chatMessages[c.id] || []).length > 0 && (
                              <Chip label={(chatMessages[c.id] || []).length} size="small" color="primary" />
                            )}
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  </Grid>

                  {/* Chat Window */}
                  <Grid item xs={12} md={9}>
                    {selectedChatCommunity ? (
                      <Paper sx={{ p: 0, display: 'flex', flexDirection: 'column', height: 600 }}>
                        {/* Chat Header */}
                        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: '4px 4px 0 0' }}>
                          <Typography variant="h6" fontWeight="bold">
                            {myCommunities.find(c => c.id === parseInt(selectedChatCommunity))?.name || 'Chat'}
                          </Typography>
                          <Typography variant="caption">
                            {myCommunities.find(c => c.id === parseInt(selectedChatCommunity))?.members || 0} members
                          </Typography>
                        </Box>

                        {/* Messages */}
                        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
                          {(chatMessages[selectedChatCommunity] || []).map((msg) => {
                            const isMe = msg.sender === userName;
                            return (
                              <Stack key={msg.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'} sx={{ mb: 2 }}>
                                {!isMe && (
                                  <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'info.main', fontSize: 14 }}>{msg.avatar}</Avatar>
                                )}
                                <Box sx={{
                                  maxWidth: '70%', p: 1.5, borderRadius: 2,
                                  bgcolor: isMe ? 'primary.main' : 'background.paper',
                                  color: isMe ? 'white' : 'text.primary',
                                  boxShadow: 1
                                }}>
                                  {!isMe && (
                                    <Typography variant="caption" fontWeight="bold" color={isMe ? 'rgba(255,255,255,0.8)' : 'primary.main'}>
                                      {msg.sender}
                                    </Typography>
                                  )}
                                  <Typography variant="body2">{msg.message}</Typography>
                                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.7, textAlign: 'right' }}>
                                    {msg.timestamp}
                                  </Typography>
                                </Box>
                                {isMe && (
                                  <Avatar sx={{ width: 32, height: 32, ml: 1, bgcolor: 'primary.dark', fontSize: 14 }}>
                                    {userName.charAt(0).toUpperCase()}
                                  </Avatar>
                                )}
                              </Stack>
                            );
                          })}
                          <div ref={chatEndRef} />
                        </Box>

                        {/* Message Input */}
                        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Stack direction="row" spacing={1}>
                            <TextField fullWidth size="small" placeholder="Type a message..."
                              value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                            />
                            <Button variant="contained" onClick={sendChatMessage} disabled={!chatInput.trim()}>
                              <Send />
                            </Button>
                          </Stack>
                        </Box>
                      </Paper>
                    ) : (
                      <Paper sx={{ p: 8, textAlign: 'center' }}>
                        <Chat sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>Select a community to start chatting</Typography>
                        <Typography variant="body2" color="text.secondary">Choose a community from the left panel</Typography>
                      </Paper>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ═══ MY CONTRIBUTIONS ══════════════════════════════════════════ */}
            {activeSection === 'contributions' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>My Contributions</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Track what you've contributed to community orders. Once the community admin places the bulk order and it's delivered, your share will be allocated to you.
                </Alert>
                {myContributions.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Assignment sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>No contributions yet</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Submit your cart to a community to start contributing!</Typography>
                    <Button variant="contained" size="large" onClick={() => setActiveSection('browse')} startIcon={<Store />}>Browse Products</Button>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 3 }}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Community</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Amount Paid</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Pool Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {myContributions.map((contrib) => (
                            <TableRow key={contrib.id}>
                              <TableCell><Typography fontWeight="600">{contrib.productName}</Typography></TableCell>
                              <TableCell>{contrib.communityName}</TableCell>
                              <TableCell>{contrib.qty}</TableCell>
                              <TableCell><Typography fontWeight="bold" color="primary">₹{contrib.amount.toFixed(0)}</Typography></TableCell>
                              <TableCell>{contrib.date}</TableCell>
                              <TableCell>
                                <Chip label={contrib.poolStatus || 'collecting'} size="small"
                                  color={contrib.poolStatus === 'collecting' ? 'warning' : contrib.poolStatus === 'ready' ? 'success' : 'info'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}
              </Box>
            )}

            {/* ═══ WISHLIST ══════════════════════════════════════════════════ */}
            {activeSection === 'wishlist' && (
              <Box>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">My Wishlist ({wishlist.length} items)</Typography>
                </Paper>
                {wishlist.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Favorite sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>Your wishlist is empty</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Save your favorite products for later!</Typography>
                    <Button variant="contained" size="large" onClick={() => setActiveSection('browse')}>Browse Products</Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {wishlist.map((product) => (
                      <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
                        <ProductCard product={product} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* ═══ NOTIFICATIONS ═════════════════════════════════════════════ */}
            {activeSection === 'notifications' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>Notifications</Typography>
                <Paper sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {[
                      { id: 1, title: 'Community Pool Update', message: 'Organic Wheat has reached 70% of bulk minimum in Green Valley Residents', time: '20 min ago', type: 'info', read: false },
                      { id: 2, title: 'Bulk Order Placed', message: 'Your community admin has placed a bulk order for Fresh Tomatoes', time: '2 hours ago', type: 'success', read: false },
                      { id: 3, title: 'New Community Member', message: 'Diana Prince joined Green Valley Residents', time: '5 hours ago', type: 'info', read: true },
                      { id: 4, title: 'Product Allocated', message: 'Your share of Basmati Rice (10kg) is ready for pickup', time: '1 day ago', type: 'success', read: true },
                    ].map((n) => (
                      <Card key={n.id} sx={{ bgcolor: n.read ? 'background.paper' : 'action.hover' }}>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Avatar sx={{ bgcolor: n.type === 'success' ? 'success.main' : 'info.main', width: 40, height: 40 }}>
                              {n.type === 'success' ? <CheckCircle /> : <Notifications />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Typography variant="subtitle1" fontWeight={n.read ? 'normal' : 'bold'}>{n.title}</Typography>
                                  <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                                </Box>
                                {!n.read && <Chip label="New" color="info" size="small" />}
                              </Stack>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{n.time}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Paper>
              </Box>
            )}

            {/* ═══ PROFILE ═══════════════════════════════════════════════════ */}
            {activeSection === 'profile' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '3rem' }}>
                      <Person sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>{userName}</Typography>
                    <Chip label="Community Member" color="primary" sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">Member since January 2024</Typography>
                    <Divider sx={{ my: 3 }} />
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Communities</Typography>
                        <Typography variant="body2" fontWeight="bold">{myCommunities.length}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Contributions</Typography>
                        <Typography variant="body2" fontWeight="bold">{myContributions.length}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Total Contributed</Typography>
                        <Typography variant="body2" fontWeight="bold">₹{myContributions.reduce((s, c) => s + c.amount, 0).toFixed(0)}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Personal Information</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Full Name" defaultValue={userName} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Email" type="email" defaultValue={user?.email || 'john.doe@example.com'} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Phone" defaultValue="+91 9876543210" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="City" defaultValue="Mumbai" />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth label="Delivery Address" multiline rows={3}
                          defaultValue="123 Main Street, Apartment 4B, Downtown Area, Mumbai, Maharashtra - 400001" />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                          <Button variant="contained" size="large" onClick={() => showSnackbar('Profile updated successfully!', 'success')}>Update Profile</Button>
                          <Button variant="outlined" size="large" onClick={() => showSnackbar('Change password feature coming soon', 'info')}>Change Password</Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* ═══ ANALYTICS ════════════════════════════════════════════════ */}
            {activeSection === 'analytics' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>Your Spending Analytics</Typography>

                <Grid container spacing={3}>
                  {/* Spending Trend Chart */}
                  <Grid item xs={12} lg={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          <TrendingUp sx={{ verticalAlign: 'middle', mr: 1, fontSize: 20 }} />
                          Spending Trend (Last 7 Days)
                        </Typography>
                        {spendingTrend.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={spendingTrend}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="date" stroke="#666" />
                              <YAxis stroke="#666" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#fff',
                                  border: '1px solid #ccc',
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                                formatter={(value) => `₹${value}`}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="spent"
                                stroke="#1976d2"
                                dot={{ fill: '#1976d2', r: 5 }}
                                activeDot={{ r: 7 }}
                                strokeWidth={3}
                                name="Spending"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                            No spending data yet. Start shopping!
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Category Spending Chart */}
                  <Grid item xs={12} lg={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          <PieChartIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 20 }} />
                          Spending by Category
                        </Typography>
                        {categorySpending.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={categorySpending}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ₹${value}`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {categorySpending.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `₹${value}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                            No category data yet.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Order Status Breakdown */}
                  <Grid item xs={12} lg={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Order Status Breakdown
                        </Typography>
                        {orderStatusData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={orderStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={100}
                                fill="#82ca9d"
                                dataKey="value"
                              >
                                {orderStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                            No order data yet.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Order Statistics */}
                  <Grid item xs={12} lg={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Order Summary
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Total Orders</Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary">{myOrders.length}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Total Spent</Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                              ₹{myOrders.reduce((sum, o) => sum + o.amount, 0).toFixed(0)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Average Order Value</Typography>
                            <Typography variant="h5" fontWeight="bold">
                              ₹{myOrders.length > 0 ? (myOrders.reduce((sum, o) => sum + o.amount, 0) / myOrders.length).toFixed(0) : 0}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Delivered Orders</Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                              {myOrders.filter(o => o.status === 'delivered').length}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Community Contributions</Typography>
                            <Typography variant="h5" fontWeight="bold" color="info.main">
                              {myContributions.length}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

          </Container>
        </Box>
      </Box>

      {/* ─── Farmer Assignment Dialog ──────────────────────────────────────── */}
      <Dialog open={farmerDialog.open} onClose={() => setFarmerDialog({ open: false, communityId: null, productId: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Farmer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a farmer to fulfill this bulk order. The admin will place the order on behalf of the community.
          </Typography>
          <TextField select fullWidth label="Select Farmer" value={selectedFarmer} onChange={(e) => setSelectedFarmer(e.target.value)} sx={{ mt: 1 }}>
            {products.length === 0 ? (
              <MenuItem disabled>No farmers available</MenuItem>
            ) : (
              [...new Set(products.map(p => p.farmer))].map((farmer) => (
                <MenuItem key={farmer} value={farmer}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.main', fontSize: 12 }}><Agriculture sx={{ fontSize: 14 }} /></Avatar>
                    <Typography>{farmer}</Typography>
                  </Stack>
                </MenuItem>
              ))
            )}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFarmerDialog({ open: false, communityId: null, productId: null })}>Cancel</Button>
          <Button variant="contained" onClick={assignFarmer} disabled={!selectedFarmer}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerDashboard;

import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Grid, Card, CardContent, Typography, Button,
  Avatar, Divider, Paper, AppBar, Toolbar, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, IconButton, Badge, Chip,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  CardMedia, InputAdornment, CircularProgress, Snackbar, Alert, LinearProgress
} from '@mui/material';
import {
  Restaurant, ShoppingCart, AccountCircle, Inventory,
  Notifications, Menu as MenuIcon, Home, Schedule, TrendingUp,
  LocalShipping, AttachMoney, Add, Remove, Delete, Search, Autorenew,
  Store, DeliveryDining, Refresh, DoneAll
} from '@mui/icons-material';
import ProfileDropdown from '../../Components/ProfileDropdown';
import { productAPI, orderAPI, authAPI, cartAPI, analyticsAPI, inventoryAPI, vehicleAPI, userAPI, notificationAPI, marketplaceRequestAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_PERFORMANCE = {
  onTimeDelivery: 0,
  qualityRating: 0
};

const RestaurantDashboard = () => {
  const { user, updateUser } = useAuth();

  // ── API-driven State ────────────────────────────────────────────────────────
  const [restaurantData, setRestaurantData] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ 
    activeOrders: 0, 
    monthlySpent: 0, 
    totalOrders: 0, 
    pendingDelivery: 0 
  });
  const [loading, setLoading] = useState(true);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [dailyDraft, setDailyDraft] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotalPages, setNotificationTotalPages] = useState(1);
  const [negotiations, setNegotiations] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    address: ''
  });

  // ── Initialize: Fetch restaurant data on mount ──────────────────────────────
  useEffect(() => {
    const initializeRestaurantData = async () => {
      try {
        setLoading(true);

        const userRes = await authAPI.getCurrentUser();
        if (!userRes.success) {
          throw new Error('Unable to load authenticated user');
        }

        const currentUser = userRes.data?.user || userRes.data;
        if (!currentUser?._id) {
          throw new Error('Invalid auth payload for restaurant dashboard');
        }

        setRestaurantData(currentUser);
        setProfileForm({
          name: currentUser.name || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          businessType: currentUser.businessType || 'Restaurant',
          address: currentUser.address || currentUser.addresses?.[0]?.line1 || ''
        });

        const [cartRes, productsRes, ordersRes, inventoryRes, vehiclesRes, metricsRes] = await Promise.all([
          cartAPI.getCart(),
          productAPI.getAll({ status: 'active', limit: 200 }),
          orderAPI.getAll({ buyerId: currentUser._id }),
          inventoryAPI.getAll({ ownerId: currentUser._id }),
          vehicleAPI.getMarketplaceVehicles({ status: 'Available' }),
          analyticsAPI.getUserMetrics(currentUser._id)
        ]);

        if (cartRes.success && Array.isArray(cartRes.data?.items)) {
          const mappedCart = cartRes.data.items
            .map((item) => {
              const product = item.product || item.productId;
              if (!product?._id) return null;
              return {
                ...product,
                quantity: Number(item.qty || item.quantity || 0),
                minOrder: Number(product.minOrderQuantity || 1),
                price: Number(product.basePrice || 0),
                image: product.images?.[0] || '',
                farmer: product.ownerId?.name || 'Farmer'
              };
            })
            .filter(Boolean);
          setCart(mappedCart);
        }

        if (productsRes.success) {
          setProducts(productsRes.data?.products || []);
        }

        if (ordersRes.success) {
          const fetchedOrders = ordersRes.data?.orders || [];
          setOrders(fetchedOrders);
          computeStats(fetchedOrders);

          const scheduled = fetchedOrders
            .filter(o => ['confirmed', 'shipped', 'in-transit'].includes(o.status) && o.deliveryDate)
            .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
          setDeliverySchedule(scheduled);

          await fetchNotifications(1, 'all');
        }

        if (inventoryRes.success) {
          const inventoryLots = inventoryRes.data?.inventory || inventoryRes.data?.lots || [];
          const mappedInventory = inventoryLots.map((inv) => {
            const available = Number(inv.quantity || 0) - Number(inv.reservedQuantity || 0);
            const reorderLevel = Math.max(10, Math.ceil(Number(inv.quantity || 0) * 0.2));
            return {
              id: inv._id,
              product: inv.productId?.name || 'Product',
              stock: Math.max(0, available),
              reorderLevel,
              unit: inv.productId?.unit || 'kg',
              status: available > reorderLevel ? 'Good' : 'Low'
            };
          });
          setInventory(mappedInventory);
        }

        if (vehiclesRes.success && Array.isArray(vehiclesRes.data)) {
          const mappedFleet = vehiclesRes.data.map(v => ({
            id: v._id,
            name: v.name,
            capacity: v.capacity || 0,
            type: v.type || 'Other',
            ownerName: v.owner?.name || 'Delivery Partner',
            status: v.status || 'Available',
            plateNumber: v.plateNumber || ''
          }));
          setFleet(mappedFleet);
        }

        const buyerMetrics = metricsRes?.data?.buyerMetrics;
        if (buyerMetrics) {
          setStats((prev) => ({
            ...prev,
            monthlySpent: buyerMetrics.totalSpent || prev.monthlySpent || 0
          }));
        }
      } catch (error) {
        console.error('Error initializing restaurant data:', error);
        setSnackbar({ open: true, message: 'Unable to load restaurant data from server', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    initializeRestaurantData();
  }, []);

  const [fleet, setFleet] = useState([]);

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    if (!restaurantData?._id) {
      setSnackbar({ open: true, message: 'Unable to update profile', severity: 'error' });
      return;
    }

    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        businessType: profileForm.businessType,
        address: profileForm.address
      };

      const res = await userAPI.update(restaurantData._id, payload);
      const updatedUser = res?.data?.user;
      if (updatedUser) {
        setRestaurantData(updatedUser);
        updateUser(updatedUser);
      }

      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to update profile', severity: 'error' });
    }
  };

  const [suppliers] = useState([
    { id: 1, name: 'Rohan Farmer', category: 'Vegetables', rating: 4.8, orders: 45 },
    { id: 2, name: 'Suman Farmer', category: 'Fruits',     rating: 4.7, orders: 38 }
  ]);
  const [assignDialog, setAssignDialog] = useState({ open: false, orderId: null });
  const [addRiderDialog, setAddRiderDialog] = useState(false);
  const [newRider, setNewRider] = useState({ name: '', type: 'Bike', plate: '' });

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (searchText = '') => {
    try {
      setCartLoading(true);
      const params = { status: 'active', limit: 200 };
      const normalizedSearch = String(searchText || '').trim();
      if (normalizedSearch) {
        params.search = normalizedSearch;
      }

      const response = await productAPI.getAll(params);
      if (response.success) {
        setProducts(response.data.products || []);
        return;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setSnackbar({ open: true, message: 'Failed to load marketplace products', severity: 'error' });
    } finally {
      setCartLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?._id) return;
    try {
      const response = await orderAPI.getAll({ buyerId: user._id });
      if (response.success) {
        const fetched = response.data.orders || [];
        setOrders(fetched);
        computeStats(fetched);
        // Build delivery schedule from in-transit orders
        const scheduled = fetched
          .filter(o => ['confirmed', 'shipped', 'in-transit'].includes(o.status) && o.deliveryDate)
          .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
        setDeliverySchedule(scheduled);
        // Build notifications from 5 most recent
        await fetchNotifications(1, 'all');
        return;
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setSnackbar({ open: true, message: 'Failed to load orders', severity: 'error' });
    }
  }, [user]);

  const computeStats = (list) => {
    const activeOrders  = list.filter(o => ['pending','confirmed','shipped','in-transit'].includes(o.status)).length;
    const pendingDelivery = list.filter(o => ['shipped','in-transit'].includes(o.status)).length;
    const now = new Date();
    const monthlySpent = list
      .filter(o => { const d = new Date(o.createdAt); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); })
      .reduce((s, o) => s + (o.total || o.subtotal || 0), 0);
    setStats({ activeOrders, monthlySpent, totalOrders: list.length, pendingDelivery });
  };

  useEffect(() => {
    computeStats(orders || []);
  }, [orders]);

  const fetchDeliveryVehicles = useCallback(async () => {
    try {
      const vehiclesRes = await vehicleAPI.getMarketplaceVehicles({ status: 'Available' });
      if (vehiclesRes.success && Array.isArray(vehiclesRes.data)) {
        const mappedFleet = vehiclesRes.data.map(v => ({
          id: v._id,
          name: v.name,
          capacity: v.capacity || 0,
          type: v.type || 'Other',
          ownerName: v.owner?.name || 'Delivery Partner',
          status: v.status || 'Available',
          plateNumber: v.plateNumber || ''
        }));
        setFleet(mappedFleet);
      }
    } catch {
      // Ignore partner vehicle fetch failure to keep ordering flow active.
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(searchQuery), fetchOrders(), fetchDeliveryVehicles()]);
    setSnackbar({ open: true, message: 'Data refreshed!', severity: 'info' });
  }, [fetchProducts, fetchOrders, searchQuery, fetchDeliveryVehicles]);

  useEffect(() => {
    if (user?._id) refreshAll();
  }, [user, refreshAll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchProducts]);

  // ─── Notifications ────────────────────────────────────────────────────────
  const markAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      await fetchNotifications(notificationPage, notificationFilter);
      setSnackbar({ open: true, message: 'All notifications marked as read', severity: 'info' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to update notifications', severity: 'error' });
    }
  };
  const markOneRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      await fetchNotifications(notificationPage, notificationFilter);
    } catch {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async (page = notificationPage, filter = notificationFilter) => {
    const params = { page, limit: 8 };
    if (filter === 'unread') params.unread = true;
    if (filter !== 'all' && filter !== 'unread') params.type = filter;

    const notificationsRes = await notificationAPI.getAll(params);
    if (notificationsRes.success) {
      setNotifications((notificationsRes.data || []).map((n) => ({
        id: n._id || n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        timestamp: n.createdAt || Date.now(),
        type: n.type === 'alert' ? 'warning' : n.type === 'delivery' ? 'info' : 'success',
        read: !!n.isRead
      })));
      setNotificationTotalPages(notificationsRes.pagination?.totalPages || 1);
    }
  }, [notificationPage, notificationFilter]);

  const fetchNegotiations = useCallback(async () => {
    try {
      const res = await marketplaceRequestAPI.getMyRequests({ limit: 25 });
      if (res.success) {
        setNegotiations(res.data?.requests || []);
      }
    } catch {
      // Ignore fetch failures here to keep ordering flow available.
    }
  }, []);

  const createNegotiation = async (product) => {
    const qty = Number(product.minOrderQuantity || 5);
    const basePrice = Number(product.basePrice || product.price || 0);
    const offeredPrice = Number(window.prompt(`Enter your offered price per ${product.unit || 'kg'} (₹${basePrice} suggested)`, String(basePrice)));

    if (!offeredPrice || Number.isNaN(offeredPrice) || offeredPrice <= 0) {
      setSnackbar({ open: true, message: 'Valid offered price is required', severity: 'error' });
      return;
    }

    try {
      await marketplaceRequestAPI.create({
        productId: product._id,
        cropName: product.name,
        quantity: qty,
        unit: product.unit || 'kg',
        offeredPrice,
        requesterType: 'restaurant',
        location: restaurantData?.address || 'India',
        notes: `Restaurant negotiation request for ${qty} ${product.unit || 'kg'}`
      });
      await fetchNegotiations();
      setSnackbar({ open: true, message: 'Negotiation request sent to farmer', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to create negotiation', severity: 'error' });
    }
  };

  const handleNegotiationAction = async (request, action) => {
    try {
      if (action === 'counter') {
        const current = Number(request.currentOfferPrice ?? request.offeredPrice ?? 0);
        const counter = Number(window.prompt('Enter your counter offer price', String(current)));
        if (!counter || Number.isNaN(counter) || counter <= 0) {
          setSnackbar({ open: true, message: 'Valid counter price is required', severity: 'error' });
          return;
        }
        await marketplaceRequestAPI.buyerRespond(request._id, { action: 'counter', offeredPrice: counter });
      } else {
        await marketplaceRequestAPI.buyerRespond(request._id, { action });
      }

      await fetchNegotiations();
      setSnackbar({ open: true, message: `Negotiation ${action} completed`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || `Failed to ${action} negotiation`, severity: 'error' });
    }
  };

  useEffect(() => {
    if (activeSection === 'notifications') {
      fetchNotifications(notificationPage, notificationFilter);
    }
  }, [activeSection, notificationPage, notificationFilter, fetchNotifications]);

  useEffect(() => {
    fetchNegotiations();
  }, [fetchNegotiations]);

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    const step = product.minOrderQuantity || 5;
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + step } : i);
      return [...prev, { ...product, quantity: step, price: product.basePrice, image: product.images?.[0] || '', farmer: product.ownerId?.name || 'Farmer', category: product.categoryId?.name || 'Category', minOrder: step }];
    });
    setSnackbar({ open: true, message: `${product.name} added to cart`, severity: 'success' });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item._id !== productId) return item;
      const step = item.minOrder || 5;
      const newQty = Math.max(step, item.quantity + delta * step);
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i._id !== productId));
    setSnackbar({ open: true, message: 'Item removed from cart', severity: 'info' });
  };

  const getTotalAmount = () => cart.reduce((s, i) => s + (i.price || i.basePrice) * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      setCartLoading(true);
      if (!user?._id) {
        throw new Error('User session unavailable');
      }

      const resolvedSellerId = cart[0]?.ownerId?._id || cart[0]?.ownerId;
      if (!resolvedSellerId) {
        throw new Error('Unable to determine seller for this cart');
      }

      const hasMixedSellers = cart.some((item) => {
        const itemSeller = item.ownerId?._id || item.ownerId;
        return String(itemSeller) !== String(resolvedSellerId);
      });

      if (hasMixedSellers) {
        throw new Error('All items in one order must belong to the same supplier');
      }

      const subtotal = getTotalAmount();
      const orderData = {
        type: 'b2b',
        buyerId: user._id,
        sellerId: resolvedSellerId,
        orderItems: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          unitPrice: item.price || item.basePrice,
          totalPrice: (item.price || item.basePrice) * item.quantity
        })),
        total: subtotal,
        deliveryAddress: user.addresses?.[0] || { line1: 'Restaurant Address', city: 'City', state: 'State', postalCode: '000000', country: 'India' },
        paymentMethod: 'prepaid'
      };
      const response = await orderAPI.create(orderData);
      if (response.success) {
        setSnackbar({ open: true, message: `Order placed! ID: ${response.data.order.orderNumber}`, severity: 'success' });
        setCart([]);
        setActiveSection('orders');
        await fetchOrders();
        return;
      }
      throw new Error(response.message || 'Failed to place order');
    } catch (error) {
      console.error('Order error:', error);
      setSnackbar({ open: true, message: error.message || 'Unable to place order', severity: 'error' });
    } finally {
      setCartLoading(false);
    }
  };

  const requestDeliveryVehicle = async (vehicle) => {
    const order = orders.find((o) => String(o._id) === String(assignDialog.orderId));
    if (!order) return;

    try {
      await orderAPI.requestDelivery(order._id, vehicle.id);
      setAssignDialog({ open: false, orderId: null });
      await Promise.all([fetchOrders(), fetchDeliveryVehicles()]);
      setSnackbar({ open: true, message: `Requested ${vehicle.name} (${vehicle.ownerName || 'Delivery Partner'}) for order ${order.orderNumber}`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to request delivery vehicle', severity: 'error' });
    }
  };

  // ─── Auto Orders / Subscriptions ──────────────────────────────────────────
  const subscribeToProduct = (product) => {
    if (subscriptions.find(i => i._id === product._id)) {
      setSnackbar({ open: true, message: `Already subscribed to ${product.name}`, severity: 'info' });
      return;
    }
    const step = product.minOrderQuantity || 5;
    const newSub = { ...product, quantity: step, price: product.basePrice, image: product.images?.[0] || '', farmer: product.ownerId?.name || 'Farmer', category: product.categoryId?.name || '', minOrder: step };
    setSubscriptions(prev => [...prev, newSub]);
    setDailyDraft(prev => prev.find(i => i._id === product._id) ? prev : [...prev, newSub]);
    setSnackbar({ open: true, message: `Subscribed to ${product.name} — added to today's draft`, severity: 'success' });
  };

  const removeSubscription = (productId) => {
    setSubscriptions(prev => prev.filter(i => i._id !== productId));
    setDailyDraft(prev => prev.filter(i => i._id !== productId));
    setSnackbar({ open: true, message: 'Subscription cancelled', severity: 'info' });
  };

  const updateDraftQuantity = (productId, delta) => {
    setDailyDraft(prev => prev.map(item => {
      if (item._id !== productId) return item;
      const step = item.minOrder || 5;
      return { ...item, quantity: Math.max(step, item.quantity + delta * step) };
    }));
  };

  const placeDailyOrder = async () => {
    const valid = dailyDraft.filter(i => i.quantity > 0);
    if (!valid.length) { setSnackbar({ open: true, message: 'Draft is empty!', severity: 'warning' }); return; }
    try {
      setAutoLoading(true);
      const sellerId = valid[0]?.ownerId?._id || valid[0]?.ownerId;
      const hasMixedSellers = valid.some((item) => {
        const itemSeller = item.ownerId?._id || item.ownerId;
        return String(itemSeller) !== String(sellerId);
      });

      if (!sellerId || hasMixedSellers) {
        throw new Error('Auto-order draft must contain items from a single supplier');
      }

      const subtotal = valid.reduce((sum, item) => sum + (item.price || item.basePrice) * item.quantity, 0);
      const payload = {
        type: 'b2b',
        buyerId: user._id,
        sellerId,
        orderItems: valid.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          unitPrice: item.price || item.basePrice,
          totalPrice: (item.price || item.basePrice) * item.quantity
        })),
        total: subtotal,
        deliveryAddress: user.addresses?.[0] || { line1: 'Restaurant Address', city: 'City', state: 'State', postalCode: '000000', country: 'India' },
        paymentMethod: 'prepaid'
      };

      const response = await orderAPI.create(payload);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create auto-order');
      }

      setDailyDraft([]);
      setActiveSection('orders');
      await fetchOrders();
      setSnackbar({ open: true, message: 'Auto-order confirmed and scheduled!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Unable to place auto-order', severity: 'error' });
    } finally {
      setAutoLoading(false);
    }
  };

  // ─── Fleet management ─────────────────────────────────────────────────────
  const addRider = async () => {
    if (!newRider.name.trim()) return;
    try {
      const created = await vehicleAPI.create({
        name: newRider.name.trim(),
        type: newRider.type,
        plate: newRider.plate.trim(),
        capacity: 0
      });

      if (created?.success) {
        const vehicle = created.data;
        setFleet(prev => [...prev, {
          id: vehicle._id,
          name: vehicle.name,
          capacity: vehicle.capacity || 0,
          type: vehicle.type || 'Other',
          status: vehicle.status || 'Available',
          plateNumber: vehicle.plateNumber || ''
        }]);
        setNewRider({ name: '', type: 'Bike', plate: '' });
        setAddRiderDialog(false);
        setSnackbar({ open: true, message: `Rider ${vehicle.name} added`, severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to add rider', severity: 'error' });
    }
  };

  const removeRider = async (id) => {
    try {
      const response = await vehicleAPI.delete(id);
      if (response?.success) {
        setFleet(prev => prev.filter(r => r.id !== id));
        setSnackbar({ open: true, message: 'Rider removed', severity: 'info' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to remove rider', severity: 'error' });
    }
  };

  const toggleRiderStatus = async (id) => {
    const rider = fleet.find(r => r.id === id);
    if (!rider) return;
    const nextStatus = rider.status === 'Available' ? 'Inactive' : 'Available';
    try {
      const response = await vehicleAPI.updateStatus(id, nextStatus);
      if (response?.success) {
        setFleet(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus } : r));
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to update rider status', severity: 'error' });
    }
  };

  // ─── Inventory ────────────────────────────────────────────────────────────
  const recomputeInventoryStatus = (items) =>
    items.map(i => ({ ...i, status: i.stock <= i.reorderLevel ? 'Low' : 'Good' }));

  const updateInventoryStock = (id, delta) => {
    setInventory(prev => recomputeInventoryStatus(prev.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i)));
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredProducts = products;

  // ─── Sidebar menu ─────────────────────────────────────────────────────────
  const menuItems = [
    { id: 'overview',       label: 'Overview',         icon: <Home /> },
    { id: 'marketplace',    label: 'Marketplace',      icon: <Store /> },
    { id: 'negotiations',   label: 'Negotiations',     icon: <AttachMoney />, badge: negotiations.filter((r) => ['open', 'countered'].includes(r.status)).length || 0 },
    { id: 'cart',           label: 'My Cart',          icon: <ShoppingCart />, badge: cart.length },
    { id: 'orders',         label: 'My Orders',        icon: <LocalShipping />, badge: stats.activeOrders || 0 },
    { id: 'subscriptions',  label: 'Auto Orders',      icon: <Autorenew /> },
    { id: 'inventory',      label: 'Pantry Inventory', icon: <Inventory /> },
    { id: 'logistics',      label: 'Delivery Partners',icon: <DeliveryDining /> },
    { id: 'schedule',       label: 'Delivery Schedule',icon: <Schedule /> },
    { id: 'notifications',  label: 'Notifications',    icon: <Notifications />, badge: unreadCount },
    { id: 'profile',        label: 'Profile',          icon: <AccountCircle /> },
  ];

  const allSectionIds = menuItems.map(m => m.id);
  const performance = {
    onTimeDelivery: Number(restaurantData?.stats?.onTimeDelivery || DEFAULT_PERFORMANCE.onTimeDelivery),
    qualityRating: Number(restaurantData?.stats?.qualityRating || DEFAULT_PERFORMANCE.qualityRating)
  };

  const SidebarList = () => (
    <List>
      {menuItems.map((item) => (
        <ListItemButton
          key={item.id}
          selected={activeSection === item.id}
          onClick={() => { setActiveSection(item.id); setDrawerOpen(false); }}
          sx={{ borderRadius: 2, mb: 1 }}
        >
          <ListItemIcon>
            {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
          </ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
        </ListItemButton>
      ))}
    </List>
  );

  // ─── Low stock alert ──────────────────────────────────────────────────────
  const lowStockItems = inventory.filter(i => i.status === 'Low');

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>

      {/* Mobile Drawer */}
      <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: 280 } }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Restaurant color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">FarmKart Restaurant</Typography>
          </Stack>
          <SidebarList />
        </Box>
      </Drawer>

      {/* Desktop Sidebar */}
      <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ position: 'sticky', top: 0, p: 3, maxHeight: '100vh', overflowY: 'auto' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Restaurant color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">FarmKart</Typography>
          </Stack>
          <SidebarList />
          <Divider sx={{ my: 3 }} />
          <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>This Month</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Total Orders</Typography>
                <Typography variant="body2" fontWeight="bold">{stats.totalOrders}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Amount Spent</Typography>
                <Chip label={`₹${(stats.monthlySpent / 1000).toFixed(1)}k`} size="small" color="primary" />
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top AppBar */}
        <AppBar position="sticky" color="inherit" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Restaurant Partner Dashboard</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton color="primary" onClick={refreshAll} title="Refresh data">
                <Refresh />
              </IconButton>
              <IconButton color="primary" onClick={() => setActiveSection('notifications')}>
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <ProfileDropdown activeTab={activeSection} setActiveTab={setActiveSection} />
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Low Stock Banner */}
        {lowStockItems.length > 0 && (
          <Alert severity="warning" sx={{ borderRadius: 0 }}>
            ⚠️ Low pantry stock: {lowStockItems.map(i => i.product).join(', ')} — go to Pantry Inventory to reorder.
          </Alert>
        )}

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>

            {/* ── OVERVIEW ── */}
            {activeSection === 'overview' && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      {[
                        { label: 'Active Orders',    value: stats.activeOrders,    color: 'primary.main',  icon: <ShoppingCart sx={{ fontSize: 32 }} /> },
                        { label: 'This Month Spent', value: `₹${(stats.monthlySpent/1000).toFixed(1)}k`, color: 'success.main', icon: <AttachMoney sx={{ fontSize: 32 }} /> },
                        { label: 'Total Orders',     value: stats.totalOrders,     color: 'info.main',     icon: <TrendingUp sx={{ fontSize: 32 }} /> },
                        { label: 'Pending Delivery', value: stats.pendingDelivery, color: 'warning.main',  icon: <LocalShipping sx={{ fontSize: 32 }} /> },
                      ].map((stat) => (
                        <Grid item xs={12} sm={6} key={stat.label}>
                          <Card>
                            <CardContent>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                  <Typography variant="h4" fontWeight="bold" color={stat.color}>{stat.value}</Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>{stat.icon}</Avatar>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>

                    <Paper sx={{ p: 3, mb: 4 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Performance Metrics</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">On-Time Supply Delivery</Typography>
                            <Typography variant="body2" fontWeight="bold">{performance.onTimeDelivery}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={performance.onTimeDelivery} sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2">Ingredients Quality Rating</Typography>
                            <Typography variant="body2" fontWeight="bold">{performance.qualityRating}/5.0</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={(performance.qualityRating / 5) * 100} color="success" sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Quick Actions</Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" fullWidth startIcon={<Store />} onClick={() => setActiveSection('marketplace')}>Go to Marketplace</Button>
                        <Button variant="outlined" fullWidth startIcon={<Autorenew />} onClick={() => setActiveSection('subscriptions')}>Manage Auto Orders</Button>
                        <Button variant="outlined" fullWidth startIcon={<Inventory />} onClick={() => setActiveSection('inventory')}>Check Pantry Inventory</Button>
                      </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>Top Farm Suppliers</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={2}>
                        {suppliers.map((s) => (
                          <Card key={s.id} variant="outlined">
                            <CardContent sx={{ p: 2 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">{s.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{s.category} • {s.orders} orders</Typography>
                                </Box>
                                <Chip label={`⭐ ${s.rating}`} size="small" color="success" />
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── MARKETPLACE ── */}
            {activeSection === 'marketplace' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Marketplace & Fresh Supplies</Typography>
                  <Button variant="contained" startIcon={<ShoppingCart />} onClick={() => setActiveSection('cart')}>
                    View Cart ({cart.length})
                  </Button>
                </Stack>

                <TextField fullWidth placeholder="Search for fresh produce, meats, etc..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                  sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {cartLoading ? (
                    <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Loading supplies...</Typography>
                    </Grid>
                  ) : filteredProducts.length === 0 ? (
                    <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">No products found.</Typography>
                    </Grid>
                  ) : filteredProducts.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product._id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardMedia component="img" height="180"
                          image={product.images?.[0] || product.image || 'https://via.placeholder.com/300x180?text=No+Image'}
                          alt={product.name}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/300x180?text=No+Image'; }} />
                        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {product.ownerId?.name || 'Farmer'} • {product.categoryId?.name || 'Category'}
                          </Typography>
                          <Chip label={`Min: ${product.minOrderQuantity || 5} ${product.unit}`} size="small" variant="outlined" sx={{ mb: 1, alignSelf: 'flex-start' }} />
                          <Box sx={{ mt: 'auto', pt: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="h6" color="primary.main" fontWeight="bold">
                                ₹{product.basePrice || product.price} / {product.unit}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Button variant="outlined" size="small" color="secondary" onClick={() => subscribeToProduct(product)}>
                                  Autoship
                                </Button>
                                <Button variant="outlined" size="small" color="warning" onClick={() => createNegotiation(product)}>
                                  Negotiate
                                </Button>
                                <Button variant="contained" size="small" startIcon={<Add />} onClick={() => addToCart(product)}>
                                  Add
                                </Button>
                              </Stack>
                            </Stack>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {activeSection === 'negotiations' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Price Negotiations</Typography>
                  <Button variant="outlined" startIcon={<Refresh />} onClick={fetchNegotiations}>Refresh</Button>
                </Stack>

                <Paper sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {negotiations.map((request) => {
                      const currentPrice = Number(request.currentOfferPrice ?? request.offeredPrice ?? 0);
                      const buyerTurn = request.status === 'countered' && request.lastOfferedBy === 'farmer';

                      return (
                        <Card key={request._id} variant="outlined">
                          <CardContent>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="bold">{request.cropName} • {request.quantity} {request.unit || 'kg'}</Typography>
                                <Typography variant="body2" color="text.secondary">Current negotiated price: ₹{currentPrice}/kg</Typography>
                                <Chip size="small" sx={{ mt: 1 }} label={request.status} color={request.status === 'accepted' ? 'success' : request.status === 'declined' || request.status === 'cancelled' ? 'error' : 'warning'} />
                              </Box>
                              <Stack direction="row" spacing={1}>
                                {buyerTurn && (
                                  <>
                                    <Button size="small" variant="contained" color="success" onClick={() => handleNegotiationAction(request, 'accept')}>Accept</Button>
                                    <Button size="small" variant="outlined" color="warning" onClick={() => handleNegotiationAction(request, 'counter')}>Counter</Button>
                                  </>
                                )}
                                {['open', 'countered'].includes(request.status) && (
                                  <Button size="small" variant="text" color="error" onClick={() => handleNegotiationAction(request, 'cancel')}>Cancel</Button>
                                )}
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {negotiations.length === 0 && (
                      <Typography color="text.secondary" textAlign="center" py={3}>No negotiations yet. Start from Marketplace.</Typography>
                    )}
                  </Stack>
                </Paper>
              </Box>
            )}

            {/* ── CART ── */}
            {activeSection === 'cart' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">My Cart</Typography>
                  <Button variant="outlined" startIcon={<Store />} onClick={() => setActiveSection('marketplace')}>Continue Shopping</Button>
                </Stack>

                {cart.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">Your cart is empty.</Typography>
                    <Button variant="contained" sx={{ mt: 3 }} onClick={() => setActiveSection('marketplace')}>Browse Marketplace</Button>
                  </Paper>
                ) : (
                  <Box>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Supply Item</strong></TableCell>
                            <TableCell><strong>Unit Price</strong></TableCell>
                            <TableCell><strong>Quantity</strong></TableCell>
                            <TableCell align="right"><strong>Total</strong></TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cart.map((item) => (
                            <TableRow key={item._id}>
                              <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.image || item.images?.[0]} variant="rounded" />
                                <Typography fontWeight="medium">{item.name}</Typography>
                              </TableCell>
                              <TableCell>₹{item.price || item.basePrice} / {item.unit}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <IconButton size="small" onClick={() => updateQuantity(item._id, -1)} color="primary"><Remove fontSize="small" /></IconButton>
                                  <Typography fontWeight="bold" sx={{ minWidth: 40, textAlign: 'center' }}>{item.quantity} {item.unit}</Typography>
                                  <IconButton size="small" onClick={() => updateQuantity(item._id, 1)} color="primary"><Add fontSize="small" /></IconButton>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Typography fontWeight="bold">₹{((item.price || item.basePrice) * item.quantity).toLocaleString()}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton size="small" color="error" onClick={() => removeFromCart(item._id)}><Delete fontSize="small" /></IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Paper sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" color="text.secondary">Order Subtotal</Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary.main">₹{getTotalAmount().toLocaleString()}</Typography>
                        </Box>
                        <Button variant="contained" size="large" disabled={cartLoading} onClick={handlePlaceOrder} sx={{ px: 4, py: 1.5 }}>
                          {cartLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirm & Place Order'}
                        </Button>
                      </Stack>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {/* ── ORDERS ── */}
            {activeSection === 'orders' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>My Orders</Typography>

                {cartLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : orders.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>No Orders Yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Start ordering fresh produce from local farmers.</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setActiveSection('marketplace')}>Place Your First Order</Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {orders.map((order) => (
                      <Grid item xs={12} key={order._id}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">Order {order.orderNumber}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Typography>
                              </Box>
                              <Chip label={order.status}
                                color={order.status==='delivered'?'success':order.status==='shipped'||order.status==='in-transit'?'primary':order.status==='confirmed'?'info':'warning'} />
                            </Stack>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Items</Typography>
                                <Typography variant="body1" fontWeight="bold">{order.orderItems?.length || 0} Products</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                                <Typography variant="body1" fontWeight="bold" color="success.main">₹{(order.total || order.subtotal || 0).toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Delivery Date</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not Scheduled'}
                                </Typography>
                              </Grid>
                            </Grid>
                            {order.orderItems?.length > 0 && (
                              <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="caption" color="text.secondary">Items:</Typography>
                                <Stack spacing={0.5} sx={{ mt: 1 }}>
                                  {order.orderItems.slice(0, 3).map((item, idx) => (
                                    <Typography key={idx} variant="body2">• {item.productName || 'Product'} — {item.quantity} {item.unit}</Typography>
                                  ))}
                                  {order.orderItems.length > 3 && (
                                    <Typography variant="body2" color="text.secondary">+{order.orderItems.length - 3} more items</Typography>
                                  )}
                                </Stack>
                              </>
                            )}
                            <Divider sx={{ my: 2 }} />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {order.delivery?.requestedVehicleId?.name
                                  ? `Requested: ${order.delivery.requestedVehicleId.name} (${order.delivery?.requestedPartnerId?.name || 'Delivery Partner'})`
                                  : 'No delivery vehicle requested yet'}
                              </Typography>
                              {!order.delivery?.requestedVehicleId && ['pending', 'confirmed', 'processing'].includes(String(order.status || '').toLowerCase()) && (
                                <Button size="small" variant="outlined" startIcon={<LocalShipping />} onClick={() => setAssignDialog({ open: true, orderId: order._id })}>
                                  Request Delivery Vehicle
                                </Button>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* ── AUTO ORDERS / SUBSCRIPTIONS ── */}
            {activeSection === 'subscriptions' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>Auto Orders & Subscriptions</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Subscribe to daily produce from the Marketplace. Each item drops into today's draft automatically — adjust quantities before confirming.
                </Typography>

                <Grid container spacing={4}>
                  <Grid item xs={12} md={7}>
                    <Card sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                      <CardContent>
                        <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>Today's Delivery Draft</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Harvest yield varies daily — adjust quantities as needed before placing today's order.
                        </Typography>
                        {dailyDraft.length === 0 ? (
                          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default' }} variant="outlined">
                            <Typography color="text.secondary">No items in today's draft.</Typography>
                            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setActiveSection('marketplace')}>Browse Marketplace</Button>
                          </Paper>
                        ) : (
                          <Box>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>Item</strong></TableCell>
                                    <TableCell><strong>Quantity</strong></TableCell>
                                    <TableCell align="right"><strong>Sub-total</strong></TableCell>
                                    <TableCell align="right"><strong>Remove</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {dailyDraft.map(item => (
                                    <TableRow key={item._id}>
                                      <TableCell><Typography variant="body2" fontWeight="medium">{item.name}</Typography></TableCell>
                                      <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                          <IconButton size="small" onClick={() => updateDraftQuantity(item._id, -1)}><Remove fontSize="small" /></IconButton>
                                          <Typography>{item.quantity} {item.unit}</Typography>
                                          <IconButton size="small" onClick={() => updateDraftQuantity(item._id, 1)}><Add fontSize="small" /></IconButton>
                                        </Stack>
                                      </TableCell>
                                      <TableCell align="right">
                                        <Typography variant="body2">₹{(item.price * item.quantity).toLocaleString()}</Typography>
                                      </TableCell>
                                      <TableCell align="right">
                                        <IconButton size="small" color="error" onClick={() => setDailyDraft(prev => prev.filter(d => d._id !== item._id))}><Delete fontSize="small" /></IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                            <Button variant="contained" fullWidth size="large" onClick={placeDailyOrder} disabled={autoLoading}>
                              {autoLoading ? <CircularProgress size={20} color="inherit" /> : "Confirm Today's Order"}
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Active Subscriptions</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          These items auto-populate your draft each morning.
                        </Typography>
                        {subscriptions.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <Autorenew sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">No active subscriptions.</Typography>
                            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setActiveSection('marketplace')}>Subscribe from Marketplace</Button>
                          </Box>
                        ) : (
                          <Stack spacing={2}>
                            {subscriptions.map(sub => (
                              <Paper key={sub._id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} variant="outlined">
                                <Box>
                                  <Typography variant="body1" fontWeight="bold">{sub.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {sub.quantity} {sub.unit} / day · ₹{sub.price}/{sub.unit}
                                  </Typography>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => removeSubscription(sub._id)}><Delete /></IconButton>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── PANTRY INVENTORY ── */}
            {activeSection === 'inventory' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Pantry Inventory</Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.lighter' }}>
                      <Typography variant="h4" fontWeight="bold" color="error.main">{inventory.filter(i => i.status==='Low').length}</Typography>
                      <Typography variant="body2" color="text.secondary">Low Stock Items</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.lighter' }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{inventory.filter(i => i.status==='Good').length}</Typography>
                      <Typography variant="body2" color="text.secondary">Well Stocked</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Ingredient</strong></TableCell>
                        <TableCell><strong>Current Stock</strong></TableCell>
                        <TableCell><strong>Reorder Level</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="right"><strong>Adjust / Reorder</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><Typography fontWeight="medium">{item.product}</Typography></TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconButton size="small" onClick={() => updateInventoryStock(item.id, -1)}><Remove fontSize="small" /></IconButton>
                              <Typography>{item.stock} {item.unit}</Typography>
                              <IconButton size="small" onClick={() => updateInventoryStock(item.id, 1)}><Add fontSize="small" /></IconButton>
                            </Stack>
                          </TableCell>
                          <TableCell>{item.reorderLevel} {item.unit}</TableCell>
                          <TableCell>
                            <Chip label={item.status} color={item.status==='Good'?'success':'error'} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Button variant="outlined" size="small"
                              startIcon={<ShoppingCart />}
                              color={item.status==='Low'?'error':'primary'}
                              onClick={() => { setSearchQuery(item.product); setActiveSection('marketplace'); }}>
                              Reorder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* ── FLEET & LOGISTICS ── */}
            {activeSection === 'logistics' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Delivery Partner Vehicles</Typography>
                </Stack>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { label: 'Total Partner Vehicles', value: fleet.length, color: 'primary.main' },
                    { label: 'Available', value: fleet.filter(r=>r.status==='Available').length, color: 'success.main' },
                    { label: 'On Delivery', value: fleet.filter(r=>r.status==='On Delivery').length, color: 'warning.main' },
                  ].map(s => (
                    <Grid item xs={12} sm={4} key={s.label}>
                      <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
                        <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>ID</strong></TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Partner</strong></TableCell>
                        <TableCell><strong>Capacity</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fleet.map((rider) => (
                        <TableRow key={rider.id}>
                          <TableCell>{rider.id}</TableCell>
                          <TableCell>{rider.name}</TableCell>
                          <TableCell>{rider.ownerName || 'Delivery Partner'}</TableCell>
                          <TableCell>{rider.capacity} kg</TableCell>
                          <TableCell>
                            <Chip label={rider.status}
                              color={rider.status==='Available'?'success':rider.status==='On Delivery'?'warning':'default'}
                              size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* ── DELIVERY SCHEDULE ── */}
            {activeSection === 'schedule' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Delivery Schedule</Typography>
                {cartLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : deliverySchedule.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>No Scheduled Deliveries</Typography>
                    <Typography variant="body2" color="text.secondary">Upcoming deliveries appear once orders are confirmed.</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {deliverySchedule.map((order) => (
                      <Grid item xs={12} md={6} key={order._id}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="bold">{order.orderNumber}</Typography>
                                <Typography variant="caption" color="text.secondary">{order.orderItems?.length || 0} items</Typography>
                              </Box>
                              <Chip label={order.status}
                                color={order.status==='shipped'||order.status==='in-transit'?'primary':order.status==='confirmed'?'info':'default'}
                                size="small" />
                            </Stack>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Schedule fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">Delivery:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {new Date(order.deliveryDate).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AttachMoney fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">Total:</Typography>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  ₹{(order.total || order.subtotal || 0).toLocaleString()}
                                </Typography>
                              </Stack>
                              {order.deliveryAddress && (
                                <Stack direction="row" alignItems="start" spacing={1}>
                                  <LocalShipping fontSize="small" color="action" sx={{ mt: 0.5 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {order.deliveryAddress.line1}, {order.deliveryAddress.city}
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeSection === 'notifications' && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">Notifications</Typography>
                  {unreadCount > 0 && (
                    <Button startIcon={<DoneAll />} onClick={markAllRead}>Mark All as Read</Button>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                  {['all', 'unread', 'order', 'payment', 'delivery'].map((filter) => (
                    <Button
                      key={filter}
                      size="small"
                      variant={notificationFilter === filter ? 'contained' : 'outlined'}
                      onClick={() => {
                        setNotificationFilter(filter);
                        setNotificationPage(1);
                      }}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Button>
                  ))}
                </Stack>
                {notifications.length === 0 ? (
                  <Paper sx={{ p: 8, textAlign: 'center' }}>
                    <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No Notifications</Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2}>
                    {notifications.map((n) => (
                      <Card key={n.id} onClick={() => markOneRead(n.id)} sx={{ cursor: 'pointer', opacity: n.read ? 0.7 : 1 }}>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="start">
                            <Avatar sx={{ bgcolor: n.type==='success'?'success.main':n.type==='info'?'info.main':'warning.main', width: 40, height: 40 }}>
                              {n.type === 'success' ? <ShoppingCart /> : <Notifications />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" fontWeight={n.read ? 'normal' : 'bold'}>{n.message}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(n.timestamp).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}
                              </Typography>
                            </Box>
                            {!n.read && <Chip label="New" color="primary" size="small" />}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Page {notificationPage} of {notificationTotalPages}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" disabled={notificationPage <= 1} onClick={() => setNotificationPage((p) => Math.max(1, p - 1))}>Prev</Button>
                        <Button size="small" variant="outlined" disabled={notificationPage >= notificationTotalPages} onClick={() => setNotificationPage((p) => Math.min(notificationTotalPages, p + 1))}>Next</Button>
                      </Stack>
                    </Stack>
                  </Stack>
                )}
              </Box>
            )}

            {/* ── PROFILE ── */}
            {activeSection === 'profile' && (
              <Box>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Restaurant Profile</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                            {(profileForm.name || restaurantData?.name || 'R').charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h5" fontWeight="bold">{profileForm.name || restaurantData?.name || 'Restaurant Name'}</Typography>
                            <Typography variant="body2" color="text.secondary">{profileForm.email || 'email@example.com'}</Typography>
                            <Chip label={restaurantData?.roles?.[0] || 'restaurant'} size="small" color="primary" sx={{ mt: 1 }} />
                          </Box>
                        </Stack>
                        <Divider sx={{ my: 3 }} />
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Phone</Typography>
                            <Typography variant="body1">{profileForm.phone || 'Not provided'}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Member Since</Typography>
                            <Typography variant="body1">
                              {restaurantData?.createdAt ? new Date(restaurantData.createdAt).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : 'N/A'}
                            </Typography>
                          </Grid>
                          {(profileForm.address || restaurantData?.addresses?.length > 0) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Address</Typography>
                              <Typography variant="body1">
                                {profileForm.address || `${restaurantData?.addresses?.[0]?.line1 || ''}, ${restaurantData?.addresses?.[0]?.city || ''}, ${restaurantData?.addresses?.[0]?.state || ''} — ${restaurantData?.addresses?.[0]?.postalCode || ''}`}
                              </Typography>
                            </Grid>
                          )}
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Restaurant Name" name="name" value={profileForm.name} onChange={onProfileChange} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Business Type" name="businessType" value={profileForm.businessType} onChange={onProfileChange} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Phone" name="phone" value={profileForm.phone} onChange={onProfileChange} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Email" name="email" type="email" value={profileForm.email} onChange={onProfileChange} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth label="Address" name="address" multiline rows={2} value={profileForm.address} onChange={onProfileChange} />
                          </Grid>
                          <Grid item xs={12}>
                            <Button variant="contained" onClick={handleProfileUpdate}>Update Profile</Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Order Statistics</Typography>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                          {[
                            { label: 'Total Orders',  value: stats.totalOrders,  color: 'primary.main' },
                            { label: 'Active Orders', value: stats.activeOrders, color: 'success.main' },
                            { label: 'Monthly Spent', value: `₹${(stats.monthlySpent/1000).toFixed(1)}k`, color: 'info.main' },
                          ].map((s, i) => (
                            <Box key={i}>
                              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                              <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
                              {i < 2 && <Divider sx={{ mt: 1 }} />}
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── COMING SOON fallback ── */}
            {!allSectionIds.includes(activeSection) && (
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>Coming Soon</Typography>
                <Typography variant="body2" color="text.secondary">This feature is under development.</Typography>
              </Paper>
            )}

          </Container>
        </Box>
      </Box>

      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, orderId: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Select Delivery Partner Vehicle</DialogTitle>
        <DialogContent>
          {(() => {
            const order = orders.find((o) => String(o._id) === String(assignDialog.orderId));
            const required = Number(order?.orderItems?.[0]?.quantity || 0);

            return (
              <>
                {order && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Order: <strong>{order.orderNumber}</strong> — {required} {order?.orderItems?.[0]?.unit || 'units'}
                  </Alert>
                )}
                <List>
                  {fleet.map((vehicle) => {
                    const canCarry = vehicle.capacity >= required;
                    const isAvailable = vehicle.status === 'Available';
                    return (
                      <ListItem key={vehicle.id} sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1, opacity: (!canCarry || !isAvailable) ? 0.5 : 1 }}>
                        <ListItemIcon><LocalShipping color={isAvailable && canCarry ? 'primary' : 'disabled'} /></ListItemIcon>
                        <ListItemText
                          primary={vehicle.name}
                          secondary={`Partner: ${vehicle.ownerName || 'Delivery Partner'} | Capacity: ${vehicle.capacity} kg | Status: ${vehicle.status}`}
                        />
                        <Button variant="contained" size="small" disabled={!canCarry || !isAvailable} onClick={() => requestDeliveryVehicle(vehicle)}>
                          Request
                        </Button>
                      </ListItem>
                    );
                  })}
                  {fleet.length === 0 && (
                    <Typography color="text.secondary" textAlign="center" py={2}>
                      No delivery partner vehicles are currently available.
                    </Typography>
                  )}
                </List>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, orderId: null })}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RestaurantDashboard;

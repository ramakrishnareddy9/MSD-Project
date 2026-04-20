import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import orderRoutes from './routes/order.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import locationRoutes from './routes/location.routes.js';
import reviewRoutes from './routes/review.routes.js';
import recurringOrderRoutes from './routes/recurringOrder.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import priceAgreementRoutes from './routes/priceAgreement.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import communityRoutes from './routes/community.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import marketplaceRequestRoutes from './routes/marketplaceRequest.routes.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestLogger, errorLogger } from './middleware/logger.middleware.js';
import { 
  sanitizeInput, 
  preventSQLInjection,
  setSecurityHeaders 
} from './middleware/sanitize.middleware.js';

// Import services
import { startRecurringOrderScheduler } from './services/recurringOrderScheduler.js';
import { startInventoryCleanupScheduler } from './services/inventoryCleanupScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware (Per BACKEND_API_PROMPT lines 536-539)
app.use(helmet()); // Security headers
app.use(setSecurityHeaders); // Additional security headers
// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://localhost:5174', 
        'http://localhost:5175',
        'https://msd-project-farmkart.netlify.app'
      ]
    : [
        'http://localhost:5173', 
        'http://localhost:3000', 
        'http://localhost:5174', 
        'http://localhost:5175',
        'https://msd-project-farmkart.netlify.app'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions)); // CORS configured for security

// Compression middleware
app.use(compression());

// Rate limiting (Per BACKEND_API_PROMPT line 538)
const isLocalDevRequest = (ip = '') => {
  const normalizedIp = String(ip || '').trim();
  return normalizedIp === '::1' || normalizedIp === '127.0.0.1' || normalizedIp.startsWith('::ffff:127.0.0.1');
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' && isLocalDevRequest(req.ip)
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 200,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' && isLocalDevRequest(req.ip)
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization (must be after body parsing)
app.use(sanitizeInput);
app.use(preventSQLInjection);

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recurring-orders', recurringOrderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/price-agreements', priceAgreementRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/marketplace-requests', marketplaceRequestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FarmKart API is running',
    timestamp: new Date().toISOString()
  });
});

// Root route for direct backend URL hits
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FarmKart backend is running',
    apiBase: '/api',
    health: '/api/health'
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error logging
app.use(errorLogger);

// Global error handling middleware (Per BACKEND_API_PROMPT lines 484-514)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔒 Security: Helmet enabled, Rate limiting active`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start schedulers
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startRecurringOrderScheduler();
    startInventoryCleanupScheduler();
  } else {
    console.log('⏸️  Schedulers disabled');
  }
});

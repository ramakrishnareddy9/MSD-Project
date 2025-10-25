import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// Import services
import { startRecurringOrderScheduler } from './services/recurringOrderScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware (Per BACKEND_API_PROMPT lines 536-539)
app.use(helmet()); // Security headers
app.use(cors()); // CORS for development

// Rate limiting (Per BACKEND_API_PROMPT line 538)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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
app.use('/api/recurring-orders', recurringOrderRoutes); // NEW: Per BACKEND_API_PROMPT lines 419-427

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'FarmKart API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handling middleware (Per BACKEND_API_PROMPT lines 484-514)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔒 Security: Helmet enabled, Rate limiting active`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start recurring order scheduler (Per BACKEND_API_PROMPT lines 564-574)
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startRecurringOrderScheduler();
  } else {
    console.log('⏸️  Recurring order scheduler disabled');
  }
});

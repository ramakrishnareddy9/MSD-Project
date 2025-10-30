# FarmKart - Full Stack Marketplace Platform

A comprehensive B2C and B2B agricultural marketplace connecting farmers directly with consumers, businesses, restaurants, and delivery partners.

## 📋 Project Structure

```
MSD-Project/
├── backend/              # Express.js + MongoDB API
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── seed/            # Database seeding
│   ├── server.js        # Express server
│   └── package.json
│
├── FrontEnd/            # React + Vite frontend
│   ├── src/
│   │   ├── Components/  # Reusable UI components
│   │   ├── contexts/    # React contexts (Auth, Cart)
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   └── App.jsx
│   └── package.json
│
├── prompts/             # Implementation guides (DO NOT DELETE)
│   ├── SYSTEM_OVERVIEW_PROMPT.md
│   ├── BACKEND_API_PROMPT.md
│   └── REACT_FRONTEND_PROMPT.md
│
├── PROJECT_STATUS.md    # Current implementation status
├── SETUP_GUIDE.md       # Detailed setup instructions
└── README.md            # This file
```

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** (optional) - [Download](https://git-scm.com/)

### Step 1: Start MongoDB

#### Windows

If MongoDB is installed as a service:
```bash
net start MongoDB
```

Or run mongod directly:
```bash
mongod --dbpath="C:\data\db"
```

#### macOS/Linux
```bash
# Using Homebrew (macOS)
brew services start mongodb-community

# Or run directly
mongod --dbpath="/usr/local/var/mongodb"
```

Verify MongoDB is running:
```bash
mongosh
# Should connect to MongoDB shell
```

### Step 2: Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (already exists with defaults)
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/farmkart
# JWT_SECRET=your_jwt_secret_key_change_in_production
# NODE_ENV=development

# Seed the database with sample data
npm run seed

# Start the backend server
npm run dev
```

The backend will start on **http://localhost:5000**

✅ **Backend Ready!** You should see:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📡 API available at http://localhost:5000/api
```

### Step 3: Set Up Frontend

Open a **new terminal** (keep backend running):

```bash
# Navigate to React directory
cd React

# Install dependencies
npm install

# Create .env file (already exists)
# VITE_API_URL=http://localhost:5000/api

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:5173**

✅ **Frontend Ready!** Open your browser to http://localhost:5173

---

## 🔐 Login Credentials

After seeding the database, use these credentials to login:

| Role | Email | Password |
|------|-------|----------|
| **Customer** | customer@farmkart.com | customer123 |
| **Farmer** | farmer@farmkart.com | farmer123 |
| **Business** | business@farmkart.com | business123 |
| **Restaurant** | restaurant@farmkart.com | restaurant123 |
| **Delivery** | delivery@farmkart.com | delivery123 |
| **Admin** | admin@farmkart.com | admin123 |

💡 **Tip**: On the login page, select a role from the dropdown to auto-fill credentials!

---

## 🎯 Key Features

### Platform Roles

1. **Customer (B2C)** 
   - Browse products by category
   - Add items to cart
   - Place orders
   - Track deliveries
   - Write reviews

2. **Farmer** 
   - List products with inventory
   - Set pricing
   - Manage crops and harvest
   - View orders
   - Request delivery routes

3. **Business (B2B)** 
   - Bulk ordering
   - Wholesale pricing
   - Net payment terms
   - Purchase volume tracking

4. **Restaurant (B2B)** 
   - Recurring orders
   - Early-morning delivery slots
   - Menu-based ordering
   - Scheduled deliveries

5. **Delivery** 
   - Route management
   - Large-scale (long-haul trucks)
   - Small-scale (last-mile delivery)
   - Cold-chain logistics

6. **Admin** 
   - User management
   - Platform oversight
   - Order monitoring
   - Analytics

### Technical Features

✅ **Full-Stack Architecture**
- RESTful API with Express.js
- MongoDB with Mongoose ODM
- React with Vite for fast development
- Material-UI for polished components
- JWT authentication
- Role-based access control

✅ **Database Design**
- 15+ collections following ERD
- Normalized relationships
- Geospatial indexing for locations
- Text search for products
- Optimized queries

✅ **API Endpoints**
- `/api/auth` - Authentication (login, register)
- `/api/users` - User management
- `/api/products` - Product catalog
- `/api/categories` - Product categories
- `/api/orders` - Order management
- `/api/inventory` - Stock tracking
- `/api/locations` - Supply chain locations
- `/api/reviews` - Product reviews

---

## 📚 API Usage Examples

### Authentication

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@farmkart.com",
    "password": "customer123"
  }'

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "phone": "+919999999999",
    "password": "password123",
    "name": "New User",
    "roles": ["customer"]
  }'
```

### Products

```bash
# Get all products
curl http://localhost:5000/api/products

# Search products
curl "http://localhost:5000/api/products?search=wheat&status=active"

# Get product by ID
curl http://localhost:5000/api/products/[PRODUCT_ID]

# Create product (requires auth)
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Fresh Tomatoes",
    "description": "Organic tomatoes",
    "categoryId": "[CATEGORY_ID]",
    "ownerId": "[FARMER_USER_ID]",
    "basePrice": 35,
    "unit": "kg",
    "status": "active"
  }'
```

### Orders

```bash
# Get my orders
curl "http://localhost:5000/api/orders?buyerId=[USER_ID]" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "b2c",
    "buyerId": "[USER_ID]",
    "sellerId": "[FARMER_ID]",
    "orderItems": [
      {
        "productId": "[PRODUCT_ID]",
        "quantity": 5,
        "unitPrice": 50,
        "totalPrice": 250
      }
    ],
    "subtotal": 250,
    "deliveryFee": 0,
    "total": 250
  }'
```

---

## 🛠️ Development Commands

### Backend

```bash
cd backend

# Install dependencies
npm install

# Start dev server (with auto-reload)
npm run dev

# Start production server
npm start

# Seed database
npm run seed
```

### Frontend

```bash
cd React

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## 🗄️ Database Schema

### Core Collections

1. **users** - User accounts with roles
2. **farmer_profiles** - Extended farmer data
3. **business_profiles** - Business details
4. **restaurant_profiles** - Restaurant info
5. **delivery_profiles** - Delivery partner data
6. **categories** - Product taxonomy
7. **products** - Product catalog
8. **inventory_lots** - Stock by location & batch
9. **locations** - Supply chain nodes (farms, hubs, warehouses)
10. **orders** - All orders (B2C & B2B)
11. **reviews** - Product reviews & ratings
12. **price_agreements** - B2B pricing contracts
13. **shipments** - Long-haul transportation
14. **delivery_tasks** - Last-mile delivery
15. **payments** - Transaction records

See [ERD.md](./ERD.md) for complete entity-relationship diagram.

---

## 🔧 Troubleshooting

### MongoDB Connection Issues

**Problem**: `MongoDB connection error`

**Solutions**:
1. Verify MongoDB is running:
   ```bash
   mongosh
   ```

2. Check connection string in `backend/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/farmkart
   ```

3. Restart MongoDB service

### Port Already in Use

**Problem**: `Port 5000 already in use`

**Solutions**:
1. Change port in `backend/.env`:
   ```
   PORT=5001
   ```

2. Update frontend `.env`:
   ```
   VITE_API_URL=http://localhost:5001/api
   ```

3. Or kill process using port 5000:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID [PID] /F
   
   # macOS/Linux
   lsof -ti:5000 | xargs kill -9
   ```

### CORS Errors

**Problem**: `Access-Control-Allow-Origin` error

**Solution**: Backend CORS is enabled for all origins in development. If you change the frontend port, no changes needed.

### Seed Data Issues

**Problem**: Seeding fails

**Solutions**:
1. Ensure MongoDB is running
2. Drop existing database:
   ```bash
   mongosh
   use farmkart
   db.dropDatabase()
   exit
   ```
3. Run seed again:
   ```bash
   npm run seed
   ```

---

## 📖 Documentation

- **[notes.md](./notes.md)** - Platform overview, roles, features, and business logic
- **[ERD.md](./ERD.md)** - Complete entity-relationship model and database design
- **[backend/README.md](./backend/README.md)** - Backend API documentation

---

## 🚀 Deployment

### Backend Deployment

1. Set production environment variables
2. Use a MongoDB cloud service (MongoDB Atlas)
3. Deploy to:
   - Heroku
   - AWS EC2/ECS
   - Google Cloud Run
   - DigitalOcean

### Frontend Deployment

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Deploy `dist` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages

3. Update `VITE_API_URL` to production backend URL

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

## 📝 License

This project is for educational purposes as part of MSD coursework.

---

## 📚 Documentation

- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current implementation status, features, and next steps
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup and configuration guide
- **[backend/README.md](backend/README.md)** - Backend API documentation
- **[FrontEnd/README.md](FrontEnd/README.md)** - Frontend setup guide
- **[prompts/](prompts/)** - Complete implementation guides (system design, backend specs, frontend specs)

---

## 👥 Team

MSD Project - FarmKart Marketplace Platform

---

## 🎉 Success!

Your FarmKart platform is now running! 

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

Happy coding! 🌾🚜

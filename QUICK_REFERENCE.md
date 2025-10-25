# FarmKart Quick Reference

## 🚀 Start the Application

### 1. Start MongoDB
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 2. Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
**Runs on**: http://localhost:5000

### 3. Start Frontend (Terminal 2)
```bash
cd React
npm run dev
```
**Runs on**: http://localhost:5173

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@farmkart.com` | `customer123` |
| Farmer | `farmer@farmkart.com` | `farmer123` |
| Business | `business@farmkart.com` | `business123` |
| Restaurant | `restaurant@farmkart.com` | `restaurant123` |
| Delivery | `delivery@farmkart.com` | `delivery123` |
| Admin | `admin@farmkart.com` | `admin123` |

---

## 📡 API Endpoints

**Base URL**: `http://localhost:5000/api`

### Authentication
```bash
POST   /auth/login           # Login
POST   /auth/register        # Register
GET    /auth/me              # Get current user
```

### Products
```bash
GET    /products             # Get all products
GET    /products/:id         # Get product by ID
POST   /products             # Create product
PUT    /products/:id         # Update product
DELETE /products/:id         # Delete product
```

### Orders
```bash
GET    /orders               # Get all orders
GET    /orders/:id           # Get order by ID
POST   /orders               # Create order
PATCH  /orders/:id/status    # Update order status
```

### Users
```bash
GET    /users                # Get all users
GET    /users/:id            # Get user by ID
PUT    /users/:id            # Update user
DELETE /users/:id            # Delete user
```

### Categories
```bash
GET    /categories           # Get all categories
POST   /categories           # Create category
PUT    /categories/:id       # Update category
DELETE /categories/:id       # Delete category
```

### Inventory
```bash
GET    /inventory            # Get inventory lots
POST   /inventory            # Create lot
PUT    /inventory/:id        # Update lot
DELETE /inventory/:id        # Delete lot
```

### Locations
```bash
GET    /locations            # Get all locations
POST   /locations            # Create location
PUT    /locations/:id        # Update location
DELETE /locations/:id        # Delete location
```

### Reviews
```bash
GET    /reviews              # Get reviews
POST   /reviews              # Create review
```

---

## 🛠️ Development Commands

### Backend
```bash
cd backend

npm install          # Install dependencies
npm run dev          # Start dev server (auto-reload)
npm start            # Start production server
npm run seed         # Seed database
```

### Frontend
```bash
cd React

npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
```

---

## 🗄️ MongoDB Commands

```bash
# Connect to MongoDB
mongosh

# Use FarmKart database
use farmkart

# Show collections
show collections

# Count documents
db.users.countDocuments()
db.products.countDocuments()

# Find all users
db.users.find().pretty()

# Find user by email
db.users.findOne({ email: "farmer@farmkart.com" })

# Find all active products
db.products.find({ status: "active" }).pretty()

# Drop database (careful!)
db.dropDatabase()

# Exit
exit
```

---

## 📁 Project Structure

```
MSD-Project/
├── backend/              # Express.js API
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── seed/            # Database seeding
│   └── server.js        # Entry point
│
├── React/               # React frontend
│   ├── src/
│   │   ├── Components/  # UI components
│   │   ├── contexts/    # React contexts
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   └── App.jsx      # Main app
│   └── vite.config.js
│
├── notes.md            # Platform documentation
├── ERD.md              # Database design
└── README.md           # Main readme
```

---

## 🔍 Useful Queries

### Get Products with Owner Info
```javascript
// MongoDB
db.products.aggregate([
  { $lookup: {
      from: "users",
      localField: "ownerId",
      foreignField: "_id",
      as: "owner"
  }}
])
```

### API Request with curl
```bash
# Get all products
curl http://localhost:5000/api/products

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@farmkart.com","password":"customer123"}'

# Get products with auth
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

### MongoDB won't start
```bash
# Check if running
mongosh

# Kill existing process
# Windows: taskkill /F /IM mongod.exe
# macOS/Linux: killall mongod

# Restart
net start MongoDB  # Windows
brew services restart mongodb-community  # macOS
sudo systemctl restart mongod  # Linux
```

### Port already in use
```bash
# Find process using port 5000
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill process
# Windows: taskkill /PID <PID> /F
# macOS/Linux: kill -9 <PID>
```

### Clear and reseed database
```bash
cd backend

# Method 1: Using mongosh
mongosh
use farmkart
db.dropDatabase()
exit

npm run seed

# Method 2: Seed script clears automatically
npm run seed
```

### Frontend can't connect to backend
```bash
# 1. Check backend is running
curl http://localhost:5000/api/health

# 2. Check .env files
cat React/.env          # Should show: VITE_API_URL=http://localhost:5000/api
cat backend/.env        # Should show: PORT=5000

# 3. Restart both servers
```

---

## 📚 Documentation Links

- [Main README](./README.md) - Complete project overview
- [Setup Guide](./SETUP_GUIDE.md) - Step-by-step installation
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - What was built
- [Backend API Docs](./backend/README.md) - API documentation
- [Platform Notes](./notes.md) - Business logic
- [ERD](./ERD.md) - Database design

---

## 💡 Tips

### Development Workflow
1. Keep 3 terminals open: MongoDB, Backend, Frontend
2. Use MongoDB Compass for visual database inspection
3. Use browser DevTools Network tab to debug API calls
4. Check backend terminal for API logs
5. Use Postman or Thunder Client for API testing

### Code Navigation
- **Models**: `backend/models/*.model.js`
- **API Routes**: `backend/routes/*.routes.js`
- **API Service**: `React/src/services/api.js`
- **Dashboards**: `React/src/pages/dashboards/`
- **Auth**: `React/src/contexts/AuthContext.jsx`

### Hot Reload
- Backend: Uses nodemon, auto-reloads on save
- Frontend: Uses Vite HMR, instant updates
- No need to restart manually!

---

## ✅ Health Check

```bash
# Check if everything is running
curl http://localhost:5000/api/health       # Backend
curl http://localhost:5173                  # Frontend
mongosh --eval "db.version()"               # MongoDB
```

Expected responses:
- Backend: `{"status":"OK","message":"FarmKart API is running"}`
- Frontend: HTML page
- MongoDB: Version number

---

## 🎯 Quick Start (Copy-Paste)

```bash
# Terminal 1: MongoDB
net start MongoDB

# Terminal 2: Backend
cd backend && npm install && npm run seed && npm run dev

# Terminal 3: Frontend
cd React && npm install && npm run dev
```

Then open http://localhost:5173 and login!

---

**FarmKart** | Full-Stack MERN Marketplace | 2025

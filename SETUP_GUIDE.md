# FarmKart Setup Guide - Step by Step

This guide will walk you through setting up the FarmKart platform from scratch.

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js v18+** installed ([Download](https://nodejs.org/))
- [ ] **MongoDB v6+** installed ([Download](https://www.mongodb.com/try/download/community))
- [ ] **Git** (optional) ([Download](https://git-scm.com/))
- [ ] A terminal/command prompt

---

## 📦 Step 1: Install MongoDB (If Not Installed)

### Windows

1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Select "Install MongoDB as a Service"
5. Keep default data directory: `C:\Program Files\MongoDB\Server\{version}\data`

### macOS

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@6.0

# Start MongoDB as a service
brew services start mongodb-community@6.0
```

### Linux (Ubuntu/Debian)

```bash
# Import public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Verify MongoDB Installation

```bash
mongosh
# You should see MongoDB shell prompt
# Type 'exit' to exit
```

---

## 🚀 Step 2: Start MongoDB

### Windows

**Option A: If installed as service**
```cmd
net start MongoDB
```

**Option B: Run manually**
```cmd
# Create data directory if it doesn't exist
mkdir C:\data\db

# Start MongoDB
"C:\Program Files\MongoDB\Server\{version}\bin\mongod.exe" --dbpath="C:\data\db"
```

### macOS
```bash
brew services start mongodb-community
```

### Linux
```bash
sudo systemctl start mongod
```

### Verify MongoDB is Running

```bash
mongosh
# Should connect successfully
exit
```

---

## 💻 Step 3: Set Up Backend

Open your terminal in the project root directory.

```bash
# Navigate to backend folder
cd backend

# Install all dependencies (may take a few minutes)
npm install
```

### Configure Environment Variables

The `.env` file is already created with defaults:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/farmkart
JWT_SECRET=your_jwt_secret_key_change_in_production
NODE_ENV=development
```

✅ **No changes needed** unless you want to use a different port.

### Seed the Database

```bash
npm run seed
```

You should see output like:
```
✅ MongoDB connected
🗑️  Cleared existing data
👥 Created users
📦 Created categories
📍 Created locations
🌾 Created products
📊 Created inventory lots

✅ Seed data created successfully!

📧 Login Credentials:
Customer: customer@farmkart.com / customer123
Farmer: farmer@farmkart.com / farmer123
...
```

### Start the Backend Server

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📡 API available at http://localhost:5000/api
```

✅ **Backend is running!**

**Keep this terminal open.**

---

## 🎨 Step 4: Set Up Frontend

Open a **new terminal** (keep the backend terminal running).

```bash
# Navigate to React folder
cd React

# Install all dependencies (may take a few minutes)
npm install
```

### Configure Environment

The `.env` file is already created:

```env
VITE_API_URL=http://localhost:5000/api
```

✅ **No changes needed** unless you changed the backend port.

### Start the Frontend Development Server

```bash
npm run dev
```

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

✅ **Frontend is running!**

---

## 🎉 Step 5: Access the Application

Open your web browser and go to:

### **http://localhost:5173**

You should see the FarmKart landing page!

---

## 🔐 Step 6: Login

Click **"Login"** or go to http://localhost:5173/login

### Quick Login Method

1. Select a role from the dropdown (e.g., "Customer")
2. Credentials will auto-fill
3. Click "Login"

### Manual Login

Use any of these credentials:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@farmkart.com | customer123 |
| Farmer | farmer@farmkart.com | farmer123 |
| Business | business@farmkart.com | business123 |
| Restaurant | restaurant@farmkart.com | restaurant123 |
| Delivery | delivery@farmkart.com | delivery123 |
| Admin | admin@farmkart.com | admin123 |

After login, you'll be redirected to the appropriate dashboard!

---

## 🧪 Step 7: Test the Application

### Test Customer Dashboard
1. Login as Customer
2. Browse products
3. Add items to cart
4. Try the search and filter features

### Test Farmer Dashboard
1. Login as Farmer
2. View crop inventory
3. Add a new crop
4. Check orders

### Test API Directly

Open a new terminal:

```bash
# Health check
curl http://localhost:5000/api/health

# Get all products
curl http://localhost:5000/api/products

# Get categories
curl http://localhost:5000/api/categories
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: MongoDB Not Running

**Error**: `MongoNetworkError: connect ECONNREFUSED`

**Solution**:
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Issue 2: Port Already in Use

**Error**: `Port 5000 is already in use`

**Solution**:
```bash
# Find what's using the port
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill the process or change the port in backend/.env
PORT=5001
```

Then update `React/.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

### Issue 3: npm install fails

**Error**: Various npm errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json  # macOS/Linux
# OR
rmdir /s node_modules & del package-lock.json  # Windows

# Reinstall
npm install
```

### Issue 4: Frontend can't connect to backend

**Error**: Network errors or CORS errors in browser console

**Solution**:
1. Verify backend is running on port 5000
2. Check `React/.env` has correct API URL
3. Restart frontend: `Ctrl+C` then `npm run dev`

### Issue 5: Login doesn't work

**Error**: "Invalid credentials" or network error

**Solution**:
1. Make sure backend is running
2. Verify MongoDB is running and seeded
3. Re-run seed script:
   ```bash
   cd backend
   npm run seed
   ```
4. Check browser console for errors
5. Try using email exactly as shown (case-sensitive)

---

## 📊 Verify Everything is Working

### ✅ Checklist

- [ ] MongoDB is running (test with `mongosh`)
- [ ] Backend is running (http://localhost:5000/api/health returns OK)
- [ ] Frontend is running (http://localhost:5173 loads)
- [ ] Can login with any role
- [ ] Dashboard loads after login
- [ ] No errors in browser console
- [ ] No errors in backend terminal

---

## 🎓 Next Steps

Now that everything is working:

1. **Explore the codebase**
   - `backend/models/` - Database schemas
   - `backend/routes/` - API endpoints
   - `React/src/services/api.js` - API service layer
   - `React/src/pages/dashboards/` - Role dashboards

2. **Read the documentation**
   - [README.md](./README.md) - Full project overview
   - [notes.md](./notes.md) - Business logic and features
   - [ERD.md](./ERD.md) - Database design

3. **Experiment**
   - Add new products as a farmer
   - Place orders as a customer
   - Try different user roles

4. **Develop features**
   - The backend API is ready
   - Dashboards can fetch real data from API
   - Follow patterns in existing code

---

## 🆘 Still Having Issues?

1. Check all terminals for error messages
2. Verify all prerequisites are installed
3. Make sure no other applications are using ports 5000 or 5173
4. Try restarting MongoDB, backend, and frontend
5. Check MongoDB logs for connection issues

---

## 🎊 Success!

Your FarmKart platform is now fully operational!

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **MongoDB**: localhost:27017/farmkart

Enjoy developing! 🌾🚜

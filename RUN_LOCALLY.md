# 🚀 Run FarmKart Locally - Complete Guide

## 📋 Prerequisites

- ✅ Node.js installed (v18 or higher)
- ✅ MongoDB database seeded (already done!)
- ✅ npm packages installed

---

## 🔧 Step 1: Setup Backend Environment

### Create backend/.env file

Copy this content to `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://RamaKrishna_Reddy:12345@msd.ivea6xc.mongodb.net/farmkart?retryWrites=true&w=majority
JWT_SECRET=4e912d1390cdaacef0f20239169ff2c92cec716b913011c1de2c6eccb36c07f6a472974ea6829b7d8d004912b24b928e1acb5df6ee6d9c4c5b46063f4f611d90
JWT_EXPIRE=7d
ENABLE_SCHEDULER=true
```

---

## 🔧 Step 2: Setup Frontend Environment

### Create FrontEnd/.env file

Copy this content to `FrontEnd/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Step 3: Start Backend Server

Open **Terminal 1**:

```bash
cd backend
npm install
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📡 API available at http://localhost:5000/api
✅ MongoDB connected successfully
🔒 Security: Helmet enabled, Rate limiting active
```

---

## 🚀 Step 4: Start Frontend Server

Open **Terminal 2** (new terminal):

```bash
cd FrontEnd
npm install
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🌐 Step 5: Access Your Application

### Frontend
Open browser: **http://localhost:5173**

### Backend API
Test: **http://localhost:5000/api/health**

---

## 🧪 Test Login

1. Go to: http://localhost:5173
2. You'll see demo account cards
3. Click any demo account (e.g., "Admin")
4. Credentials auto-fill:
   - Email: `admin@farmkart.com`
   - Password: `Admin@123`
5. Click Login
6. Explore the app!

---

## 📋 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@farmkart.com` | `Admin@123` |
| Customer | `customer@farmkart.com` | `Customer@123` |
| Farmer | `farmer@farmkart.com` | `Farmer@123` |
| Business | `business@farmkart.com` | `Business@123` |
| Restaurant | `restaurant@farmkart.com` | `Restaurant@123` |
| Large Delivery | `delivery.large@farmkart.com` | `Delivery@123` |
| Small Delivery | `delivery.small@farmkart.com` | `Delivery@123` |

---

## 🔍 Troubleshooting

### Backend won't start

**Error: Cannot find module**
```bash
cd backend
npm install
```

**Error: MongoDB connection failed**
- Check `.env` file exists in `backend/` folder
- Verify `MONGODB_URI` is correct

**Port 5000 already in use**
- Change `PORT=5001` in `backend/.env`
- Update `VITE_API_URL=http://localhost:5001/api` in `FrontEnd/.env`

---

### Frontend won't start

**Error: Cannot find module**
```bash
cd FrontEnd
npm install
```

**Error: API calls failing**
- Make sure backend is running first
- Check `FrontEnd/.env` has correct `VITE_API_URL`
- Restart frontend after changing `.env`

**Port 5173 already in use**
- Vite will automatically use next available port
- Or kill the process using port 5173

---

### CORS Errors

If you see CORS errors in browser console:
- Make sure backend is running on `http://localhost:5000`
- Backend already allows `localhost:5173` in CORS config
- Restart both servers

---

## 📝 Quick Commands

### Start Both Servers (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd FrontEnd
npm run dev
```

---

## 🛑 Stop Servers

Press `Ctrl + C` in each terminal to stop the servers.

---

## 🎯 What You Should See

### Backend Terminal
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📡 API available at http://localhost:5000/api
🔒 Security: Helmet enabled, Rate limiting active
🌍 Environment: development
🚀 Starting recurring order scheduler...
🚀 Starting inventory cleanup scheduler...
```

### Frontend Terminal
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### Browser
- Login page with demo account cards
- Click card → credentials auto-fill
- Login works
- Products page loads
- All features functional

---

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

---

## 📦 Features to Test

- ✅ Login with demo accounts
- ✅ Browse products
- ✅ View product details
- ✅ Add to cart
- ✅ Place orders
- ✅ View profile
- ✅ Admin dashboard (login as admin)
- ✅ Farmer product management (login as farmer)

---

**Ready to run! Follow the steps above!** 🎉

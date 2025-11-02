# 🎯 Quick Deployment Setup - Your Configuration

## 📍 Current Status

✅ **Frontend:** https://msd-project-farmkart.netlify.app/ (Deployed on Netlify)  
⏳ **Backend:** Ready to deploy to Vercel  
✅ **Database:** MongoDB Atlas (Cloud)

---

## 🚀 Deploy Backend to Vercel (5 Minutes)

### Fill the Vercel Form with These Values:

#### **1. Project Name:**
```
farmkart-backend
```

#### **2. Framework Preset:**
```
Other
```

#### **3. Root Directory:**
```
backend
```
⚠️ **Important:** Click "Edit" and change from `./` to `backend`

#### **4. Build Command:**
```
npm install
```
(or leave empty)

#### **5. Environment Variables:**

Click **"+ Add More"** for each variable:

##### Variable 1:
```
Key:   NODE_ENV
Value: production
```

##### Variable 2:
```
Key:   MONGODB_URI
Value: mongodb+srv://ramakrishna:ramakrishna@msd.ivea6xc.mongodb.net/farmkart?retryWrites=true&w=majority
```

##### Variable 3 (Generate new secret recommended):
```
Key:   JWT_SECRET
Value: 8f7e6d5c4b3a2910fedcba9876543210abcdef1234567890fedcba9876543210
```

To generate a new secure secret, run in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

##### Variable 4:
```
Key:   JWT_EXPIRE
Value: 7d
```

##### Variable 5 (Your Netlify URL is included):
```
Key:   ALLOWED_ORIGINS
Value: https://msd-project-farmkart.netlify.app,http://localhost:5173,http://localhost:5175
```

---

## ✅ After Backend Deployment

### You'll get a URL like:
```
https://farmkart-backend.vercel.app
```

### Then Update Netlify:

1. **Go to:** https://app.netlify.com/sites/msd-project-farmkart/settings/deploys#environment

2. **Add Environment Variable:**
   ```
   Key:   VITE_API_BASE_URL
   Value: https://farmkart-backend.vercel.app/api
   ```
   (Replace with your actual Vercel URL)

3. **Trigger Redeploy:**
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**

---

## 🧪 Test Everything

### 1. Test Backend:
```
https://your-backend.vercel.app/api/categories
```
Should return JSON with categories.

### 2. Test Frontend:
1. Open: https://msd-project-farmkart.netlify.app/
2. Login:
   ```
   Email: restaurant@farmkart.com
   Password: restaurant123
   ```
3. Should see dashboard with data from cloud!

---

## ⚠️ Don't Forget MongoDB Atlas

**Before deploying:**

1. Go to: https://cloud.mongodb.com
2. **Network Access** → **Add IP Address**
3. Select: **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

This allows Vercel to connect to your database.

---

## 📋 Quick Checklist

Before clicking "Deploy" on Vercel:

- [ ] Root Directory = `backend`
- [ ] 5 environment variables added
- [ ] MongoDB Atlas allows 0.0.0.0/0
- [ ] ALLOWED_ORIGINS includes your Netlify URL

After Backend Deployment:

- [ ] Copy Vercel backend URL
- [ ] Add VITE_API_BASE_URL to Netlify
- [ ] Redeploy Netlify site
- [ ] Test login on Netlify site

---

## 🎉 Success!

When working correctly:
- ✅ Netlify frontend loads
- ✅ Login works
- ✅ Dashboard shows real data
- ✅ Can place orders
- ✅ Orders save to MongoDB

---

## 🔗 Your Links

- **Frontend:** https://msd-project-farmkart.netlify.app/
- **Netlify Dashboard:** https://app.netlify.com/sites/msd-project-farmkart
- **Backend:** (Will be: https://farmkart-backend.vercel.app)
- **MongoDB:** https://cloud.mongodb.com

---

## 📞 Need Help?

If you see errors:
1. Check browser console (F12)
2. Check Vercel deployment logs
3. Verify MongoDB allows all IPs
4. Make sure VITE_API_BASE_URL is set in Netlify

**Ready to deploy? Go to:** https://vercel.com/new and fill the form with values above! 🚀

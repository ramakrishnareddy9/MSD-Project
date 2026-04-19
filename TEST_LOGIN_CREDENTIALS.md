# Test Login Credentials (All Services)

This file lists the existing test users from backend seed files.
Use the credential set that matches the seed command you ran.

## 1) If you ran `npm run seed:json`
Source: `backend/seed/local_db.json` via `backend/seed/seedFromJson.js`

| Service / Role | Name | Login ID (Email) | Password |
|---|---|---|---|
| Admin | Admin User | admin@farmkart.com | admin123 |
| Customer | Aarav Customer | customer@farmkart.com | customer123 |
| Farmer | Rohan Farmer | farmer1@farmkart.com | farmer123 |
| Farmer | Suman Farmer | farmer2@farmkart.com | farmer123 |
| Business | Fresh Mart Pvt Ltd | business@farmkart.com | business123 |
| Restaurant | Green Cuisine | restaurant@farmkart.com | restaurant123 |
| Delivery | Swift Logistics | delivery@farmkart.com | delivery123 |

## 2) If you ran `npm run seed`
Source: `backend/seed/seedData.js`

| Service / Role | Name | Login ID (Email) | Password |
|---|---|---|---|
| Admin | Admin User | admin@farmkart.com | admin123 |
| Customer | John Customer | customer@farmkart.com | customer123 |
| Farmer | Ramesh Patel | farmer@farmkart.com | farmer123 |
| Business | Fresh Mart Pvt Ltd | business@farmkart.com | business123 |
| Restaurant | Green Cuisine Restaurant | restaurant@farmkart.com | restaurant123 |
| Delivery | Fast Logistics | delivery@farmkart.com | delivery123 |

## 3) If you ran complete demo seed script
Source: `backend/seed/seedComplete.js`

| Service / Role | Login ID (Email) | Password |
|---|---|---|
| Admin | admin@farmkart.com | Admin@123 |
| Customer | customer@farmkart.com | Customer@123 |
| Farmer | farmer@farmkart.com | Farmer@123 |
| Business | business@farmkart.com | Business@123 |
| Restaurant | restaurant@farmkart.com | Restaurant@123 |
| Delivery (Large) | delivery.large@farmkart.com | Delivery@123 |
| Delivery (Small) | delivery.small@farmkart.com | Delivery@123 |

## 4) If you ran `npm run seed:local`
Source: `backend/seed/seedInitialData.js`
Default password for ALL users in this seed: `password123`

Important: this seed mode does NOT create an admin account.

### Farmers
- farmer1@farmkart.local
- farmer2@farmkart.local
- farmer3@farmkart.local
- farmer4@farmkart.local
- farmer5@farmkart.local

### Businesses
- business1@farmkart.local
- business2@farmkart.local
- business3@farmkart.local

### Restaurants
- restaurant1@farmkart.local
- restaurant2@farmkart.local

### Travel Agency
- travelagency@farmkart.local

### Delivery Partners
- delivery@farmkart.com / delivery123
- delivery.large@farmkart.local / password123
- delivery.small@farmkart.local / password123

### Customers
- customer1@farmkart.local
- customer2@farmkart.local
- customer3@farmkart.local
- customer4@farmkart.local
- customer5@farmkart.local
- customer6@farmkart.local
- customer7@farmkart.local
- customer8@farmkart.local
- customer9@farmkart.local
- customer10@farmkart.local

## Quick Tip
If login fails, you are likely using credentials from a different seed mode.
Re-seed with your target command and retry.

## Current Local DB Status (verified)
- MongoDB in use: `mongodb://127.0.0.1:27017/farmkart`
- Admin users currently present: `admin@farmkart.com`
- Admin login (manually created): `admin@farmkart.com` / `admin123`
- Working login example: `farmer1@farmkart.local` / `password123`
- Working delivery login: `delivery@farmkart.com` / `delivery123`

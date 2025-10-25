# FarmKart Backend API

Backend API server for FarmKart marketplace platform built with Express.js and MongoDB.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher) - running locally on default port 27017

## Installation

```bash
cd backend
npm install
```

## Configuration

Create a `.env` file in the backend directory (already created):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/farmkart
JWT_SECRET=your_jwt_secret_key_change_in_production
NODE_ENV=development
```

## Running the Server

### 1. Start MongoDB

Make sure MongoDB is running on your local machine:

```bash
# Windows (if installed as service)
net start MongoDB

# Or run mongod directly
mongod
```

### 2. Seed the Database

```bash
npm run seed
```

This will populate the database with sample data including:
- Users (customer, farmer, business, restaurant, delivery, admin)
- Products
- Categories
- Locations
- Inventory

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Orders
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status

### Inventory
- `GET /api/inventory` - Get inventory lots
- `GET /api/inventory/:id` - Get lot by ID
- `POST /api/inventory` - Create inventory lot
- `PUT /api/inventory/:id` - Update lot
- `DELETE /api/inventory/:id` - Delete lot

### Locations
- `GET /api/locations` - Get all locations
- `GET /api/locations/:id` - Get location by ID
- `POST /api/locations` - Create location
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Reviews
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review

## Default User Credentials

After seeding, use these credentials to login:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@farmkart.com | customer123 |
| Farmer | farmer@farmkart.com | farmer123 |
| Business | business@farmkart.com | business123 |
| Restaurant | restaurant@farmkart.com | restaurant123 |
| Delivery | delivery@farmkart.com | delivery123 |
| Admin | admin@farmkart.com | admin123 |

## Project Structure

```
backend/
├── models/           # Mongoose schemas
├── routes/           # API route handlers
├── seed/            # Database seeding scripts
├── server.js        # Express app setup
├── package.json     # Dependencies
└── .env             # Environment variables
```

## Technologies Used

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests

## Notes

- The API uses JWT authentication (tokens expire in 7 days)
- All passwords are hashed using bcryptjs
- MongoDB connection uses localhost:27017 by default
- CORS is enabled for all origins in development

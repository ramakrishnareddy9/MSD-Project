# Backend Guide

## Overview

Backend is an Express + MongoDB API in `backend/` with:
- Authentication and authorization
- Product, cart, wishlist, order, payment, delivery, community modules
- Analytics endpoints
- Socket.IO real-time notifications

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth (cookie-based)
- Socket.IO server

## Entry Point

- Main file: `backend/server.js`
- Runs API routes under `/api/*`
- Connects to MongoDB via `process.env.MONGODB_URI`

## Key Scripts

- `npm start`: start backend
- `npm run dev`: start backend with nodemon
- `npm run seed`: seed using `seedData.js`
- `npm run seed:json`: seed using `seedFromJson.js`
- `npm run seed:local`: seed local demo dataset (`seedInitialData.js`)

## Environment

Use `backend/.env` (local example):

- `NODE_ENV=development`
- `PORT=5000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/farmkart`
- `JWT_SECRET=<strong_secret>`
- `JWT_EXPIRE=7d`

## Core Route Groups

- `/api/auth`
- `/api/users`
- `/api/products`
- `/api/orders`
- `/api/cart`
- `/api/wishlist`
- `/api/notifications`
- `/api/delivery`
- `/api/communities`
- `/api/analytics`

## Health Check

- `GET /api/health`

## Real-Time Notifications

- Socket server initialized in `server.js`
- Notification fan-out via `backend/utils/notification.util.js`
- Events include user-specific `notification:new`

## Common Troubleshooting

1. `ERR_CONNECTION_REFUSED` from frontend:
   - Ensure backend is running on port 5000.
   - Check `GET http://localhost:5000/api/health`.

2. `EADDRINUSE: 5000`:
   - Another process is already using port 5000.
   - Stop old process or change backend port.

3. Login fails:
   - Ensure DB seeded with expected seed mode.
   - Use matching credentials from `TEST_LOGIN_CREDENTIALS.md`.

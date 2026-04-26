# MSD-Project (FarmKart)

FarmKart is a full-stack agriculture commerce and logistics platform built to connect the food supply chain on one system.

## Core Idea

The core idea is to reduce friction between producers and buyers by creating one digital ecosystem where:
- farmers can list and manage produce,
- businesses and restaurants can discover and order inventory,
- delivery partners can fulfill movement of goods,
- admins can monitor operations,
- all users receive updates through a unified notification and workflow model.

Instead of disconnected tools for cataloging, ordering, communication, and delivery coordination, FarmKart combines these flows into one role-based platform.

## What Problem This Project Solves

Agriculture and food procurement workflows are often fragmented across phone calls, spreadsheets, and separate apps. This causes:
- delayed order processing,
- unclear inventory ownership and status,
- poor visibility for stakeholders,
- weak coordination between order and delivery lifecycles.

FarmKart addresses this by centralizing product management, order orchestration, user roles, and real-time notifications in one application.

## Who Uses FarmKart

The project supports multi-role dashboards and permissions for:
- Customer
- Farmer
- Business
- Restaurant
- Delivery
- Community
- Admin

Each role gets tailored access to relevant data, actions, and decision-making screens.

## Key Functional Areas

- Authentication and authorization with secure session handling
- Product catalog and category management
- Cart, wishlist, and order lifecycle flows
- Inventory and lot management
- Delivery task and vehicle support
- Community modules and announcements
- Notifications with real-time updates (Socket.IO)
- Analytics endpoints for operational insights

## High-Level Architecture

- Frontend: React + Vite, role-based dashboards, API integration, realtime listeners
- Backend: Node.js + Express API, modular routes/controllers/services
- Database: MongoDB with Mongoose models
- Realtime: Socket.IO for push notifications and dashboard refresh triggers

## Repository Structure

- `backend/`: Express API, MongoDB models, route/controller/service layers, seed scripts
- `FrontEnd/`: React/Vite application, contexts, hooks, role dashboards
- `TEST_LOGIN_CREDENTIALS.md`: test credentials by seed mode
- `BACKEND_GUIDE.md`: backend architecture and runtime details
- `FRONTEND_GUIDE.md`: frontend architecture and runtime details

## Getting Started (Local)

Prerequisites:
- Node.js 18+
- npm
- MongoDB running locally (default URI: `mongodb://127.0.0.1:27017/farmkart`)

Run backend:
1. `cd backend`
2. `npm install`
3. Configure `.env` for local MongoDB and API settings
4. `npm run seed:local` (or your preferred seed mode)
5. `npm start`

Run frontend:
1. `cd FrontEnd`
2. `npm install`
3. `npm run dev`

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Auth OTP Delivery Configuration

Email verification OTPs are generated as 6-digit codes, stored as SHA-256 hashes, and sent through configured delivery channels.

### Email Channel (SMTP)

Set these backend environment variables to enable OTP delivery by email:

- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: SMTP port (usually `587` or `465`)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `MAIL_FROM`: Optional sender address (falls back to `SMTP_USER`)

### Optional SMS Channel (Webhook)

Set these backend environment variables to enable OTP delivery by SMS via webhook:

- `SMS_WEBHOOK_URL`: HTTPS endpoint that dispatches SMS
- `SMS_WEBHOOK_TOKEN`: Optional bearer token sent as `Authorization: Bearer <token>`

Webhook request body sent by backend:

```json
{
	"to": "+911234567890",
	"otp": "123456",
	"purpose": "email_verification",
	"message": "Your FarmKart verification code is 123456. It expires in 10 minutes."
}
```

### Production Behavior

- In production, registration/resend OTP will fail if neither email nor SMS delivery succeeds.
- In non-production, the API response can include `verificationOtp` for local testing.

## Quick Troubleshooting

- `ERR_CONNECTION_REFUSED` on frontend usually means backend is not running or not reachable.
- Login failures are commonly caused by credential/seed-mode mismatch.
- Use `TEST_LOGIN_CREDENTIALS.md` as the source of truth for test accounts.

## Additional Documentation

- Credentials: `TEST_LOGIN_CREDENTIALS.md`
- Backend guide: `BACKEND_GUIDE.md`
- Frontend guide: `FRONTEND_GUIDE.md`

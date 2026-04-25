# Frontend Guide

## Overview

Frontend is a React + Vite app in `FrontEnd/` with role-based dashboards:
- Admin
- Customer
- Farmer
- Business
- Restaurant
- Delivery
- Community

## Tech Stack

- React 19
- Vite
- MUI components
- Recharts
- Socket.IO client for real-time notification updates

## Run Frontend

1. `cd FrontEnd`
2. `npm install`
3. `npm run dev`

Default local URL: `http://localhost:5173`

## API Integration

- API layer file: `FrontEnd/src/services/api.js`
- Uses `import.meta.env` for config
- Sends cookie credentials (`credentials: include`)
- Includes silent refresh behavior for 401 responses

## Auth Flow

- Auth context: `FrontEnd/src/contexts/AuthContext.jsx`
- Checks session with `/api/auth/me`
- Login and register call backend auth endpoints

## Notifications and Realtime

- Notification provider: `FrontEnd/src/contexts/NotificationContext.jsx`
- Socket client: `FrontEnd/src/services/socket.js`
- Dashboard hook: `FrontEnd/src/hooks/useRealtimeNotifications.js`

## Important Config

`FrontEnd/src/services/api.js` resolves backend from:
- `VITE_API_BASE_URL`, else
- `VITE_API_URL`, else
- `http://localhost:5000/api`

If backend runs elsewhere, set env vars accordingly.

## Common Troubleshooting

1. `Failed to fetch` / `ERR_CONNECTION_REFUSED`:
   - Backend not running or wrong API URL.
   - Verify `http://localhost:5000/api/health`.

2. Login does not work:
   - Confirm correct credential set for seeded DB.
   - See `TEST_LOGIN_CREDENTIALS.md`.

3. Realtime updates not appearing:
   - Ensure backend socket server is running.
   - Confirm browser can connect to backend host/port.

import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

const AUTH_COOKIE_NAME = 'farmkart_token';

let ioInstance = null;

const parseCookies = (cookieHeader = '') => {
  return String(cookieHeader || '')
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((accumulator, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = decodeURIComponent(pair.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(pair.slice(separatorIndex + 1).trim());
      accumulator[key] = value;
      return accumulator;
    }, {});
};

const getSocketUser = (socket) => {
  if (!process.env.JWT_SECRET) {
    return null;
  }

  const cookies = parseCookies(socket.request.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return null;
    }

    return {
      id: String(decoded.userId),
      roles: Array.isArray(decoded.roles) ? decoded.roles : []
    };
  } catch {
    return null;
  }
};

export const initializeSocketServer = (httpServer, corsOrigin) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true
    }
  });

  ioInstance.use((socket, next) => {
    socket.data.user = getSocketUser(socket);
    next();
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.data.user;

    if (user?.id) {
      socket.join(`user:${user.id}`);

      for (const role of user.roles || []) {
        socket.join(`role:${role}`);
      }
    }
  });

  return ioInstance;
};

const normalizeUserIds = (userIds = []) => {
  return [...new Set((userIds || []).map((value) => String(value || '').trim()).filter(Boolean))];
};

const emitToUsers = (userIds, eventName, payload) => {
  if (!ioInstance) {
    return;
  }

  const normalizedUserIds = normalizeUserIds(userIds);
  normalizedUserIds.forEach((userId) => {
    ioInstance.to(`user:${userId}`).emit(eventName, payload);
  });
};

export const emitRealtimeNotification = (userIds, payload) => {
  const normalizedPayload = {
    ...payload,
    id: payload?.id || payload?._id || null,
    createdAt: payload?.createdAt || new Date().toISOString()
  };

  emitToUsers(userIds, 'notification:new', normalizedPayload);

  if (normalizedPayload.realtimeEvent) {
    emitToUsers(userIds, normalizedPayload.realtimeEvent, normalizedPayload);
  }
};

export const getSocketServer = () => ioInstance;
import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

let socketInstance = null;

export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new'
};

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
  }

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
};
import { useEffect, useRef } from 'react';
import { connectSocket, SOCKET_EVENTS } from '../services/socket';

export const useRealtimeNotifications = ({ enabled = true, onNotification } = {}) => {
  const handlerRef = useRef(onNotification);

  useEffect(() => {
    handlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const socket = connectSocket();
    const handleNotification = (payload) => {
      if (typeof handlerRef.current === 'function') {
        handlerRef.current(payload);
      }
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotification);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNotification);
    };
  }, [enabled]);
};
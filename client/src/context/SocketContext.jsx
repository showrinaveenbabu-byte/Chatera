import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { SOCKET_SERVER_URL } from '../utils/api';

export const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const socketRef = useRef(null);

  const currentUserId = (user?.id || user?._id)?.toString();

  useEffect(() => {
    if (!currentUserId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to server (dynamic host, supports fallback to REST when socket server is unavailable)
    const s = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = s;
    setSocket(s);

    const onConnect = () => {
      console.log('[SocketContext] Connected to socket server with id:', s.id);
      setConnected(true);
      s.emit('register-user', currentUserId);
    };

    const onDisconnect = (reason) => {
      console.log('[SocketContext] Socket disconnected:', reason);
      setConnected(false);
    };

    const onConnectError = (err) => {
      // Graceful error logging - the app operates with REST API fallback when socket is unavailable
      console.warn('[SocketContext] Socket connection unavailable, fallback active:', err.message);
      setConnected(false);
    };

    s.on('connect', onConnect);
    s.on('reconnect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    if (s.connected) {
      onConnect();
    }

    return () => {
      s.off('connect', onConnect);
      s.off('reconnect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        hasUnreadChats,
        setHasUnreadChats,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

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

    // Connect to server
    const s = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;
    setSocket(s);

    const onConnect = () => {
      console.log('[SocketContext] Connected to socket server with id:', s.id);
      setConnected(true);
      s.emit('register-user', currentUserId);
    };

    const onDisconnect = () => {
      console.log('[SocketContext] Socket disconnected');
      setConnected(false);
    };

    s.on('connect', onConnect);
    s.on('reconnect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) {
      onConnect();
    }

    return () => {
      s.off('connect', onConnect);
      s.off('reconnect', onConnect);
      s.off('disconnect', onDisconnect);
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

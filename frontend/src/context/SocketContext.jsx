import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import AuthContext from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, user } = useContext(AuthContext);

  useEffect(() => {
    let newSocket;

    if (isAuthenticated && user) {
      // Initialize socket connection
      newSocket = io(SOCKET_URL);

      // Set up event handlers
      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected:', newSocket.id);
        
        // Join with user data
        newSocket.emit('join', { userId: user.id });
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        console.log('Socket disconnected');
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);
    }

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  // Join a chat room
  const joinRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('joinRoom', roomId);
    }
  };

  // Leave a chat room
  const leaveRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('leaveRoom', roomId);
    }
  };

  // Send a message
  const sendMessage = (roomId, message) => {
    if (socket && connected && user) {
      socket.emit('sendMessage', {
        roomId,
        message,
        sender: user.id
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        joinRoom,
        leaveRoom,
        sendMessage
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
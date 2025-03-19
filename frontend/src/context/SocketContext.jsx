// frontend/src/context/SocketContext.jsx
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

  // Join a conversation
  const joinConversation = (conversationId) => {
    if (socket && connected) {
      socket.emit('joinConversation', conversationId);
    }
  };

  // Leave a conversation
  const leaveConversation = (conversationId) => {
    if (socket && connected) {
      socket.emit('leaveConversation', conversationId);
    }
  };

  // Send a message in a conversation
  const sendMessage = (conversationId, message) => {
    if (socket && connected && user) {
      socket.emit('sendDirectMessage', {
        conversationId,
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
        joinConversation,
        leaveConversation,
        sendMessage
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
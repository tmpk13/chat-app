// frontend/src/context/SocketContext.jsx (with debugging)
import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import AuthContext from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, user } = useContext(AuthContext);

  console.log('Rendering SocketContext provider');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('User:', user);

  useEffect(() => {
    let newSocket;

    if (isAuthenticated && user) {
      console.log('Initializing socket connection');
      // Initialize socket connection
      newSocket = io(SOCKET_URL);

      // Set up event handlers
      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected:', newSocket.id);
        
        // Join with user data
        newSocket.emit('join', { userId: user.id });
        console.log('Emitted join event with userId:', user.id);
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
        console.log('Cleaning up socket connection');
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  // Join a conversation
  const joinConversation = (conversationId) => {
    if (socket && connected) {
      console.log('Joining conversation:', conversationId);
      socket.emit('joinConversation', conversationId);
    } else {
      console.warn('Cannot join conversation - socket not connected');
    }
  };

  // Leave a conversation
  const leaveConversation = (conversationId) => {
    if (socket && connected) {
      console.log('Leaving conversation:', conversationId);
      socket.emit('leaveConversation', conversationId);
    } else {
      console.warn('Cannot leave conversation - socket not connected');
    }
  };

  // Send a message in a conversation
  const sendMessage = (conversationId, message) => {
    if (socket && connected && user) {
      console.log('Sending message in conversation:', conversationId);
      socket.emit('sendDirectMessage', {
        conversationId,
        message,
        sender: user.id
      });
    } else {
      console.warn('Cannot send message - socket not connected');
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
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const chatRoomRoutes = require('./routes/chatRoomRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"], // Add all possible frontend URLs
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"]
}));
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chatrooms', chatRoomRoutes);
app.use('/api/conversations', conversationRoutes);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Socket.io connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // Handle user joining
  socket.on('join', (userData) => {
    connectedUsers.set(userData.userId, socket.id);
    console.log(`User ${userData.userId} joined with socket ${socket.id}`);
  });

  // Handle joining a chat room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Handle leaving a chat room
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  // Handle joining a conversation
  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Handle leaving a conversation
  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Handle new message in chat room
  socket.on('sendMessage', async (messageData) => {
    try {
      const { roomId, message, sender } = messageData;
      
      // Save message to database
      const Message = require('./models/Message');
      const newMessage = new Message({
        chatRoom: roomId,
        sender: sender,
        content: message,
        timestamp: new Date()
      });
      
      await newMessage.save();
      await newMessage.populate('sender', 'firstName lastName');
      
      // Broadcast message to room
      io.to(roomId).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle new direct message
  socket.on('sendDirectMessage', async (messageData) => {
    try {
      const { conversationId, message } = messageData;
      
      // No need to save the message here as it's already saved via the API
      // Just broadcast it to the conversation room for real-time updates
      
      io.to(`conversation-${conversationId}`).emit('newMessage', message);
      console.log(`Broadcasted message to conversation-${conversationId}:`, message);
    } catch (error) {
      console.error('Error sending direct message:', error);
      socket.emit('error', { message: 'Failed to send direct message' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove user from connected users
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    console.log('Client disconnected', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server };
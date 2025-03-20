const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

describe('Socket.io Tests', () => {
  let io, clientSocket, serverSocket;
  let port = 5001; // Use a different port than the main app
  
  beforeAll(async () => {
    // Create test server with socket.io
    const httpServer = createServer();
    io = new Server(httpServer);
    
    // Event handlers for connections
    io.on('connection', (socket) => {
      serverSocket = socket;
      
      // Handle joining a chat room
      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
      });
      
      // Handle sending messages
      socket.on('sendMessage', (messageData) => {
        io.to(messageData.roomId).emit('newMessage', messageData);
      });
      
      // Handle direct messages
      socket.on('sendDirectMessage', (messageData) => {
        io.to(`conversation-${messageData.conversationId}`).emit('newMessage', messageData);
      });
    });
    
    // Start server
    await new Promise((resolve) => {
      httpServer.listen(port, resolve);
    });
  });
  
  afterAll(async () => {
    // Cleanup
    if (io) {
      io.close();
    }
    if (clientSocket) {
      clientSocket.close();
    }
  });
  
  beforeEach((done) => {
    // Create a fresh client socket for each test
    clientSocket = Client(`http://localhost:${port}`);
    clientSocket.on('connect', done);
  });
  
  afterEach(() => {
    // Close client socket after each test
    if (clientSocket) {
      clientSocket.close();
    }
  });
  
  it('should establish a connection', () => {
    expect(clientSocket.connected).toBe(true);
  });
  
  it('should handle joining a room', (done) => {
    const roomId = 'test-room-id';
    
    // Listen for event on server side
    serverSocket.on('joinRoom', (receivedRoomId) => {
      expect(receivedRoomId).toBe(roomId);
      done();
    });
    
    // Emit event from client
    clientSocket.emit('joinRoom', roomId);
  });
  
  it('should handle sending and receiving messages', (done) => {
    const roomId = 'test-room-id';
    const messageData = {
      roomId,
      message: 'Hello, this is a test message',
      sender: new mongoose.Types.ObjectId().toString()
    };
    
    // Join the room first
    clientSocket.emit('joinRoom', roomId);
    
    // Listen for new messages
    clientSocket.on('newMessage', (receivedMessage) => {
      expect(receivedMessage).toEqual(messageData);
      done();
    });
    
    // After a brief delay to ensure room joining completed
    setTimeout(() => {
      // Send a message
      clientSocket.emit('sendMessage', messageData);
    }, 50);
  });
  
  it('should handle direct messages', (done) => {
    const conversationId = 'test-conversation-id';
    const messageData = {
      conversationId,
      message: 'Hello, this is a direct message',
      sender: new mongoose.Types.ObjectId().toString()
    };
    
    // Join the conversation room
    clientSocket.emit('joinConversation', conversationId);
    
    // Listen for direct messages
    clientSocket.on('newMessage', (receivedMessage) => {
      expect(receivedMessage).toEqual(messageData);
      done();
    });
    
    // After a brief delay to ensure room joining completed
    setTimeout(() => {
      // Send a direct message
      clientSocket.emit('sendDirectMessage', messageData);
    }, 50);
  });
});
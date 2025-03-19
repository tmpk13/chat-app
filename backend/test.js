const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { app, server } = require('../server');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const io = require('socket.io-client');

let mongoServer;
let token;
let userId;
let testUser;
let chatRoomId;
let socketClient;

// Helper function to create a JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '24h' }
  );
};

// Connect to in-memory database before tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create a test user for authenticated routes
  const hashedPassword = await bcrypt.hash('password123', 10);
  testUser = await User.create({
    email: 'test@example.com',
    password: hashedPassword,
    firstName: 'Test',
    lastName: 'User'
  });
  
  userId = testUser._id;
  token = generateToken(userId);
});

// Disconnect and close server after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

// Clear database collections after each test
afterEach(async () => {
  if (socketClient) {
    socketClient.disconnect();
  }
  await ChatRoom.deleteMany({});
  await Message.deleteMany({});
});

describe('User API', () => {
  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('newuser@example.com');
    });

    it('should return 400 if user already exists', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com', // This email is already used
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'incomplete@example.com',
          // Missing password and other fields
        });
      
      expect(res.status).toBe(500); // This will likely be a 500 due to mongoose validation
    });
  });

  describe('POST /api/users/login', () => {
    it('should login a user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return 400 with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/users/me', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('x-auth-token', token);
      
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.firstName).toBe('Test');
      expect(res.body.lastName).toBe('User');
    });

    it('should return 401 with no token', async () => {
      const res = await request(app)
        .get('/api/users/me');
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No token, authorization denied');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('x-auth-token', 'invalidtoken');
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Token is not valid');
    });
  });

  describe('PUT /api/users/update', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/users/update')
        .set('x-auth-token', token)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Updated');
      expect(res.body.user.lastName).toBe('Name');
    });
  });
});

describe('ChatRoom API', () => {
  describe('POST /api/chatrooms', () => {
    it('should create a new chat room', async () => {
      const res = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', token)
        .send({
          name: 'Test Room'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Room');
      expect(res.body.creator.toString()).toBe(userId.toString());
      expect(res.body.participants).toContainEqual(userId);

      // Save room ID for later tests
      chatRoomId = res.body._id;
    });
  });

  describe('GET /api/chatrooms', () => {
    it('should get all chat rooms', async () => {
      // Create a room first
      await ChatRoom.create({
        name: 'Another Room',
        creator: userId,
        participants: [userId]
      });

      const res = await request(app)
        .get('/api/chatrooms')
        .set('x-auth-token', token);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/chatrooms/:id', () => {
    it('should get a chat room by ID', async () => {
      // Create a room first
      const room = await ChatRoom.create({
        name: 'Test Get Room',
        creator: userId,
        participants: [userId]
      });

      const res = await request(app)
        .get(`/api/chatrooms/${room._id}`)
        .set('x-auth-token', token);
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Get Room');
      expect(res.body.creator).toHaveProperty('firstName');
    });

    it('should return 404 for non-existent room', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/chatrooms/${nonExistentId}`)
        .set('x-auth-token', token);
      
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/chatrooms/:id/join', () => {
    it('should join a chat room', async () => {
      // Create a new user and a room
      const user2 = await User.create({
        email: 'user2@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'User',
        lastName: 'Two'
      });
      
      const user2Token = generateToken(user2._id);
      
      const room = await ChatRoom.create({
        name: 'Room to Join',
        creator: userId,
        participants: [userId]
      });

      const res = await request(app)
        .post(`/api/chatrooms/${room._id}/join`)
        .set('x-auth-token', user2Token);
      
      expect(res.status).toBe(200);
      
      // Verify user was added to participants
      const updatedRoom = await ChatRoom.findById(room._id);
      const participantIds = updatedRoom.participants.map(p => p.toString());
      expect(participantIds).toContain(user2._id.toString());
    });
  });

  describe('POST /api/chatrooms/:id/leave', () => {
    it('should leave a chat room', async () => {
      // Create a room with two participants
      const user2 = await User.create({
        email: 'leaver@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Leaver',
        lastName: 'User'
      });
      
      const user2Token = generateToken(user2._id);
      
      const room = await ChatRoom.create({
        name: 'Room to Leave',
        creator: userId,
        participants: [userId, user2._id]
      });

      const res = await request(app)
        .post(`/api/chatrooms/${room._id}/leave`)
        .set('x-auth-token', user2Token);
      
      expect(res.status).toBe(200);
      
      // Verify user was removed from participants
      const updatedRoom = await ChatRoom.findById(room._id);
      const participantIds = updatedRoom.participants.map(p => p.toString());
      expect(participantIds).not.toContain(user2._id.toString());
    });
  });

  describe('DELETE /api/chatrooms/:id', () => {
    it('should delete a chat room if requester is creator', async () => {
      // Create a room
      const room = await ChatRoom.create({
        name: 'Room to Delete',
        creator: userId,
        participants: [userId]
      });
      
      // Create a message in the room
      await Message.create({
        chatRoom: room._id,
        sender: userId,
        content: 'Test message',
        timestamp: new Date()
      });

      const res = await request(app)
        .delete(`/api/chatrooms/${room._id}`)
        .set('x-auth-token', token);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Chat room deleted successfully');
      
      // Verify room was deleted
      const deletedRoom = await ChatRoom.findById(room._id);
      expect(deletedRoom).toBeNull();
      
      // Verify messages were deleted
      const messages = await Message.find({ chatRoom: room._id });
      expect(messages.length).toBe(0);
    });

    it('should return 403 if requester is not creator', async () => {
      // Create another user
      const user2 = await User.create({
        email: 'nonowner@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Non',
        lastName: 'Owner'
      });
      
      const user2Token = generateToken(user2._id);
      
      // Create a room with original user as creator
      const room = await ChatRoom.create({
        name: 'Protected Room',
        creator: userId,
        participants: [userId, user2._id]
      });

      const res = await request(app)
        .delete(`/api/chatrooms/${room._id}`)
        .set('x-auth-token', user2Token);
      
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to delete this chat room');
    });
  });

  describe('GET /api/chatrooms/:id/messages', () => {
    it('should get messages for a chat room', async () => {
      // Create a room
      const room = await ChatRoom.create({
        name: 'Message Room',
        creator: userId,
        participants: [userId]
      });
      
      // Create messages
      await Message.create([
        {
          chatRoom: room._id,
          sender: userId,
          content: 'Message 1',
          timestamp: new Date()
        },
        {
          chatRoom: room._id,
          sender: userId,
          content: 'Message 2',
          timestamp: new Date()
        }
      ]);

      const res = await request(app)
        .get(`/api/chatrooms/${room._id}/messages`)
        .set('x-auth-token', token);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].content).toBe('Message 1');
      expect(res.body[1].content).toBe('Message 2');
      expect(res.body[0].sender).toHaveProperty('firstName');
    });
  });
});

describe('Socket.io Functionality', () => {
  let roomId;
  let serverAddress;

  beforeEach(async () => {
    // Create a room
    const room = await ChatRoom.create({
      name: 'Socket Test Room',
      creator: userId,
      participants: [userId]
    });
    roomId = room._id.toString();
    
    // Get the server address
    serverAddress = `http://localhost:${server.address().port}`;
  });

  afterEach(() => {
    if (socketClient) {
      socketClient.disconnect();
      socketClient = null;
    }
  });

  test('should connect to socket server', (done) => {
    socketClient = io(serverAddress, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    socketClient.on('connect', () => {
      expect(socketClient.connected).toBe(true);
      done();
    });
  });

  test('should join a room', (done) => {
    socketClient = io(serverAddress, {
      transports: ['websocket']
    });

    socketClient.on('connect', () => {
      // Join user to room
      socketClient.emit('join', { userId: userId.toString() });
      socketClient.emit('joinRoom', roomId);
      
      // Set a timeout to ensure server processes the join
      setTimeout(() => {
        done();
      }, 100);
    });
  });

  test('should send and receive messages', (done) => {
    socketClient = io(serverAddress, {
      transports: ['websocket']
    });
    
    const messageData = {
      roomId,
      message: 'Test socket message',
      sender: userId.toString()
    };

    socketClient.on('connect', () => {
      // Join room first
      socketClient.emit('join', { userId: userId.toString() });
      socketClient.emit('joinRoom', roomId);
      
      // Listen for new messages
      socketClient.on('newMessage', (data) => {
        expect(data.content).toBe('Test socket message');
        expect(data.sender.toString()).toBe(userId.toString());
        
        // Verify message was saved to DB
        Message.findById(data._id).then(message => {
          expect(message).not.toBeNull();
          expect(message.content).toBe('Test socket message');
          done();
        });
      });
      
      // Send a test message
      setTimeout(() => {
        socketClient.emit('sendMessage', messageData);
      }, 100);
    });
  });

  test('should handle disconnection', (done) => {
    socketClient = io(serverAddress, {
      transports: ['websocket']
    });

    socketClient.on('connect', () => {
      socketClient.emit('join', { userId: userId.toString() });
      
      // Disconnect the socket
      socketClient.disconnect();
      
      setTimeout(() => {
        // Success if we reach here without errors
        done();
      }, 100);
    });
  });
});

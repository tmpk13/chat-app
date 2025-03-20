const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

describe('Chat Room Routes', () => {
  // Test users with random emails to avoid conflicts
  const getTestUser1 = () => ({
    email: `user1.${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'password123',
    firstName: 'User',
    lastName: 'One'
  });

  const getTestUser2 = () => ({
    email: `user2.${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'password123',
    firstName: 'User',
    lastName: 'Two'
  });

  let user1, user2;
  let user1Id, user2Id;
  let user1Token, user2Token;
  let chatRoomId;

  // Helper function to generate auth token
  const generateAuthToken = (userId) => {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
  };

  beforeEach(async () => {
    // Create fresh test users
    user1 = getTestUser1();
    user2 = getTestUser2();
    
    // Register user 1
    const response1 = await request(app)
      .post('/api/users/register')
      .send(user1);
    
    user1Id = response1.body.user.id;
    user1Token = response1.body.token;

    // Register user 2
    const response2 = await request(app)
      .post('/api/users/register')
      .send(user2);
    
    user2Id = response2.body.user.id;
    user2Token = response2.body.token;
  });

  describe('POST /api/chatrooms', () => {
    it('should create a new chat room', async () => {
      const response = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', user1Token)
        .send({ name: 'New Chat Room' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', 'New Chat Room');
      expect(response.body).toHaveProperty('creator', user1Id.toString());
      expect(response.body.participants).toContain(user1Id.toString());
      
      // Save this chat room ID for future tests
      chatRoomId = response.body._id;
    });

    it('should not create a chat room without authentication', async () => {
      const response = await request(app)
        .post('/api/chatrooms')
        .send({ name: 'New Chat Room' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });

  describe('GET /api/chatrooms', () => {
    beforeEach(async () => {
      // Create a test chat room
      const response = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', user1Token)
        .send({ name: 'Test Chat Room' });
      
      chatRoomId = response.body._id;
    });

    it('should get all chat rooms', async () => {
      const response = await request(app)
        .get('/api/chatrooms')
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('creator');
    });

    it('should not get chat rooms without authentication', async () => {
      const response = await request(app)
        .get('/api/chatrooms');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });

  describe('GET /api/chatrooms/:id', () => {
    beforeEach(async () => {
      // Create a test chat room
      const response = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', user1Token)
        .send({ name: 'Test Chat Room' });
      
      chatRoomId = response.body._id;
    });

    it('should get a specific chat room by ID', async () => {
      const response = await request(app)
        .get(`/api/chatrooms/${chatRoomId}`)
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(response.body._id.toString()).toBe(chatRoomId.toString());
      expect(response.body).toHaveProperty('name', 'Test Chat Room');
      expect(response.body).toHaveProperty('creator');
    });

    it('should return 404 for non-existent chat room', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/chatrooms/${fakeId}`)
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Chat room not found');
    });
  });

  describe('POST /api/chatrooms/:id/join', () => {
    beforeEach(async () => {
      // Create a test chat room
      const response = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', user1Token)
        .send({ name: 'Test Chat Room' });
      
      chatRoomId = response.body._id;
    });

    it('should allow a user to join a chat room', async () => {
      const response = await request(app)
        .post(`/api/chatrooms/${chatRoomId}/join`)
        .set('x-auth-token', user2Token);

      expect(response.status).toBe(200);
      expect(response.body.participants).toContain(user2Id.toString());
    });

    it('should not add duplicate participants', async () => {
      // First join
      await request(app)
        .post(`/api/chatrooms/${chatRoomId}/join`)
        .set('x-auth-token', user2Token);
      
      // Join again
      const response = await request(app)
        .post(`/api/chatrooms/${chatRoomId}/join`)
        .set('x-auth-token', user2Token);

      // Count occurrences of user2Id in participants
      const occurrences = response.body.participants.filter(
        id => id === user2Id.toString()
      ).length;
      
      expect(response.status).toBe(200);
      expect(occurrences).toBe(1);
    });
  });

  describe('POST /api/chatrooms/:id/leave', () => {
    beforeEach(async () => {
      // Create a test chat room
      const roomResponse = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', user1Token)
        .send({ name: 'Test Chat Room' });
      
      chatRoomId = roomResponse.body._id;
      
      // Add user2 to participants
      await request(app)
        .post(`/api/chatrooms/${chatRoomId}/join`)
        .set('x-auth-token', user2Token);
    });

    it('should allow a user to leave a chat room', async () => {
      const response = await request(app)
        .post(`/api/chatrooms/${chatRoomId}/leave`)
        .set('x-auth-token', user2Token);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Left chat room successfully');
      
      // Verify user2 is no longer a participant
      const chatRoom = await ChatRoom.findById(chatRoomId);
      const stillParticipant = chatRoom.participants.some(
        id => id.toString() === user2Id.toString()
      );
      expect(stillParticipant).toBe(false);
    });
  });

  describe('DELETE /api/chatrooms/:id', () => {
    beforeEach(async () => {
      // Create a test chat room
      const response = await request(app)
        .post('/api/chatrooms')
        .set('x-auth-token', user1Token)
        .send({ name: 'Test Chat Room' });
      
      chatRoomId = response.body._id;
    });

    it('should allow creator to delete a chat room', async () => {
      const response = await request(app)
        .delete(`/api/chatrooms/${chatRoomId}`)
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Chat room deleted successfully');
      
      // Verify chat room is deleted
      const chatRoom = await ChatRoom.findById(chatRoomId);
      expect(chatRoom).toBeNull();
    });

    it('should not allow non-creator to delete a chat room', async () => {
      const response = await request(app)
        .delete(`/api/chatrooms/${chatRoomId}`)
        .set('x-auth-token', user2Token);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to delete this chat room');
      
      // Verify chat room still exists
      const chatRoom = await ChatRoom.findById(chatRoomId);
      expect(chatRoom).not.toBeNull();
    });
  });
});
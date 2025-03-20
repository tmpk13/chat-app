const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

describe('Conversation Routes', () => {
  // Test users
  const testUser1 = {
    email: 'user1@example.com',
    password: 'password123',
    firstName: 'User',
    lastName: 'One'
  };

  const testUser2 = {
    email: 'user2@example.com',
    password: 'password123',
    firstName: 'User',
    lastName: 'Two'
  };

  let user1Id, user2Id;
  let user1Token, user2Token;
  let conversationId;

  // Helper function to create test users
  const setupTestUsers = async () => {
    // Create user 1
    const user1 = new User(testUser1);
    await user1.save();
    user1Id = user1._id;
    user1Token = generateAuthToken(user1Id);

    // Create user 2
    const user2 = new User(testUser2);
    await user2.save();
    user2Id = user2._id;
    user2Token = generateAuthToken(user2Id);
  };

  // Helper function to create a test conversation
  const createTestConversation = async () => {
    const conversation = new Conversation({
      participants: [user1Id, user2Id]
    });
    await conversation.save();
    return conversation;
  };

  // Helper function to generate auth token
  const generateAuthToken = (userId) => {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
  };

  beforeEach(async () => {
    await setupTestUsers();
  });

  describe('POST /api/conversations', () => {
    it('should create a new conversation with another user', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('x-auth-token', user1Token)
        .send({ otherUserId: user2Id });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.participants).toHaveLength(2);
      
      // Save this conversation ID for future tests
      conversationId = response.body._id;
    });

    it('should return existing conversation if it already exists', async () => {
      // First create a conversation
      const conversation = await createTestConversation();
      conversationId = conversation._id;

      // Try to create it again
      const response = await request(app)
        .post('/api/conversations')
        .set('x-auth-token', user1Token)
        .send({ otherUserId: user2Id });

      expect(response.status).toBe(200);
      expect(response.body._id.toString()).toBe(conversationId.toString());
    });

    it('should return an error if the other user does not exist', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/conversations')
        .set('x-auth-token', user1Token)
        .send({ otherUserId: fakeUserId });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('GET /api/conversations', () => {
    beforeEach(async () => {
      // Create a test conversation
      const conversation = await createTestConversation();
      conversationId = conversation._id;
    });

    it('should get all conversations for the current user', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].participants.length).toBe(2);
    });
  });

  describe('GET /api/conversations/:id', () => {
    beforeEach(async () => {
      // Create a test conversation
      const conversation = await createTestConversation();
      conversationId = conversation._id;
    });

    it('should get a specific conversation by ID', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(response.body._id.toString()).toBe(conversationId.toString());
      expect(response.body.participants.length).toBe(2);
    });

    it('should not get a conversation if user is not a participant', async () => {
      // Create a third user that's not part of the conversation
      const user3 = new User({
        email: 'user3@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Three'
      });
      await user3.save();
      const user3Token = generateAuthToken(user3._id);

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('x-auth-token', user3Token);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to access this conversation');
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    beforeEach(async () => {
      // Create a test conversation
      const conversation = await createTestConversation();
      conversationId = conversation._id;
    });

    it('should send a message in a conversation', async () => {
      const messageContent = 'Hello, this is a test message';
      
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('x-auth-token', user1Token)
        .send({ content: messageContent });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('content', messageContent);
      expect(response.body).toHaveProperty('sender');
      expect(response.body).toHaveProperty('conversation', conversationId.toString());
    });

    it('should not send a message if user is not a participant', async () => {
      // Create a third user that's not part of the conversation
      const user3 = new User({
        email: 'user3@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Three'
      });
      await user3.save();
      const user3Token = generateAuthToken(user3._id);

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('x-auth-token', user3Token)
        .send({ content: 'This should fail' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to send messages in this conversation');
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    beforeEach(async () => {
      // Create a test conversation
      const conversation = await createTestConversation();
      conversationId = conversation._id;

      // Add some test messages
      await Message.create({
        conversation: conversationId,
        sender: user1Id,
        content: 'Test message 1'
      });

      await Message.create({
        conversation: conversationId,
        sender: user2Id,
        content: 'Test message 2'
      });
    });

    it('should get all messages for a conversation', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('sender');
    });

    it('should not get messages if user is not a participant', async () => {
      // Create a third user that's not part of the conversation
      const user3 = new User({
        email: 'user3@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Three'
      });
      await user3.save();
      const user3Token = generateAuthToken(user3._id);

      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('x-auth-token', user3Token);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to access these messages');
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    beforeEach(async () => {
      // Create a test conversation
      const conversation = await createTestConversation();
      conversationId = conversation._id;

      // Add a test message
      await Message.create({
        conversation: conversationId,
        sender: user1Id,
        content: 'Test message'
      });
    });

    it('should delete a conversation and all its messages', async () => {
      const response = await request(app)
        .delete(`/api/conversations/${conversationId}`)
        .set('x-auth-token', user1Token);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Conversation deleted successfully');
      
      // Verify conversation is deleted
      const conversation = await Conversation.findById(conversationId);
      expect(conversation).toBeNull();
      
      // Verify messages are deleted
      const messages = await Message.find({ conversation: conversationId });
      expect(messages.length).toBe(0);
    });

    it('should not delete a conversation if user is not a participant', async () => {
      // Create a third user that's not part of the conversation
      const user3 = new User({
        email: 'user3@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Three'
      });
      await user3.save();
      const user3Token = generateAuthToken(user3._id);

      const response = await request(app)
        .delete(`/api/conversations/${conversationId}`)
        .set('x-auth-token', user3Token);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Not authorized to delete this conversation');
      
      // Verify conversation still exists
      const conversation = await Conversation.findById(conversationId);
      expect(conversation).not.toBeNull();
    });
  });
});
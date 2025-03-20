const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

describe('User Routes', () => {
  // Test data with random email to avoid conflicts
  const getTestUser = () => ({
    email: `test${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  });
  
  let testUser;
  let authToken;
  let userId;

  beforeEach(() => {
    // Create fresh test user for each test
    testUser = getTestUser();
  });

  // Helper function to generate auth token
  const generateAuthToken = (userId) => {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
  };

  describe('POST /api/users/register', () => {
    it('should register a new user and return a token', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.firstName).toBe(testUser.firstName);
      expect(response.body.user.lastName).toBe(testUser.lastName);
    });

    it('should not register a user with existing email', async () => {
      // First register a user
      await request(app)
        .post('/api/users/register')
        .send(testUser);

      // Try to register again with the same email
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);
      
      userId = response.body.user.id;
    });

    it('should login and return a token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('GET /api/users/me', () => {
    beforeEach(async () => {
      // Register a user and save auth token
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);
      
      userId = response.body.user.id;
      authToken = response.body.token;
    });

    it('should get the profile of the authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('x-auth-token', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not get profile without auth token', async () => {
      const response = await request(app)
        .get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });

  describe('PUT /api/users/update', () => {
    beforeEach(async () => {
      // Register a user and save auth token
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);
      
      userId = response.body.user.id;
      authToken = response.body.token;
    });

    it('should update user profile', async () => {
      const updatedData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/users/update')
        .set('x-auth-token', authToken)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('firstName', updatedData.firstName);
      expect(response.body.user).toHaveProperty('lastName', updatedData.lastName);
    });

    it('should not update profile without auth token', async () => {
      const response = await request(app)
        .put('/api/users/update')
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });
});
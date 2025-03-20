const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

describe('Auth Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Mock Express request and response objects
    req = {
      header: jest.fn()
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });
  
  it('should add user to request object when token is valid', () => {
    // Create a sample user ID
    const userId = new mongoose.Types.ObjectId();
    
    // Create a valid token
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    // Set up the request with the token
    req.header.mockReturnValue(token);
    
    // Call the middleware
    auth(req, res, next);
    
    // Check that user was added to request and next() was called
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(userId.toString());
    expect(next).toHaveBeenCalled();
  });
  
  it('should return 401 status if no token is provided', () => {
    // Set up the request with no token
    req.header.mockReturnValue(null);
    
    // Call the middleware
    auth(req, res, next);
    
    // Check that proper error response was sent
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
    expect(next).not.toHaveBeenCalled();
  });
  
  it('should return 401 status if token is invalid', () => {
    // Set up the request with an invalid token
    req.header.mockReturnValue('invalid-token');
    
    // Call the middleware
    auth(req, res, next);
    
    // Check that proper error response was sent
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
    expect(next).not.toHaveBeenCalled();
  });
});
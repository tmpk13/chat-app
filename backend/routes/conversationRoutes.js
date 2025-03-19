// backend/routes/conversationRoutes.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all conversations for the current user
router.get('/', auth, async (req, res) => {
  try {
    // Find all conversations where the current user is a participant
    const conversations = await Conversation.find({
      participants: req.user.userId
    })
    .populate('participants', 'firstName lastName email')
    .populate({
      path: 'lastMessage',
      select: 'content timestamp sender',
      populate: {
        path: 'sender',
        select: 'firstName lastName'
      }
    })
    .sort({ 'lastMessage.timestamp': -1, createdAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get or create a conversation with another user
router.post('/', auth, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    
    // Validate other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.userId, otherUserId] }
    })
    .populate('participants', 'firstName lastName email');
    
    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [req.user.userId, otherUserId]
      });
      
      await conversation.save();
      
      // Populate participants after saving
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'firstName lastName email');
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific conversation
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'firstName lastName email')
      .populate('lastMessage');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Check if user is a participant
    if (!conversation.participants.some(p => p._id.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Check if user is a participant
    if (!conversation.participants.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to access these messages' });
    }
    
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'firstName lastName')
      .sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message in a conversation
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Check if user is a participant
    if (!conversation.participants.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this conversation' });
    }
    
    // Create and save new message
    const message = new Message({
      conversation: req.params.id,
      sender: req.user.userId,
      content
    });
    
    await message.save();
    
    // Populate sender details
    await message.populate('sender', 'firstName lastName');
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a list of all users (for starting conversations)
router.get('/users/list', auth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.userId }
    })
    .select('firstName lastName email')
    .sort({ firstName: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
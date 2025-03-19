const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Create a new chat room
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    const chatRoom = new ChatRoom({
      name,
      creator: req.user.userId,
      participants: [req.user.userId]
    });
    
    await chatRoom.save();
    
    res.status(201).json(chatRoom);
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all chat rooms
router.get('/', auth, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find()
      .populate('creator', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(chatRooms);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat room by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id)
      .populate('creator', 'firstName lastName')
      .populate('participants', 'firstName lastName');
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }
    
    res.json(chatRoom);
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a chat room
router.post('/:id/join', auth, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }
    
    // Check if user is already a participant
    if (!chatRoom.participants.includes(req.user.userId)) {
      chatRoom.participants.push(req.user.userId);
      await chatRoom.save();
    }
    
    res.json(chatRoom);
  } catch (error) {
    console.error('Join chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a chat room
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }
    
    // Remove user from participants
    chatRoom.participants = chatRoom.participants.filter(
      participant => participant.toString() !== req.user.userId
    );
    
    await chatRoom.save();
    
    res.json({ message: 'Left chat room successfully' });
  } catch (error) {
    console.error('Leave chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a chat room
router.delete('/:id', auth, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }
    
    // Only creator can delete the chat room
    if (chatRoom.creator.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this chat room' });
    }
    
    // Delete all messages in the chat room
    await Message.deleteMany({ chatRoom: req.params.id });
    
    // Delete the chat room
    await ChatRoom.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Chat room deleted successfully' });
  } catch (error) {
    console.error('Delete chat room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a chat room
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ chatRoom: req.params.id })
      .populate('sender', 'firstName lastName')
      .sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
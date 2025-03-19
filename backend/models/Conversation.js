// backend/models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a conversation can only have 2 participants
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('A conversation must have exactly 2 participants'));
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
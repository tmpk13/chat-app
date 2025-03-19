const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

// Update the conversation's lastMessage field when a new message is created
messageSchema.post('save', async function(doc) {
  try {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(
      doc.conversation,
      { lastMessage: doc._id }
    );
  } catch (error) {
    console.error('Error updating conversation lastMessage:', error);
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
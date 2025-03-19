import React from 'react';

const ChatMessage = ({ message, currentUserId }) => {
  // Check if the current user is the sender
  const isOwnMessage = message.sender._id === currentUserId;
  
  return (
    <div className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
      {!isOwnMessage && (
        <div className="message-sender">
          {message.sender.firstName} {message.sender.lastName}
        </div>
      )}
      <div className="message-text">{message.content}</div>
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

export default ChatMessage;
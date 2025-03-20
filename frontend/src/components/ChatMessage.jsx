import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const ChatMessage = ({ message, currentUserId }) => {
  
  const { user } = useContext(AuthContext);
  const isOwnMessage = message.sender._id === user._id;
  
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
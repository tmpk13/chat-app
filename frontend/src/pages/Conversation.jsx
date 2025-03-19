// frontend/src/pages/Conversation.jsx
import React, { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import SocketContext from '../context/SocketContext';
import ChatMessage from '../components/ChatMessage';
import DirectMessageService from '../services/DirectMessageService';

const Conversation = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user, setError } = useContext(AuthContext);
  const { socket, connected, joinConversation, leaveConversation } = useContext(SocketContext);
  
  const [conversation, setConversation] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Fetch conversation details and messages
  useEffect(() => {
    const fetchConversationAndMessages = async () => {
      try {
        // Get conversation
        const conversationData = await DirectMessageService.getConversations(conversationId);
        
        // If the conversation doesn't exist, return to home
        if (!conversationData) {
          navigate('/');
          return;
        }
        
        setConversation(conversationData);
        
        // Find the other user in the conversation
        const other = conversationData.participants.find(
          participant => participant._id !== user?.id
        );
        setOtherUser(other);
        
        // Get messages
        const messagesData = await DirectMessageService.getMessages(conversationId);
        setMessages(messagesData);
      } catch (error) {
        setError(error.response?.data?.message || 'Could not fetch conversation data');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchConversationAndMessages();
  }, [conversationId, navigate, setError, user?.id]);

  // Join the conversation when component mounts
  useEffect(() => {
    if (connected && conversationId) {
      joinConversation(conversationId);
    }
    
    // Leave the conversation when component unmounts
    return () => {
      if (connected && conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [connected, conversationId, joinConversation, leaveConversation]);

  // Listen for new messages
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      };
      
      socket.on('newMessage', handleNewMessage);
      
      return () => {
        socket.off('newMessage', handleNewMessage);
      };
    }
  }, [socket]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      // Send message to backend
      const sentMessage = await DirectMessageService.sendMessage(conversationId, newMessage);
      
      // Emit socket event
      if (connected && socket) {
        socket.emit('sendDirectMessage', {
          conversationId,
          message: sentMessage
        });
      }
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      setError(error.response?.data?.message || 'Could not send message');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading conversation...</div>;
  }
  
  return (
    <div className="chat-room-container">
      <div className="chat-room-header">
        <h1>
          {otherUser && `${otherUser.firstName} ${otherUser.lastName}`}
        </h1>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Back to Conversations
        </button>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((message) => (
            <ChatMessage 
              key={message._id} 
              message={message} 
              currentUserId={user.id} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="message-input"
        />
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
};

export default Conversation;
// frontend/src/pages/Home.jsx
import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import DirectMessageService from '../services/DirectMessageService';

const Home = () => {
  const { user, setError } = useContext(AuthContext);
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUsersList, setShowUsersList] = useState(false);

  // Fetch conversations (existing direct messages)
  const fetchConversations = async () => {
    try {
      const data = await DirectMessageService.getConversations();
      setConversations(data);
    } catch (error) {
      setError(error.response?.data?.message || 'Could not fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for starting new conversations
  const fetchUsers = async () => {
    try {
      const data = await DirectMessageService.getUsers();
      // Filter out the current user
      const filteredUsers = data.filter(u => u._id !== user?.id);
      setUsers(filteredUsers);
    } catch (error) {
      setError(error.response?.data?.message || 'Could not fetch users');
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewConversation = () => {
    fetchUsers();
    setShowUsersList(true);
  };

  const startConversation = async (userId) => {
    try {
      const conversation = await DirectMessageService.getOrCreateConversation(userId);
      navigate(`/conversation/${conversation._id}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Could not start conversation');
    }
  };

  if (loading) {
    return <div className="loading">Loading conversations...</div>;
  }

  return (
    <div className="home-container">
      <h1>Welcome, {user?.firstName}!</h1>
      
      <div className="create-conversation">
        <h2>Direct Messages</h2>
        <button 
          className="btn btn-primary" 
          onClick={handleNewConversation}
        >
          Start New Conversation
        </button>
      </div>
      
      {showUsersList && (
        <div className="users-list">
          <h3>Select a user to message</h3>
          {users.length === 0 ? (
            <p>No other users available</p>
          ) : (
            <ul>
              {users.map((u) => (
                <li key={u._id} className="user-item">
                  <div className="user-info">
                    {u.firstName} {u.lastName} ({u.email})
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => startConversation(u._id)}
                  >
                    Message
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowUsersList(false)}
          >
            Cancel
          </button>
        </div>
      )}
      
      <div className="conversations-list">
        <h2>Your Conversations</h2>
        {conversations.length === 0 ? (
          <p>No conversations yet</p>
        ) : (
          <ul>
            {conversations.map((conversation) => {
              // Find the other user in the conversation
              const otherUser = conversation.participants.find(
                participant => participant._id !== user?.id
              );
              
              return (
                <li key={conversation._id} className="conversation-item">
                  <Link to={`/conversation/${conversation._id}`} className="conversation-link">
                    <div className="conversation-info">
                      <span className="other-user-name">
                        {otherUser.firstName} {otherUser.lastName}
                      </span>
                      {conversation.lastMessage && (
                        <span className="last-message">
                          {conversation.lastMessage.content.substring(0, 30)}
                          {conversation.lastMessage.content.length > 30 ? '...' : ''}
                        </span>
                      )}
                    </div>
                    <div className="conversation-timestamp">
                      {conversation.lastMessage 
                        ? new Date(conversation.lastMessage.timestamp).toLocaleString()
                        : 'No messages yet'}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Home;
// frontend/src/pages/Home.jsx (with debugging)
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

  console.log('Rendering Home component');
  console.log('Current user:', user);

  // Fetch conversations (existing direct messages)
  const fetchConversations = async () => {
    try {
      console.log('Fetching conversations');
      const data = await DirectMessageService.getConversations();
      console.log('Received conversations:', data);
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(error.response?.data?.message || 'Could not fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for starting new conversations
  const fetchUsers = async () => {
    try {
      console.log('Fetching users');
      const data = await DirectMessageService.getUsers();
      console.log('Received users:', data);
      
      // Filter out the current user
      const filteredUsers = data.filter(u => u._id !== user?.id);
      console.log('Filtered users (without current user):', filteredUsers);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      console.log('Starting conversation with user ID:', userId);
      const conversation = await DirectMessageService.getOrCreateConversation(userId);
      console.log('Created/retrieved conversation:', conversation);
      navigate(`/conversation/${conversation._id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
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
              console.log('Processing conversation:', conversation);
              
              // Find the other user in the conversation
              const otherUser = conversation.participants.find(
                participant => participant._id !== user?.id
              );
              
              console.log('Other user in this conversation:', otherUser);
              
              return (
                <li key={conversation._id} className="conversation-item">
                  <Link to={`/conversation/${conversation._id}`} className="conversation-link">
                    <div className="conversation-info">
                      <span className="other-user-name">
                        {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
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
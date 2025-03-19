import React, { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import SocketContext from '../context/SocketContext';
import ChatMessage from '../components/ChatMessage';
import { API_URL } from '../config';

const ChatRoom = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user, setError } = useContext(AuthContext);
  const { socket, connected, joinRoom, leaveRoom, sendMessage } = useContext(SocketContext);
  
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Fetch chat room details and messages
  useEffect(() => {
    const fetchRoomAndMessages = async () => {
      try {
        // Get room details
        const roomRes = await axios.get(`${API_URL}/api/chatrooms/${roomId}`);
        setRoom(roomRes.data);
        
        // Get messages
        const messagesRes = await axios.get(`${API_URL}/api/chatrooms/${roomId}/messages`);
        setMessages(messagesRes.data);
      } catch (error) {
        setError(error.response?.data?.message || 'Could not fetch chat room data');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomAndMessages();
  }, [roomId, navigate, setError]);

  // Join the room when component mounts
  useEffect(() => {
    if (connected && roomId) {
      joinRoom(roomId);
    }
    
    // Leave the room when component unmounts
    return () => {
      if (connected && roomId) {
        leaveRoom(roomId);
      }
    };
  }, [connected, roomId, joinRoom, leaveRoom]);

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
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    sendMessage(roomId, newMessage);
    setNewMessage('');
  };
  
  // Handle leaving the chat room
  const handleLeaveRoom = async () => {
    try {
      await axios.post(`${API_URL}/api/chatrooms/${roomId}/leave`);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || 'Could not leave chat room');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading chat room...</div>;
  }
  
  return (
    <div className="chat-room-container">
      <div className="chat-room-header">
        <h1>{room.name}</h1>
        <button className="btn btn-secondary" onClick={handleLeaveRoom}>
          Leave Room
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

export default ChatRoom;
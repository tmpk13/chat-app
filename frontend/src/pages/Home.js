import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { API_URL } from '../config';

const Home = () => {
  const { user, setError } = useContext(AuthContext);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');

  // Fetch all chat rooms
  const fetchChatRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chatrooms`);
      setChatRooms(res.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Could not fetch chat rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]); // Add fetchChatRooms to dependency array

  // Create a new chat room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    try {
      await axios.post(`${API_URL}/api/chatrooms`, { name: roomName });
      setRoomName('');
      fetchChatRooms();
    } catch (error) {
      setError(error.response?.data?.message || 'Could not create chat room');
    }
  };

  // Delete a chat room
  const handleDeleteRoom = async (roomId) => {
    try {
      await axios.delete(`${API_URL}/api/chatrooms/${roomId}`);
      fetchChatRooms();
    } catch (error) {
      setError(error.response?.data?.message || 'Could not delete chat room');
    }
  };

  if (loading) {
    return <div className="loading">Loading chat rooms...</div>;
  }

  return (
    <div className="home-container">
      <h1>Welcome, {user?.firstName}!</h1>
      
      <div className="create-room-form">
        <h2>Create New Chat Room</h2>
        <form onSubmit={handleCreateRoom}>
          <input
            type="text"
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">Create Room</button>
        </form>
      </div>
      
      <div className="chat-rooms-list">
        <h2>Available Chat Rooms</h2>
        {chatRooms.length === 0 ? (
          <p>No chat rooms available</p>
        ) : (
          <ul>
            {chatRooms.map((room) => (
              <li key={room._id} className="chat-room-item">
                <Link to={`/chatroom/${room._id}`} className="room-name">
                  {room.name}
                </Link>
                <div className="room-info">
                  Created by: {room.creator.firstName} {room.creator.lastName}
                </div>
                {user && room.creator._id === user.id && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteRoom(room._id)}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Home;

// frontend/src/services/DirectMessageService.js
import axios from 'axios';
import { API_URL } from '../config';

/**
 * Service for handling direct message operations
 */
class DirectMessageService {
  /**
   * Get all conversations for the current user
   * @returns {Promise} Promise with array of conversations
   */
  async getConversations() {
    const response = await axios.get(`${API_URL}/api/conversations`);
    return response.data;
  }

  /**
   * Get or create a conversation with another user
   * @param {string} otherUserId ID of the user to start/continue conversation with
   * @returns {Promise} Promise with conversation data
   */
  async getOrCreateConversation(otherUserId) {
    const response = await axios.post(`${API_URL}/api/conversations`, { otherUserId });
    return response.data;
  }

  /**
   * Get messages for a specific conversation
   * @param {string} conversationId ID of the conversation
   * @returns {Promise} Promise with array of messages
   */
  async getMessages(conversationId) {
    const response = await axios.get(`${API_URL}/api/conversations/${conversationId}/messages`);
    return response.data;
  }

  /**
   * Send a message in a conversation
   * @param {string} conversationId ID of the conversation
   * @param {string} content Message content
   * @returns {Promise} Promise with the sent message data
   */
  async sendMessage(conversationId, content) {
    const response = await axios.post(`${API_URL}/api/conversations/${conversationId}/messages`, { content });
    return response.data;
  }

  /**
   * Get a list of all users (for starting new conversations)
   * @returns {Promise} Promise with array of users
   */
  async getUsers() {
    const response = await axios.get(`${API_URL}/api/users`);
    return response.data;
  }
}

export default new DirectMessageService();
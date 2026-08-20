import apiClient from './axios';

/**
 * Register a new user
 * @param {Object} data - { name, email, password }
 * @returns {Promise<{ user: Object, token: string }>}
 */
export async function registerUser(data) {
  const response = await apiClient.post('/api/auth/register', data);
  return response.data;
}

/**
 * Login an existing user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{ user: Object, token: string }>}
 */
export async function loginUser(credentials) {
  const response = await apiClient.post('/api/auth/login', credentials);
  return response.data;
}

/**
 * Get current authenticated user profile
 * @returns {Promise<{ user: Object }>}
 */
export async function getCurrentUser() {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
}

/**
 * Logout the authenticated user
 * @returns {Promise<{ message: string }>}
 */
export async function logoutUser() {
  const response = await apiClient.post('/api/auth/logout');
  return response.data;
}

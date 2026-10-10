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
 * Change account password
 * @param {Object} data - { currentPassword, newPassword }
 * @returns {Promise<{ message: string }>}
 */
export async function changePassword(data) {
  const response = await apiClient.post('/api/auth/change-password', data);
  return response.data;
}

/**
 * Update user notification preferences
 * @param {Object} preferences - { emailNotifications, transferAlerts, securityAlerts }
 * @returns {Promise<{ message: string, preferences: Object }>}
 */
export async function updatePreferences(preferences) {
  const response = await apiClient.patch('/api/auth/preferences', preferences);
  return response.data;
}

/**
 * Fetch security status, active session details, and audit history
 * @returns {Promise<{ security: Object }>}
 */
export async function getSecurityStatus() {
  const response = await apiClient.get('/api/auth/security-status');
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

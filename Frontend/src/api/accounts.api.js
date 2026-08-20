import apiClient from './axios';

/**
 * Create a new account for the authenticated user
 * @returns {Promise<{ account: Object }>}
 */
export async function createAccount() {
  const response = await apiClient.post('/api/accounts');
  return response.data;
}

/**
 * Get all accounts of the logged-in user
 * @returns {Promise<{ accounts: Array<Object> }>}
 */
export async function getUserAccounts() {
  const response = await apiClient.get('/api/accounts');
  return response.data;
}

/**
 * Get the real derived balance for a specific account
 * @param {string} accountId
 * @returns {Promise<{ accountId: string, balance: number }>}
 */
export async function getAccountBalance(accountId) {
  const response = await apiClient.get(`/api/accounts/balance/${accountId}`);
  return response.data;
}

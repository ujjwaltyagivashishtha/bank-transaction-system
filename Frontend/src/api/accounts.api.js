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

/**
 * Lookup recipient account for transfer verification (Section 9)
 * @param {string} identifier - Account number or ObjectId
 * @returns {Promise<{ recipient: Object }>}
 */
export async function lookupAccount(identifier) {
  const response = await apiClient.get('/api/accounts/lookup', {
    params: { identifier },
  });
  return response.data;
}

/**
 * Search recipients by name or account number
 * @param {string} query
 * @returns {Promise<{ recipients: Array<Object> }>}
 */
export async function searchRecipients(query) {
  const response = await apiClient.get('/api/recipients/search', {
    params: { query },
  });
  return response.data;
}

/**
 * Get recent transfer recipients from user's transaction history
 * @returns {Promise<{ recentRecipients: Array<Object> }>}
 */
export async function getRecentRecipients() {
  const response = await apiClient.get('/api/recipients/recent');
  return response.data;
}

/**
 * Get user's saved beneficiaries
 * @returns {Promise<{ savedRecipients: Array<Object> }>}
 */
export async function getSavedRecipients() {
  const response = await apiClient.get('/api/recipients/saved');
  return response.data;
}

/**
 * Save a recipient as a beneficiary
 * @param {{ identifier: string, nickname?: string }} data
 * @returns {Promise<{ message: string, recipient: Object }>}
 */
export async function saveRecipient(data) {
  const response = await apiClient.post('/api/recipients/saved', data);
  return response.data;
}

/**
 * Delete a saved beneficiary
 * @param {string} recipientId
 * @returns {Promise<{ message: string }>}
 */
export async function deleteSavedRecipient(recipientId) {
  const response = await apiClient.delete(`/api/recipients/saved/${recipientId}`);
  return response.data;
}

/**
 * Freeze an account (prevents outgoing transfers)
 * @param {string} accountId
 * @param {string} [reason]
 * @returns {Promise<{ message: string, account: Object }>}
 */
export async function freezeAccount(accountId, reason) {
  const response = await apiClient.patch(`/api/accounts/${accountId}/freeze`, { reason });
  return response.data;
}

/**
 * Unfreeze / reactivate an account
 * @param {string} accountId
 * @returns {Promise<{ message: string, account: Object }>}
 */
export async function unfreezeAccount(accountId) {
  const response = await apiClient.patch(`/api/accounts/${accountId}/unfreeze`);
  return response.data;
}

/**
 * Close an account (allowed only if balance is zero)
 * @param {string} accountId
 * @returns {Promise<{ message: string, account: Object }>}
 */
export async function closeAccount(accountId) {
  const response = await apiClient.patch(`/api/accounts/${accountId}/close`);
  return response.data;
}

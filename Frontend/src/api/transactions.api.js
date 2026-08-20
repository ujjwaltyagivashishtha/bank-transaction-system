import apiClient from './axios';

/**
 * Transfer money between two active accounts
 * @param {Object} data - { fromAccount, toAccount, amount, idempotencyKey }
 * @returns {Promise<{ message: string, transaction: Object }>}
 */
export async function createTransaction(data) {
  const response = await apiClient.post('/api/transactions', data);
  return response.data;
}

/**
 * Create initial funds transaction (System User only)
 * @param {Object} data - { toAccount, amount, idempotencyKey }
 * @returns {Promise<{ message: string, transaction: Object }>}
 */
export async function createInitialFundsTransaction(data) {
  const response = await apiClient.post('/api/transactions/system/initial-funds', data);
  return response.data;
}

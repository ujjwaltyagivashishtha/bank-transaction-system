import apiClient from './axios';

/**
 * Transfer money between two active accounts
 * @param {Object} data - { fromAccount, toAccount, amount, idempotencyKey, description }
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

/**
 * Get user's persistent transaction history with pagination and filters
 * @param {Object} [params] - { page, limit, status, type, accountId, startDate, endDate, search }
 * @returns {Promise<{ transactions: Array, pagination: Object, summary: Object }>}
 */
export async function getTransactions(params = {}) {
  const response = await apiClient.get('/api/transactions', { params });
  return response.data;
}

/**
 * Get single transaction details
 * @param {string} id
 * @returns {Promise<{ transaction: Object, ledgerEntries: Array, direction: string }>}
 */
export async function getTransactionById(id) {
  const response = await apiClient.get(`/api/transactions/${id}`);
  return response.data;
}

/**
 * Get printable/shareable transaction receipt
 * @param {string} id
 * @returns {Promise<{ receipt: Object }>}
 */
export async function getTransactionReceipt(id) {
  const response = await apiClient.get(`/api/transactions/${id}/receipt`);
  return response.data;
}

/**
 * Get account statement over specified date range
 * @param {string} accountId
 * @param {Object} [params] - { startDate, endDate }
 * @returns {Promise<{ statement: Object }>}
 */
export async function getAccountStatement(accountId, params = {}) {
  const response = await apiClient.get(`/api/accounts/${accountId}/statement`, { params });
  return response.data;
}

/**
 * Export transactions as CSV
 * Triggers browser file download
 */
export async function exportTransactionsCsv() {
  const response = await apiClient.get('/api/transactions/export/csv', {
    responseType: 'blob',
  });
  
  // Trigger download in browser
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `transact_statement_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

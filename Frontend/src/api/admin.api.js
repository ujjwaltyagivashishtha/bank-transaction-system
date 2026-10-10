import apiClient from './axios';

/**
 * Get system-wide accounts, ledger liquidity, and operational metrics
 * @returns {Promise<{ systemOverview: Object, accounts: Array }>}
 */
export async function getAdminOverview() {
  const response = await apiClient.get('/api/admin/overview');
  return response.data;
}

/**
 * Get administrative audit log trail with pagination
 * @param {Object} [params] - { page, limit }
 * @returns {Promise<{ auditLogs: Array, pagination: Object }>}
 */
export async function getAdminAuditLogs(params = {}) {
  const response = await apiClient.get('/api/admin/audit-logs', { params });
  return response.data;
}

/**
 * Inspect raw balanced ledger entries for a transaction reference or ID
 * @param {string} identifier
 * @returns {Promise<{ transaction: Object, ledgerEntries: Array, isBalanced: boolean }>}
 */
export async function inspectLedger(identifier) {
  const response = await apiClient.get(`/api/admin/ledger-inspect/${identifier}`);
  return response.data;
}

/**
 * Run ledger reconciliation audit (detects missing, unbalanced, or orphaned entries)
 * @returns {Promise<{ report: Object }>}
 */
export async function runReconciliation() {
  const response = await apiClient.get('/api/transactions/reconciliation/report');
  return response.data;
}

/**
 * Issue an authorized compensating reversal for a transaction
 * @param {string} id - Transaction ID
 * @param {string} reason - Reason for reversal
 * @returns {Promise<{ message: string, reversal: Object }>}
 */
export async function reverseTransaction(id, reason) {
  const response = await apiClient.post(`/api/transactions/${id}/reverse`, { reason });
  return response.data;
}

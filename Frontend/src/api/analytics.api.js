import apiClient from './axios';

/**
 * Get personal financial insights, monthly cash flow trends, and spending breakdown
 * @returns {Promise<{ hasData: boolean, summary: Object, monthlyTrends: Array, categoryBreakdown: Array }>}
 */
export async function getFinancialInsights() {
  const response = await apiClient.get('/api/analytics/insights');
  return response.data;
}

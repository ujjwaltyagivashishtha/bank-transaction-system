import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTransactions, exportTransactionsCsv } from '../api/transactions.api';
import { useAuth } from './AuthContext';

const ActivityContext = createContext(null);

export function ActivityProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0 });
  const [currentFilters, setCurrentFilters] = useState({});

  /**
   * Fetch persistent transactions from backend API
   */
  const fetchTransactions = useCallback(async (customParams = {}) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const mergedParams = { page: 1, limit: 15, ...currentFilters, ...customParams };
      const data = await getTransactions(mergedParams);
      setTransactions(data.transactions || []);
      setPagination(data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
      setSummary(data.summary || { totalIn: 0, totalOut: 0 });
      setCurrentFilters(mergedParams);
    } catch (err) {
      console.warn('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentFilters]);

  // Initial load when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions({ page: 1 });
    } else {
      setTransactions([]);
      setPagination({ total: 0, page: 1, limit: 15, totalPages: 1 });
      setSummary({ totalIn: 0, totalOut: 0 });
    }
  }, [isAuthenticated]);

  /**
   * Optimistically record or prepend newly completed transaction
   */
  const logTransaction = useCallback((txData) => {
    const formatted = {
      _id: txData._id || txData.id || `tx_${Date.now()}`,
      fromAccount: txData.fromAccount,
      toAccount: txData.toAccount,
      amount: Number(txData.amount) || 0,
      direction: txData.direction || 'DEBIT',
      idempotencyKey: txData.idempotencyKey,
      status: txData.status || 'COMPLETED',
      reference: txData.reference || String(txData.idempotencyKey),
      description: txData.description || 'Funds Transfer',
      createdAt: txData.createdAt || new Date().toISOString(),
    };

    setTransactions((prev) => [formatted, ...prev]);
    // Refresh backend in background to keep stats in sync
    setTimeout(() => {
      fetchTransactions();
    }, 500);

    return formatted;
  }, [fetchTransactions]);

  const updateTransaction = useCallback((idempotencyKey, updates) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.idempotencyKey === idempotencyKey) {
          return { ...tx, ...updates };
        }
        return tx;
      })
    );
  }, []);

  const handleExportCsv = useCallback(async () => {
    try {
      await exportTransactionsCsv();
    } catch (err) {
      console.error('Failed to export transactions CSV:', err);
    }
  }, []);

  return (
    <ActivityContext.Provider
      value={{
        transactions,
        loading,
        pagination,
        summary,
        fetchTransactions,
        logTransaction,
        updateTransaction,
        exportCsv: handleExportCsv,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useCallback } from 'react';

const ActivityContext = createContext(null);

export function ActivityProvider({ children }) {
  // Session-scoped transaction activity logs
  const [sessionTransactions, setSessionTransactions] = useState([]);

  /**
   * Record a new transaction attempt or completion in the current session
   * @param {Object} txData
   */
  const logTransaction = useCallback((txData) => {
    const newEntry = {
      id: txData._id || txData.transactionId || `sess_${Date.now()}`,
      fromAccount: txData.fromAccount,
      toAccount: txData.toAccount,
      amount: Number(txData.amount) || 0,
      idempotencyKey: txData.idempotencyKey,
      status: txData.status || 'COMPLETED',
      createdAt: txData.createdAt || new Date().toISOString(),
      type: txData.type || 'TRANSFER',
      message: txData.message,
    };

    setSessionTransactions((prev) => [newEntry, ...prev]);
    return newEntry;
  }, []);

  /**
   * Update an existing transaction record (e.g. from PENDING to COMPLETED or FAILED)
   */
  const updateTransaction = useCallback((idempotencyKey, updates) => {
    setSessionTransactions((prev) =>
      prev.map((tx) => {
        if (tx.idempotencyKey === idempotencyKey) {
          return { ...tx, ...updates };
        }
        return tx;
      })
    );
  }, []);

  const clearSessionActivity = useCallback(() => {
    setSessionTransactions([]);
  }, []);

  return (
    <ActivityContext.Provider
      value={{
        sessionTransactions,
        logTransaction,
        updateTransaction,
        clearSessionActivity,
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

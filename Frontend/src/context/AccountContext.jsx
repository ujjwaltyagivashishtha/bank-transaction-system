import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getUserAccounts, getAccountBalance, createAccount } from '../api/accounts.api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({}); // { [accountId]: number }
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch balances for a list of accounts
  const fetchBalancesForAccounts = useCallback(async (accountList) => {
    if (!accountList || accountList.length === 0) {
      setBalances({});
      return;
    }

    const balancePromises = accountList.map(async (acc) => {
      try {
        const res = await getAccountBalance(acc._id);
        return { accountId: acc._id, balance: res.balance || 0 };
      } catch (err) {
        console.warn(`Failed to fetch balance for account ${acc._id}:`, err);
        return { accountId: acc._id, balance: 0 };
      }
    });

    const results = await Promise.all(balancePromises);
    const balanceMap = {};
    results.forEach(({ accountId, balance }) => {
      balanceMap[accountId] = balance;
    });

    setBalances(balanceMap);
  }, []);

  // Fetch all accounts and their respective balances
  const fetchAccounts = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await getUserAccounts();
      const userAccounts = data.accounts || [];
      setAccounts(userAccounts);
      await fetchBalancesForAccounts(userAccounts);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      // Only show error toast if not an unmounted or cancelled request
      if (err.response?.status !== 401) {
        showError('Unable to load accounts. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchBalancesForAccounts, showError]);

  // Create a new bank account
  const handleCreateAccount = async () => {
    setCreating(true);
    try {
      const data = await createAccount();
      showSuccess('New bank account opened successfully!');
      await fetchAccounts(); // Refresh accounts and balances
      return { success: true, account: data.account };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create new account.';
      showError(message);
      return { success: false, error: message };
    } finally {
      setCreating(false);
    }
  };

  // Trigger accounts fetch on auth status change
  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts();
    } else {
      setAccounts([]);
      setBalances({});
    }
  }, [isAuthenticated, fetchAccounts]);

  // Derived metrics
  const totalBalance = useMemo(() => {
    return Object.values(balances).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [balances]);

  const activeAccounts = useMemo(() => {
    return accounts.filter((acc) => acc.status === 'ACTIVE');
  }, [accounts]);

  const statusCounts = useMemo(() => {
    return {
      active: accounts.filter((a) => a.status === 'ACTIVE').length,
      frozen: accounts.filter((a) => a.status === 'FROZEN').length,
      closed: accounts.filter((a) => a.status === 'CLOSED').length,
      total: accounts.length,
    };
  }, [accounts]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        balances,
        totalBalance,
        activeAccounts,
        statusCounts,
        loading,
        creating,
        fetchAccounts,
        createAccount: handleCreateAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
}

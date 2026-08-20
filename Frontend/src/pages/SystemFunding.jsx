import React, { useState } from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../context/AccountContext';
import { useToast } from '../context/ToastContext';
import { createInitialFundsTransaction } from '../api/transactions.api';
import { generateIdempotencyKey } from '../utils/generateIdempotencyKey';
import { formatCurrency } from '../utils/formatCurrency';
import { formatAccountId } from '../utils/formatAccountId';
import Spinner from '../components/common/Spinner';

export default function SystemFunding() {
  const { isSystemUser } = useAuth();
  const { accounts, fetchAccounts } = useAccounts();
  const { showSuccess, showError } = useToast();

  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('10000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isSystemUser) {
    return (
      <div className="dashboard-scroll-area">
        <div className="empty-state-box">
          <div className="empty-icon-circle" style={{ backgroundColor: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
            <ShieldAlert size={28} />
          </div>
          <div className="empty-title">Access Restricted</div>
          <p className="empty-desc">
            This module is reserved exclusively for authenticated System Administrators to inject initial liquidity.
          </p>
        </div>
      </div>
    );
  }

  const handleFund = async (e) => {
    e.preventDefault();
    if (!toAccount.trim()) {
      showError('Please select or specify a target Account ID.');
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showError('Please specify a positive funding amount.');
      return;
    }

    setLoading(true);
    setResult(null);

    const idempotencyKey = generateIdempotencyKey('sys_fund');

    try {
      const response = await createInitialFundsTransaction({
        toAccount: toAccount.trim(),
        amount: numericAmount,
        idempotencyKey,
      });

      setResult({
        success: true,
        message: response.message || 'System initial funds issued successfully.',
        transaction: response.transaction,
      });
      showSuccess(`Injected ${formatCurrency(numericAmount)} initial funds!`);
      await fetchAccounts();
    } catch (err) {
      const message = err.response?.data?.message || 'System funding failed.';
      setResult({
        success: false,
        error: message,
      });
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-scroll-area">
      <div className="page-header">
        <div className="page-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="#F59E0B" />
            <h1 className="page-title">System Initial Funding</h1>
          </div>
          <p className="page-subtitle">
            Admin tool to mint and allocate initial system ledger reserves to specific accounts.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '640px' }}>
        <div className="transfer-card">
          <div
            style={{
              backgroundColor: 'var(--accent-amber-bg)',
              color: '#92400E',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              border: '1px solid var(--accent-amber-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Sparkles size={18} style={{ flexShrink: 0 }} />
            <span>
              This operation debits the primary system reserves and credits the target ledger account directly.
            </span>
          </div>

          <form onSubmit={handleFund} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sysToAccount">
                <span>Select Target Account</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Or enter any valid Mongo Account ID
                </span>
              </label>
              <select
                id="sysToAccountSelect"
                className="form-select"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
              >
                <option value="">-- Choose an Account --</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {formatAccountId(acc._id)} ({acc._id}) - {acc.status}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: '8px' }}>
                <input
                  id="sysToAccount"
                  type="text"
                  className="form-input"
                  placeholder="Custom Target Account ID"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sysAmount">
                <span>Funding Amount (₹ INR)</span>
              </label>
              <div className="form-input-container">
                <span className="form-input-prefix" style={{ fontWeight: 700 }}>₹</span>
                <input
                  id="sysAmount"
                  type="number"
                  min="1"
                  className="form-input has-prefix"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !toAccount}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <Spinner size={16} color="#FFFFFF" />
                  Issuing System Funds...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Inject {formatCurrency(amount || 0)} Initial Funds
                </>
              )}
            </button>
          </form>

          {result && (
            <div
              style={{
                marginTop: '10px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: result.success ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                color: result.success ? 'var(--accent-green)' : 'var(--accent-red)',
                border: `1px solid ${result.success ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`,
                fontSize: '0.88rem',
              }}
            >
              {result.success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <CheckCircle2 size={18} />
                    <span>{result.message}</span>
                  </div>
                  {result.transaction?._id && (
                    <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>
                      Transaction ID: {result.transaction._id}
                    </span>
                  )}
                </div>
              ) : (
                <div>{result.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

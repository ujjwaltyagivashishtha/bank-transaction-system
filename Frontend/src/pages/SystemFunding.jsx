import React, { useState } from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
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
          <div className="empty-icon-circle" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red-light)', border: '1px solid var(--accent-red-border)' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="empty-title">Access Restricted</div>
          <p className="empty-desc">
            This module is reserved exclusively for authenticated System Administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleFund = async (e) => {
    e.preventDefault();
    if (!toAccount.trim()) { showError('Please select or specify a target Account ID.'); return; }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) { showError('Please specify a positive funding amount.'); return; }

    setLoading(true);
    setResult(null);
    const idempotencyKey = generateIdempotencyKey('sys_fund');

    try {
      const response = await createInitialFundsTransaction({ toAccount: toAccount.trim(), amount: numericAmount, idempotencyKey });
      setResult({ success: true, message: response.message || 'System initial funds issued successfully.', transaction: response.transaction });
      showSuccess(`Injected ${formatCurrency(numericAmount)} initial funds!`);
      await fetchAccounts();
    } catch (err) {
      const message = err.response?.data?.message || 'System funding failed.';
      setResult({ success: false, error: message });
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <Sparkles size={18} />
            </div>
            <h1 className="page-title">System Initial Funding</h1>
          </div>
          <p className="page-subtitle">
            Admin tool to mint and allocate initial system ledger reserves to specific accounts.
          </p>
        </div>
      </header>

      <div style={{ maxWidth: '600px' }}>
        <div className="transfer-card">
          {/* Warning Banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            background: 'var(--accent-amber-bg)', color: '#D97706',
            padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.83rem',
            border: '1px solid var(--accent-amber-border)',
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              This operation <strong>debits the primary system reserves</strong> and credits the target ledger account directly. Use with caution.
            </span>
          </div>

          <form onSubmit={handleFund} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sysToAccount">
                <span>Select Target Account</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Or enter any valid Account ID below</span>
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
                    {formatAccountId(acc._id)} · {acc.status}
                  </option>
                ))}
              </select>
              <input
                id="sysToAccount"
                type="text"
                className="form-input"
                placeholder="Or type custom Account ID..."
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                required
              />
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
              {/* Preset amounts */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {[1000, 5000, 10000, 50000, 100000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setAmount(preset.toString())}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !toAccount}
              style={{
                background: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
              }}
            >
              {loading ? (
                <>
                  <Spinner size={16} color="#FFFFFF" />
                  Issuing System Funds...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Inject {formatCurrency(amount || 0)} Initial Funds
                </>
              )}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: result.success ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
              border: `1px solid ${result.success ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`,
              color: result.success ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
              fontSize: '0.85rem',
            }}>
              {result.success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <CheckCircle2 size={16} />
                    <span>{result.message}</span>
                  </div>
                  {result.transaction?._id && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>
                      TX: {result.transaction._id}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <AlertTriangle size={16} />
                  <span>{result.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, RefreshCw, Wallet } from 'lucide-react';
import { useAccounts } from '../../context/AccountContext';
import { formatCurrency } from '../../utils/formatCurrency';

export default function MainBalanceCard() {
  const { totalBalance, accounts, statusCounts, loading, fetchAccounts } = useAccounts();
  const navigate = useNavigate();

  const activePercent = accounts.length > 0
    ? Math.round((statusCounts.active / accounts.length) * 100)
    : 0;

  return (
    <section className="hero-metric-card" aria-label="Total Balance Overview">
      {/* Header Row */}
      <div className="hero-metric-header">
        <div className="hero-metric-label">
          <div className="hero-live-dot" />
          Total Portfolio Balance
        </div>
        <button
          onClick={fetchAccounts}
          className="btn btn-secondary btn-sm"
          title="Refresh real-time ledger balance"
          aria-label="Refresh balance"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw
            size={13}
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          />
          <span>Sync Ledger</span>
        </button>
      </div>

      {/* Main Balance */}
      <div className="hero-balance-row">
        <span
          className="hero-balance-number"
          id="hero-total-balance"
          style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}
        >
          {formatCurrency(totalBalance)}
        </span>
        {accounts.length > 0 && (
          <div
            className="hero-badge-pill"
            title={`${statusCounts.active} of ${accounts.length} accounts are ACTIVE`}
          >
            <ArrowUpRight size={14} />
            <span>{activePercent}% Active</span>
          </div>
        )}
        {accounts.length === 0 && (
          <div className="hero-badge-pill" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-tertiary)' }}>
            <Wallet size={14} />
            <span>No accounts yet</span>
          </div>
        )}
      </div>

      {/* Footer Stat Row */}
      <div className="hero-metric-footer">
        <button
          onClick={() => navigate('/accounts')}
          className="hero-action-link"
          aria-label="View all accounts"
        >
          <span>View Accounts</span>
          <ArrowRight size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="hero-stats-subtext" style={{ marginBottom: '2px' }}>
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} registered
            </div>
            <div className="hero-stats-subtext">
              {statusCounts.active} active · {statusCounts.frozen} frozen · {statusCounts.closed} closed
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

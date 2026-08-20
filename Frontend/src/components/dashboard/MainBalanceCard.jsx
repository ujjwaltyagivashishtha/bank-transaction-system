import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
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
      <div className="hero-metric-header">
        <span className="hero-metric-label">Total Liquid Balance</span>
        <button
          onClick={fetchAccounts}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Refresh real-time ledger balance"
          aria-label="Refresh balance"
        >
          <RefreshCw size={13} className={loading ? 'pulse-ring' : ''} />
          <span>Sync Ledger</span>
        </button>
      </div>

      <div className="hero-balance-row">
        <span className="hero-balance-number" id="hero-total-balance">
          {formatCurrency(totalBalance)}
        </span>
        <div className="hero-badge-pill" title={`${statusCounts.active} of ${accounts.length} accounts are ACTIVE`}>
          <ArrowUpRight size={15} />
          <span>{accounts.length > 0 ? `${activePercent}% Active` : '0 Accounts'}</span>
        </div>
      </div>

      <div className="hero-metric-footer">
        <button
          onClick={() => navigate('/accounts')}
          className="hero-action-link"
          aria-label="View all accounts"
        >
          <span>View Accounts</span>
          <ArrowRight size={16} />
        </button>
        <span className="hero-stats-subtext">
          Derived from immutable ledger • {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} registered
        </span>
      </div>
    </section>
  );
}

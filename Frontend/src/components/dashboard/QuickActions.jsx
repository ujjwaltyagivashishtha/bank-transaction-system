import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, PlusCircle, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { useAccounts } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';

export default function QuickActions({ onOpenCreateAccount }) {
  const navigate = useNavigate();
  const { fetchAccounts, loading } = useAccounts();
  const { isSystemUser } = useAuth();

  return (
    <div className="quick-actions-bar" aria-label="Quick Actions">
      <button
        className="action-card-btn"
        onClick={() => navigate('/transfer')}
        id="quick-action-transfer"
      >
        <div className="action-icon-circle">
          <ArrowRightLeft size={18} />
        </div>
        <div className="action-card-info">
          <span className="action-card-title">Transfer Funds</span>
          <span className="action-card-desc">Send INR between active accounts</span>
        </div>
      </button>

      <button
        className="action-card-btn"
        onClick={onOpenCreateAccount}
        id="quick-action-create-account"
      >
        <div className="action-icon-circle">
          <PlusCircle size={18} />
        </div>
        <div className="action-card-info">
          <span className="action-card-title">Open New Account</span>
          <span className="action-card-desc">Instant digital ledger account</span>
        </div>
      </button>

      <button
        className="action-card-btn"
        onClick={fetchAccounts}
        id="quick-action-refresh-balances"
      >
        <div className="action-icon-circle">
          <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </div>
        <div className="action-card-info">
          <span className="action-card-title">Refresh Balances</span>
          <span className="action-card-desc">Fetch latest derived ledger</span>
        </div>
      </button>

      {isSystemUser && (
        <button
          className="action-card-btn"
          onClick={() => navigate('/system-funding')}
          id="quick-action-system-funding"
        >
          <div className="action-icon-circle" style={{ color: '#F59E0B' }}>
            <Sparkles size={18} />
          </div>
          <div className="action-card-info">
            <span className="action-card-title">System Funding</span>
            <span className="action-card-desc">Inject system initial liquidity</span>
          </div>
        </button>
      )}
    </div>
  );
}

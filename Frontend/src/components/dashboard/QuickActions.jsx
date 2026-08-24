import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, PlusCircle, RefreshCw, Sparkles, BarChart3 } from 'lucide-react';
import { useAccounts } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';

const actions = [
  {
    id: 'transfer',
    icon: ArrowRightLeft,
    title: 'Transfer Funds',
    desc: 'Send INR between accounts',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    glow: 'rgba(99, 102, 241, 0.4)',
  },
  {
    id: 'create-account',
    icon: PlusCircle,
    title: 'Open Account',
    desc: 'Instant digital ledger',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'refresh',
    icon: RefreshCw,
    title: 'Sync Balances',
    desc: 'Fetch latest ledger state',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
];

export default function QuickActions({ onOpenCreateAccount }) {
  const navigate = useNavigate();
  const { fetchAccounts, loading } = useAccounts();
  const { isSystemUser } = useAuth();

  const handleAction = (id) => {
    if (id === 'transfer') navigate('/transfer');
    else if (id === 'create-account') onOpenCreateAccount?.();
    else if (id === 'refresh') fetchAccounts();
    else if (id === 'system-funding') navigate('/system-funding');
  };

  const allActions = isSystemUser
    ? [...actions, {
        id: 'system-funding',
        icon: Sparkles,
        title: 'System Funding',
        desc: 'Inject initial liquidity',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        glow: 'rgba(245, 158, 11, 0.4)',
      }]
    : actions;

  return (
    <div className="quick-actions-bar" aria-label="Quick Actions">
      {allActions.map(({ id, icon: Icon, title, desc, gradient, glow }) => (
        <button
          key={id}
          className="action-card-btn"
          onClick={() => handleAction(id)}
          id={`quick-action-${id}`}
          style={{ '--action-glow': glow }}
        >
          <div
            className="action-icon-circle"
            style={{ background: gradient, color: '#FFF', border: 'none', boxShadow: `0 4px 14px ${glow}` }}
          >
            <Icon
              size={18}
              style={{ animation: id === 'refresh' && loading ? 'spin 1s linear infinite' : 'none' }}
            />
          </div>
          <div className="action-card-info">
            <span className="action-card-title">{title}</span>
            <span className="action-card-desc">{desc}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

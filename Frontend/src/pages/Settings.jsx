import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Key, LogOut, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../context/AccountContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatCurrency';
import CopyButton from '../components/common/CopyButton';

export default function Settings() {
  const { user, token, isSystemUser, logout } = useAuth();
  const { accounts, totalBalance } = useAccounts();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showSuccess('Signed out securely.');
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Settings & Profile</h1>
          <p className="page-subtitle">
            Manage your banking profile, security authentication, and session settings.
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Profile Card */}
        <div className="account-card" style={{ gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.25rem' }}>
              {initials}
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{user?.name || 'Bank User'}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                {user?.email || 'user@example.com'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="summary-row">
              <span className="summary-label">Account Role</span>
              <span className="badge-status active">
                {isSystemUser ? 'System Administrator' : 'Standard Banking User'}
              </span>
            </div>
            {user?._id && (
              <div className="summary-row">
                <span className="summary-label">User ID</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {user._id}
                  </span>
                  <CopyButton text={user._id} label="User ID" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Banking Overview Card */}
        <div className="account-card" style={{ gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} />
            <span>Banking Summary</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="summary-row">
              <span className="summary-label">Total Accounts</span>
              <span className="summary-val">{accounts.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Total Liquid Balance</span>
              <span className="summary-val" style={{ color: 'var(--accent-green)' }}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Ledger Engine</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>MongoDB Aggregations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Sign Out Section */}
      <div className="transfer-card" style={{ marginTop: '10px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} />
          <span>Security & Authentication</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="summary-row">
            <span className="summary-label">JWT Token Session</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              Active (Expires in 3 days)
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Cookie Integration</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              withCredentials enabled
            </span>
          </div>
        </div>

        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-sm"
            style={{
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red)',
              border: '1px solid var(--accent-red-border)',
            }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Sign Out of All Sessions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

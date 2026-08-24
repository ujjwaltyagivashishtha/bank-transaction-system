import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, Wallet, CheckCircle2, Key, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../context/AccountContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatCurrency';
import CopyButton from '../components/common/CopyButton';

function SettingsCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
      }} />
      {children}
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-glass)' }}>
      <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, token, isSystemUser, logout } = useAuth();
  const { accounts, totalBalance, statusCounts } = useAccounts();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showSuccess('Signed out securely.');
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Settings & Profile</h1>
          <p className="page-subtitle">Manage your banking profile, security, and session settings.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Profile Card */}
        <SettingsCard>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              className="user-avatar"
              style={{
                width: '60px', height: '60px', fontSize: '1.3rem',
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              }}
            >
              {initials}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                {user?.name || 'Bank User'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {user?.email || 'user@example.com'}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            <InfoRow label="Account Role">
              <span
                className="badge-status active"
                style={{ background: isSystemUser ? 'var(--accent-amber-bg)' : undefined, color: isSystemUser ? 'var(--accent-amber)' : undefined, borderColor: isSystemUser ? 'var(--accent-amber-border)' : undefined }}
              >
                {isSystemUser ? '⚡ System Admin' : '✓ Standard User'}
              </span>
            </InfoRow>
            {user?._id && (
              <InfoRow label="User ID">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {user._id.substring(0, 16)}...
                  </span>
                  <CopyButton text={user._id} label="User ID" />
                </div>
              </InfoRow>
            )}
          </div>
        </SettingsCard>

        {/* Banking Summary */}
        <SettingsCard>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Wallet size={17} color="var(--accent-blue-light)" />
            Banking Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <InfoRow label="Total Accounts">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{accounts.length}</span>
            </InfoRow>
            <InfoRow label="Total Balance">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green-light)' }}>
                {formatCurrency(totalBalance)}
              </span>
            </InfoRow>
            <InfoRow label="Active Accounts">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{statusCounts.active}</span>
            </InfoRow>
            <InfoRow label="Ledger Engine">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>MongoDB Aggregations</span>
            </InfoRow>
          </div>
        </SettingsCard>
      </div>

      {/* Security Card */}
      <SettingsCard>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <Shield size={17} color="var(--accent-blue-light)" />
          Security & Authentication
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <InfoRow label="JWT Token Session">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green-light)', fontWeight: 600, fontSize: '0.83rem' }}>
              <CheckCircle2 size={15} />
              Active · Expires in 3 days
            </span>
          </InfoRow>
          <InfoRow label="Cookie Integration">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>withCredentials: true</span>
          </InfoRow>
          <InfoRow label="Encryption">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>256-bit AES</span>
          </InfoRow>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--accent-red-bg)',
              color: 'var(--accent-red-light)',
              border: '1px solid var(--accent-red-border)',
              gap: '8px',
            }}
            onClick={handleLogout}
          >
            <LogOut size={14} />
            <span>Sign Out of All Sessions</span>
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}

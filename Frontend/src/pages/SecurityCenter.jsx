import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, Bell, CheckCircle2, AlertCircle, LogOut, Smartphone, Eye, EyeOff, ShieldCheck, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../context/AccountContext';
import { useToast } from '../context/ToastContext';
import { changePassword, updatePreferences, getSecurityStatus } from '../api/auth.api';
import { freezeAccount, unfreezeAccount } from '../api/accounts.api';
import { formatAccountId } from '../utils/formatAccountId';
import Spinner from '../components/common/Spinner';

export default function SecurityCenter() {
  const { user, logout } = useAuth();
  const { accounts, fetchAccounts } = useAccounts();
  const { showSuccess, showError } = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Preferences state
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    transferAlerts: true,
    securityAlerts: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);

  // Security status state
  const [securityStatus, setSecurityStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const loadStatus = async () => {
    try {
      const data = await getSecurityStatus();
      setSecurityStatus(data.security);
      if (data.security?.preferences) {
        setPrefs(data.security.preferences);
      }
    } catch (err) {
      console.warn('Failed to fetch security status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Password change submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadStatus();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  // Preference toggle submission
  const handleTogglePref = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefsLoading(true);
    try {
      await updatePreferences(updated);
      showSuccess('Notification preferences updated');
    } catch (err) {
      showError('Failed to update preferences');
      setPrefs(prefs); // rollback
    } finally {
      setPrefsLoading(false);
    }
  };

  // Account freeze toggle
  const handleToggleFreeze = async (account) => {
    try {
      if (account.status === 'FROZEN') {
        await unfreezeAccount(account._id);
        showSuccess(`Account ${account.accountNumber || account._id} reactivated`);
      } else {
        await freezeAccount(account._id, 'Security center user freeze');
        showSuccess(`Account ${account.accountNumber || account._id} has been locked`);
      }
      await fetchAccounts();
      await loadStatus();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to toggle account lock');
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(newPassword);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#059669'];

  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981'
            }}>
              <ShieldCheck size={18} />
            </div>
            <h1 className="page-title">Security Center</h1>
          </div>
          <p className="page-subtitle">
            Manage your credentials, active session security, instant account lockouts, and cryptographic event logs.
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* 1. Password Change Card */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Key size={18} color="var(--accent-blue-light)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Change Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password (min. 8 characters)</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Create strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              {newPassword && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Strength:</span>
                    <span style={{ fontWeight: 700, color: strengthColors[strengthScore] }}>{strengthLabels[strengthScore]}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(strengthScore / 4) * 100}%`, background: strengthColors[strengthScore], transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPw ? 'Hide' : 'Show'}</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={pwLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Notification Preferences & Session Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Notification Alerts */}
          <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Bell size={18} color="var(--accent-blue-light)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Notification Preferences</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'transferAlerts', title: 'Transfer Confirmation Alerts', desc: 'Email receipt upon each ledger debit or credit' },
                { key: 'securityAlerts', title: 'Security & Auth Notices', desc: 'Alerts when password is changed or account is frozen' },
                { key: 'emailNotifications', title: 'Service Announcements', desc: 'System updates and maintenance notices' },
              ].map(({ key, title, desc }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{desc}</div>
                  </div>
                  <button
                    className={`btn btn-sm ${prefs[key] ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minWidth: '60px', padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => handleTogglePref(key)}
                  >
                    {prefs[key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Session & Logout */}
          <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Smartphone size={18} color="var(--accent-green-light)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Active Session</h3>
              </div>
              <span className="badge-status active">Active · 72h TTL</span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Signed in as <strong>{user?.email}</strong>. Session is guarded by HTTP-only secure cookie and server-side token revocation blacklist.
            </p>

            <button
              className="btn btn-secondary btn-full"
              style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red-border)' }}
              onClick={logout}
            >
              <LogOut size={15} />
              <span>Revoke Token & Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Account Freeze Management */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Lock size={18} color="var(--accent-amber)" />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Instant Account Lockout</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Freeze any of your digital accounts to immediately block outgoing transfers during suspected compromise.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {accounts.map((acc) => (
            <div
              key={acc._id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)'
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                  {acc.accountNumber ? `A/C ${acc.accountNumber}` : formatAccountId(acc._id)}
                </div>
                <div style={{ fontSize: '0.75rem', color: acc.status === 'FROZEN' ? 'var(--accent-amber)' : 'var(--accent-green-light)', fontWeight: 600 }}>
                  Status: {acc.status}
                </div>
              </div>

              {acc.status !== 'CLOSED' && (
                <button
                  className={`btn btn-sm ${acc.status === 'FROZEN' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => handleToggleFreeze(acc)}
                >
                  {acc.status === 'FROZEN' ? 'Reactivate' : 'Freeze Account'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Security Audit Log Timeline */}
      {securityStatus?.recentSecurityEvents?.length > 0 && (
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px', marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <History size={18} color="var(--accent-blue-light)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Recent Security Audit Timeline</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {securityStatus.recentSecurityEvents.map((evt) => (
              <div
                key={evt._id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.78rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{evt.action}</span>
                  <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>
                    {evt.details?.event || evt.details?.reason || 'Security event logged'}
                  </span>
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(evt.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

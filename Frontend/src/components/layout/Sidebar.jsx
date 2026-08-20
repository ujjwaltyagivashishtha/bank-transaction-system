import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  History,
  ChevronDown,
  Search,
  PlusCircle,
  LogOut,
  Sparkles,
  Layers,
  FileText,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../context/AccountContext';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';

export default function Sidebar({ onOpenCreateAccount }) {
  const { user, logout, isSystemUser } = useAuth();
  const { accounts, statusCounts, balances } = useAccounts();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Get user initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredAccounts = accounts.filter((acc) =>
    acc._id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar-panel" aria-label="Main Sidebar Navigation">
      {/* 1. Mac-Style Window Dots */}
      <div className="sidebar-mac-dots">
        <span className="mac-dot red" />
        <span className="mac-dot yellow" />
        <span className="mac-dot green" />
      </div>

      {/* 2. User Capsule */}
      <div style={{ position: 'relative' }}>
        <div
          className="sidebar-user-card"
          onClick={() => setUserMenuOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={userMenuOpen}
        >
          <div className="user-card-left">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name-row">
                <span className="user-name">{user?.name || 'Bank User'}</span>
              </div>
              <span className="user-email">{user?.email || 'user@example.com'}</span>
            </div>
          </div>
          <ChevronDown
            size={16}
            color="var(--text-tertiary)"
            style={{
              transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>

        {/* Dropdown Menu */}
        {userMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <button
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', width: '100%' }}
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/settings');
              }}
            >
              Account Settings
            </button>
            <button
              className="btn btn-sm"
              style={{
                justifyContent: 'flex-start',
                width: '100%',
                color: 'var(--accent-red)',
                backgroundColor: 'var(--accent-red-bg)',
              }}
              onClick={handleLogout}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* 3. Navigation Section */}
      <div className="sidebar-section">
        <span className="section-label">Banking Operations</span>
        <ul className="sidebar-nav-list">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <div className="nav-link-content">
                <LayoutDashboard size={17} />
                <span>Dashboard</span>
              </div>
              <span className="nav-badge">{statusCounts.active}</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/accounts"
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <div className="nav-link-content">
                <Wallet size={17} />
                <span>My Accounts</span>
              </div>
              <span className="nav-badge">{accounts.length}</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/transfer"
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <div className="nav-link-content">
                <ArrowRightLeft size={17} />
                <span>Transfer Money</span>
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/activity"
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <div className="nav-link-content">
                <History size={17} />
                <span>Transfer Activity</span>
              </div>
            </NavLink>
          </li>
          {isSystemUser && (
            <li>
              <NavLink
                to="/system-funding"
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
              >
                <div className="nav-link-content">
                  <Sparkles size={17} color="#F59E0B" />
                  <span>System Funding</span>
                </div>
              </NavLink>
            </li>
          )}
        </ul>
      </div>

      {/* 4. Account Status Section */}
      <div className="sidebar-section">
        <span className="section-label">Account Status</span>
        <div className="status-pill-list">
          <div className="status-pill-row">
            <div className="status-pill-indicator">
              <span className="status-dot active" />
              <span>Active Accounts</span>
            </div>
            <span className="status-count">{statusCounts.active}</span>
          </div>
          <div className="status-pill-row">
            <div className="status-pill-indicator">
              <span className="status-dot frozen" />
              <span>Frozen Accounts</span>
            </div>
            <span className="status-count">{statusCounts.frozen}</span>
          </div>
          <div className="status-pill-row">
            <div className="status-pill-indicator">
              <span className="status-dot closed" />
              <span>Closed Accounts</span>
            </div>
            <span className="status-count">{statusCounts.closed}</span>
          </div>
        </div>
      </div>

      {/* 5. Fast Account Directory / Search (Matching lower documents tree in reference) */}
      <div className="sidebar-section" style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-label">Your Accounts</span>
          {onOpenCreateAccount && (
            <button
              onClick={onOpenCreateAccount}
              style={{ color: 'var(--text-tertiary)', padding: '2px' }}
              title="Open New Account"
              aria-label="Create account shortcut"
            >
              <PlusCircle size={15} />
            </button>
          )}
        </div>

        <div className="sidebar-search-box">
          <Search size={14} />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search account ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
          {filteredAccounts.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px' }}>
              {accounts.length === 0 ? 'No accounts opened yet' : 'No matching accounts'}
            </span>
          ) : (
            filteredAccounts.map((acc) => (
              <div
                key={acc._id}
                onClick={() => navigate('/accounts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={13} color="var(--text-tertiary)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatAccountId(acc._id)}
                  </span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {formatCurrency(balances[acc._id] || 0, false)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

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
  CreditCard,
  Settings,
  Landmark,
  TrendingUp,
  Shield,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../context/AccountContext';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',       desc: 'Overview & metrics' },
  { to: '/accounts',   icon: Wallet,           label: 'My Accounts',    desc: 'Manage accounts'    },
  { to: '/transfer',   icon: ArrowRightLeft,   label: 'Transfer Funds', desc: 'Send money'         },
  { to: '/activity',   icon: History,          label: 'Activity Log',   desc: 'Transaction history'},
];

export default function Sidebar({ onOpenCreateAccount }) {
  const { user, logout, isSystemUser } = useAuth();
  const { accounts, statusCounts, balances, totalBalance } = useAccounts();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredAccounts = accounts.filter((acc) =>
    acc._id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allNavItems = [
    ...NAV_ITEMS,
    ...(isSystemUser ? [{ to: '/system-funding', icon: Sparkles, label: 'System Funding', desc: 'Inject liquidity', highlight: true }] : []),
  ];

  return (
    <aside className="sidebar-panel" aria-label="Main Navigation">

      {/* ── Brand Header ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Landmark size={18} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">TRANSACT</span>
          <span className="sidebar-brand-sub">Banking System</span>
        </div>
        <div className="sidebar-brand-badge">
          <span>LIVE</span>
        </div>
      </div>

      {/* ── User Profile Card ── */}
      <div className="sidebar-profile" onClick={() => setUserMenuOpen(p => !p)} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setUserMenuOpen(p => !p)}>
        <div className="sidebar-profile-avatar">{initials}</div>
        <div className="sidebar-profile-info">
          <span className="sidebar-profile-name">{user?.name || 'Bank User'}</span>
          <span className="sidebar-profile-email">{user?.email || 'user@example.com'}</span>
        </div>
        <ChevronDown
          size={14}
          className="sidebar-profile-chevron"
          style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>

      {/* User Dropdown */}
      {userMenuOpen && (
        <div className="sidebar-dropdown">
          <button
            className="sidebar-dropdown-item"
            onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
          >
            <Settings size={14} />
            <span>Account Settings</span>
          </button>
          <div className="sidebar-dropdown-divider" />
          <button
            className="sidebar-dropdown-item danger"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* ── Balance Snapshot ── */}
      <div className="sidebar-balance-card">
        <div className="sidebar-balance-label">
          <TrendingUp size={12} />
          Total Portfolio
        </div>
        <div className="sidebar-balance-value">{formatCurrency(totalBalance)}</div>
        <div className="sidebar-balance-meta">
          <span className="sidebar-balance-chip active">{statusCounts.active} active</span>
          {statusCounts.frozen > 0 && <span className="sidebar-balance-chip frozen">{statusCounts.frozen} frozen</span>}
          {statusCounts.closed > 0 && <span className="sidebar-balance-chip closed">{statusCounts.closed} closed</span>}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav" aria-label="App Navigation">
        <span className="sidebar-nav-label">Navigation</span>
        <ul className="sidebar-nav-list">
          {allNavItems.map(({ to, icon: Icon, label, desc, highlight }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''} ${highlight ? 'highlight' : ''}`}
              >
                <div className="sidebar-nav-icon">
                  <Icon size={16} />
                </div>
                <div className="sidebar-nav-info">
                  <span className="sidebar-nav-name">{label}</span>
                  <span className="sidebar-nav-desc">{desc}</span>
                </div>
                <ChevronRight size={13} className="sidebar-nav-arrow" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Account Directory ── */}
      <div className="sidebar-accounts">
        <div className="sidebar-accounts-header">
          <span className="sidebar-nav-label">Accounts</span>
          <button
            className="sidebar-accounts-add"
            onClick={onOpenCreateAccount}
            title="Open new account"
          >
            <PlusCircle size={13} />
          </button>
        </div>

        <div className="sidebar-search">
          <Search size={12} />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sidebar-account-list">
          {filteredAccounts.length === 0 ? (
            <p className="sidebar-account-empty">
              {accounts.length === 0 ? 'No accounts yet' : 'No matches'}
            </p>
          ) : (
            filteredAccounts.slice(0, 6).map((acc) => (
              <button
                key={acc._id}
                className="sidebar-account-row"
                onClick={() => navigate('/accounts')}
              >
                <div className="sidebar-account-row-left">
                  <div className={`sidebar-account-dot ${acc.status.toLowerCase()}`} />
                  <span className="sidebar-account-id">{formatAccountId(acc._id)}</span>
                </div>
                <span className="sidebar-account-bal">
                  {formatCurrency(balances[acc._id] || 0, false)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-footer-btn ${isActive ? 'active' : ''}`}
        >
          <Settings size={15} />
          <span>Settings</span>
        </NavLink>
        <div className="sidebar-footer-sep" />
        <button className="sidebar-footer-btn danger" onClick={handleLogout}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

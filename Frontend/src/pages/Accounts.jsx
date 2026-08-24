import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Search, CreditCard, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAccounts } from '../context/AccountContext';
import AccountCard from '../components/accounts/AccountCard';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'FROZEN', label: 'Frozen' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function Accounts() {
  const { accounts, balances, statusCounts, loading, fetchAccounts } = useAccounts();
  const { openCreateAccountModal } = useOutletContext();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredAccounts = accounts.filter((acc) => {
    if (filter === 'ACTIVE' && acc.status !== 'ACTIVE') return false;
    if (filter === 'FROZEN' && acc.status !== 'FROZEN') return false;
    if (filter === 'CLOSED' && acc.status !== 'CLOSED') return false;
    if (search.trim()) return acc._id.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const counts = {
    ALL: accounts.length,
    ACTIVE: statusCounts.active,
    FROZEN: statusCounts.frozen,
    CLOSED: statusCounts.closed,
  };

  return (
    <div className="dashboard-scroll-area">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">My Accounts</h1>
          <p className="page-subtitle">
            Manage your personal savings, checking, and digital ledger accounts.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchAccounts} title="Refresh accounts & balances">
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreateAccountModal} id="accounts-create-btn">
            <PlusCircle size={14} />
            <span>Open Account</span>
          </button>
        </div>
      </header>

      {/* Filter Bar + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="tab-filter-bar">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`tab-filter-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span style={{
                display: 'inline-block',
                marginLeft: '6px',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                background: filter === key ? 'var(--accent-blue-bg)' : 'var(--bg-glass)',
                color: filter === key ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                border: `1px solid ${filter === key ? 'var(--accent-blue-border)' : 'transparent'}`,
                padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
              }}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-search-box" style={{ width: '240px' }}>
          <Search size={13} />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search by Account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-circle" style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue-border)' }}>
            <CreditCard size={24} />
          </div>
          <div className="empty-title">No Accounts Found</div>
          <p className="empty-desc">
            {accounts.length === 0
              ? 'Open a digital ledger account to start transacting.'
              : 'No accounts match the current filter or search.'}
          </p>
          {accounts.length === 0 && (
            <button className="btn btn-primary" onClick={openCreateAccountModal} style={{ marginTop: '8px' }}>
              <PlusCircle size={15} />
              <span>Open New Account</span>
            </button>
          )}
        </div>
      ) : (
        <div className="accounts-grid">
          {filteredAccounts.map((acc, idx) => (
            <AccountCard
              key={acc._id}
              account={acc}
              balance={balances[acc._id] || 0}
              isPrimary={idx === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

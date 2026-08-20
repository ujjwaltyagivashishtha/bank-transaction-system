import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Search, CreditCard, RefreshCw } from 'lucide-react';
import { useAccounts } from '../context/AccountContext';
import AccountCard from '../components/accounts/AccountCard';

export default function Accounts() {
  const { accounts, balances, statusCounts, loading, fetchAccounts } = useAccounts();
  const { openCreateAccountModal } = useOutletContext();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredAccounts = accounts.filter((acc) => {
    if (filter === 'ACTIVE' && acc.status !== 'ACTIVE') return false;
    if (filter === 'FROZEN' && acc.status !== 'FROZEN') return false;
    if (filter === 'CLOSED' && acc.status !== 'CLOSED') return false;

    if (search.trim()) {
      return acc._id.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

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
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchAccounts}
            title="Refresh accounts & balances"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={openCreateAccountModal}
            id="accounts-create-btn"
          >
            <PlusCircle size={15} />
            <span>Open Account</span>
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div className="tab-filter-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <button
            className={`tab-filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({accounts.length})
          </button>
          <button
            className={`tab-filter-btn ${filter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setFilter('ACTIVE')}
          >
            Active ({statusCounts.active})
          </button>
          <button
            className={`tab-filter-btn ${filter === 'FROZEN' ? 'active' : ''}`}
            onClick={() => setFilter('FROZEN')}
          >
            Frozen ({statusCounts.frozen})
          </button>
          <button
            className={`tab-filter-btn ${filter === 'CLOSED' ? 'active' : ''}`}
            onClick={() => setFilter('CLOSED')}
          >
            Closed ({statusCounts.closed})
          </button>
        </div>

        <div className="sidebar-search-box" style={{ width: '260px' }}>
          <Search size={14} />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search by Account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Account Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="empty-state-box" style={{ background: '#FFFFFF', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
          <div className="empty-icon-circle">
            <CreditCard size={28} />
          </div>
          <div className="empty-title">No Accounts Found</div>
          <p className="empty-desc">
            {accounts.length === 0
              ? 'You do not have any registered bank accounts yet. Open a new digital ledger account to start transacting.'
              : 'No accounts match the current filter or search criteria.'}
          </p>
          {accounts.length === 0 && (
            <button className="btn btn-primary" onClick={openCreateAccountModal} style={{ marginTop: '8px' }}>
              <PlusCircle size={16} />
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

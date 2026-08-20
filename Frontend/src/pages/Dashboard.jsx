import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowRight, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../context/AccountContext';
import MainBalanceCard from '../components/dashboard/MainBalanceCard';
import QuickActions from '../components/dashboard/QuickActions';
import AccountCard from '../components/accounts/AccountCard';
import ActivityTable from '../components/activity/ActivityTable';

export default function Dashboard() {
  const { user } = useAuth();
  const { accounts, balances, loading } = useAccounts();
  const { openCreateAccountModal } = useOutletContext();
  const navigate = useNavigate();

  const [accountTab, setAccountTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'OTHER'

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  const filteredAccounts = accounts.filter((acc) => {
    if (accountTab === 'ACTIVE') return acc.status === 'ACTIVE';
    if (accountTab === 'OTHER') return acc.status !== 'ACTIVE';
    return true;
  });

  return (
    <div className="dashboard-scroll-area">
      {/* 1. Page Header */}
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {firstName}. Manage your accounts, balances and transactions securely.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={openCreateAccountModal}
            id="dashboard-header-create-btn"
          >
            <PlusCircle size={15} />
            <span>Open Account</span>
          </button>
        </div>
      </header>

      {/* 2. Main Balance Hero Metric Card (Matching Reference 340 Executions Card) */}
      <MainBalanceCard />

      {/* 3. Quick Action Buttons */}
      <QuickActions onOpenCreateAccount={openCreateAccountModal} />

      {/* 4. Accounts Overview Section with Tab Filter Bar */}
      <section className="content-section" aria-label="Accounts Section">
        <div className="section-title-row">
          <h2 className="section-heading">My Bank Accounts</h2>
          <button
            onClick={() => navigate('/accounts')}
            className="btn btn-outline btn-sm"
          >
            <span>View All ({accounts.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Tab switcher matching reference layout */}
        <div className="tab-filter-bar">
          <button
            className={`tab-filter-btn ${accountTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setAccountTab('ALL')}
          >
            All Accounts ({accounts.length})
          </button>
          <button
            className={`tab-filter-btn ${accountTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setAccountTab('ACTIVE')}
          >
            Active Accounts ({accounts.filter((a) => a.status === 'ACTIVE').length})
          </button>
          <button
            className={`tab-filter-btn ${accountTab === 'OTHER' ? 'active' : ''}`}
            onClick={() => setAccountTab('OTHER')}
          >
            Inactive / Frozen ({accounts.filter((a) => a.status !== 'ACTIVE').length})
          </button>
        </div>

        {/* Grid of Accounts */}
        {filteredAccounts.length === 0 ? (
          <div className="empty-state-box" style={{ background: '#FFFFFF', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
            <div className="empty-icon-circle">
              <CreditCard size={26} />
            </div>
            <div className="empty-title">No Accounts Found</div>
            <p className="empty-desc">
              {accounts.length === 0
                ? 'You do not have any registered bank accounts yet. Open your first account in seconds.'
                : 'No accounts match the selected status filter.'}
            </p>
            {accounts.length === 0 && (
              <button className="btn btn-primary" onClick={openCreateAccountModal} style={{ marginTop: '10px' }}>
                <PlusCircle size={16} />
                <span>Open Your First Account</span>
              </button>
            )}
          </div>
        ) : (
          <div className="accounts-grid">
            {filteredAccounts.slice(0, 4).map((acc, index) => (
              <AccountCard
                key={acc._id}
                account={acc}
                balance={balances[acc._id] || 0}
                isPrimary={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Recent Activity Section */}
      <section className="content-section" aria-label="Recent Activity Section">
        <div className="section-title-row">
          <h2 className="section-heading">Recent Session Activity</h2>
          <button
            onClick={() => navigate('/activity')}
            className="btn btn-outline btn-sm"
          >
            <span>View Activity</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <ActivityTable limit={5} />
      </section>
    </div>
  );
}

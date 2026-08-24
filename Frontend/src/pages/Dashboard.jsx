import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowRight, CreditCard, TrendingUp, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../context/AccountContext';
import MainBalanceCard from '../components/dashboard/MainBalanceCard';
import QuickActions from '../components/dashboard/QuickActions';
import AccountCard from '../components/accounts/AccountCard';
import ActivityTable from '../components/activity/ActivityTable';
import { formatCurrency } from '../utils/formatCurrency';

function StatCard({ icon: Icon, label, value, color, bg, glow }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px 20px',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-lg)',
        flex: '1',
        minWidth: '160px',
        backdropFilter: 'blur(10px)',
        transition: 'all var(--ease-smooth)',
      }}
      className="stat-card"
    >
      <div
        style={{
          width: '40px', height: '40px',
          borderRadius: 'var(--radius-md)',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
          boxShadow: `0 4px 12px ${glow}`,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { accounts, balances, loading, totalBalance, statusCounts } = useAccounts();
  const { openCreateAccountModal } = useOutletContext();
  const navigate = useNavigate();

  const [accountTab, setAccountTab] = useState('ALL');

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  const filteredAccounts = accounts.filter((acc) => {
    if (accountTab === 'ACTIVE') return acc.status === 'ACTIVE';
    if (accountTab === 'OTHER') return acc.status !== 'ACTIVE';
    return true;
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard-scroll-area">
      {/* 1. Page Header */}
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">{greeting}, {firstName} 👋</h1>
          <p className="page-subtitle">
            Here's your financial overview. All balances are derived from the immutable ledger.
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

      {/* 2. Stat Summary Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', animation: 'fadeSlideUp 0.5s var(--ease-smooth) 0.05s both' }}>
        <StatCard
          icon={TrendingUp}
          label="Total Balance"
          value={formatCurrency(totalBalance, false)}
          color="#10B981"
          bg="rgba(16,185,129,0.15)"
          glow="rgba(16,185,129,0.3)"
        />
        <StatCard
          icon={CreditCard}
          label="Total Accounts"
          value={accounts.length.toString()}
          color="#6366F1"
          bg="rgba(99,102,241,0.15)"
          glow="rgba(99,102,241,0.3)"
        />
        <StatCard
          icon={ShieldCheck}
          label="Active"
          value={statusCounts.active.toString()}
          color="#34D399"
          bg="rgba(52,211,153,0.15)"
          glow="rgba(52,211,153,0.3)"
        />
        <StatCard
          icon={Activity}
          label="Frozen / Closed"
          value={`${statusCounts.frozen + statusCounts.closed}`}
          color="#F59E0B"
          bg="rgba(245,158,11,0.15)"
          glow="rgba(245,158,11,0.3)"
        />
      </div>

      {/* 3. Main Balance Hero */}
      <MainBalanceCard />

      {/* 4. Quick Actions */}
      <QuickActions onOpenCreateAccount={openCreateAccountModal} />

      {/* 5. Accounts Section */}
      <section className="content-section" aria-label="Accounts Section">
        <div className="section-title-row">
          <h2 className="section-heading">My Bank Accounts</h2>
          <button onClick={() => navigate('/accounts')} className="btn btn-outline btn-sm">
            <span>View All ({accounts.length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="tab-filter-bar">
          {[
            { key: 'ALL', label: `All (${accounts.length})` },
            { key: 'ACTIVE', label: `Active (${accounts.filter(a => a.status === 'ACTIVE').length})` },
            { key: 'OTHER', label: `Other (${accounts.filter(a => a.status !== 'ACTIVE').length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`tab-filter-btn ${accountTab === key ? 'active' : ''}`}
              onClick={() => setAccountTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon-circle" style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue-border)' }}>
              <CreditCard size={24} />
            </div>
            <div className="empty-title">No Accounts Found</div>
            <p className="empty-desc">
              {accounts.length === 0
                ? 'Open your first digital ledger account to start transacting.'
                : 'No accounts match the selected status filter.'}
            </p>
            {accounts.length === 0 && (
              <button className="btn btn-primary" onClick={openCreateAccountModal} style={{ marginTop: '8px' }}>
                <PlusCircle size={15} />
                <span>Open First Account</span>
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

      {/* 6. Recent Activity */}
      <section className="content-section" aria-label="Recent Activity Section">
        <div className="section-title-row">
          <h2 className="section-heading">Recent Session Activity</h2>
          <button onClick={() => navigate('/activity')} className="btn btn-outline btn-sm">
            <span>View Activity</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <ActivityTable limit={5} />
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { History, ArrowRight, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useActivity } from '../../context/ActivityContext';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';
import StatusBadge from '../common/StatusBadge';
import CopyButton from '../common/CopyButton';

export default function ActivityTable({ limit }) {
  const { sessionTransactions } = useActivity();
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter transactions
  const filteredTransactions = sessionTransactions.filter((tx) => {
    if (filter === 'COMPLETED' && tx.status !== 'COMPLETED') return false;
    if (filter === 'PENDING' && tx.status !== 'PENDING') return false;
    if (filter === 'FAILED' && tx.status !== 'FAILED' && tx.status !== 'REVERSED') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchFrom = String(tx.fromAccount || '').toLowerCase().includes(term);
      const matchTo = String(tx.toAccount || '').toLowerCase().includes(term);
      const matchKey = String(tx.idempotencyKey || '').toLowerCase().includes(term);
      const matchId = String(tx.id || '').toLowerCase().includes(term);
      return matchFrom || matchTo || matchKey || matchId;
    }
    return true;
  });

  const displayedList = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;

  return (
    <div className="content-section">
      {/* Controls & Filter Tabs */}
      {!limit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div className="tab-filter-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <button
              className={`tab-filter-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All Activity ({sessionTransactions.length})
            </button>
            <button
              className={`tab-filter-btn ${filter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setFilter('COMPLETED')}
            >
              Completed
            </button>
            <button
              className={`tab-filter-btn ${filter === 'PENDING' ? 'active' : ''}`}
              onClick={() => setFilter('PENDING')}
            >
              Processing
            </button>
            <button
              className={`tab-filter-btn ${filter === 'FAILED' ? 'active' : ''}`}
              onClick={() => setFilter('FAILED')}
            >
              Failed / Reversed
            </button>
          </div>

          <div className="sidebar-search-box" style={{ width: '240px' }}>
            <Search size={14} />
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Filter by account or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="activity-table-container">
        {displayedList.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon-circle">
              <History size={26} />
            </div>
            <div className="empty-title">No Session Activity Found</div>
            <p className="empty-desc">
              {sessionTransactions.length === 0
                ? 'Transactions performed during this active browser session will be securely tracked and recorded here.'
                : 'No transactions match the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <table className="activity-table" aria-label="Transaction Activity Table">
            <thead>
              <tr>
                <th>Type / Status</th>
                <th>From Account</th>
                <th>To Account</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {displayedList.map((tx) => {
                const dateObj = new Date(tx.createdAt);
                const formattedTime = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Just now';

                return (
                  <tr key={tx.id || tx.idempotencyKey}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StatusBadge status={tx.status} />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatAccountId(tx.fromAccount)}
                        </span>
                        <CopyButton text={tx.fromAccount} label="From Account" />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatAccountId(tx.toAccount)}
                        </span>
                        <CopyButton text={tx.toAccount} label="To Account" />
                      </div>
                    </td>
                    <td>
                      <span className="amount-debit">{formatCurrency(tx.amount)}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formattedTime}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'var(--text-tertiary)',
                          }}
                          title={tx.id}
                        >
                          {String(tx.id).substring(0, 8)}...
                        </span>
                        <CopyButton text={tx.id} label="Transaction ID" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

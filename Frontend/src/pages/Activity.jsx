import React from 'react';
import { History, Info, Zap } from 'lucide-react';
import ActivityTable from '../components/activity/ActivityTable';

export default function Activity() {
  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Ledger Transaction Activity</h1>
          <p className="page-subtitle">
            Authenticated, persistent double-entry financial ledger records, statement downloads, and receipts.
          </p>
        </div>
      </header>

      {/* Info Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          background: 'var(--accent-blue-bg)',
          border: '1px solid var(--accent-blue-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          fontSize: '0.83rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={16} color="var(--accent-blue-light)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          <strong style={{ color: 'var(--accent-blue-light)' }}>Persistent Audit Trail: </strong>
          All transactions are settled atomically on the immutable double-entry ledger. View printable receipts, generate statements, or download sanitized CSV records.
        </span>
      </div>

      <ActivityTable />
    </div>
  );
}

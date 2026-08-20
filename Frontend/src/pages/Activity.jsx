import React from 'react';
import { History, Info } from 'lucide-react';
import ActivityTable from '../components/activity/ActivityTable';

export default function Activity() {
  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Transfer Activity</h1>
          <p className="page-subtitle">
            Real-time transaction logs and transfer execution records for your active session.
          </p>
        </div>
      </header>

      {/* Note about backend persistent history ready */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg-surface-secondary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={18} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Session Audit Log:</strong> Displays transactions executed during your current browser session. Structured to seamlessly connect with future persistent backend ledger audit endpoints.
        </span>
      </div>

      <ActivityTable />
    </div>
  );
}

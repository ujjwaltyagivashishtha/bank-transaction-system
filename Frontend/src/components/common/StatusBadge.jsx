import React from 'react';

/**
 * Reusable status badge component for accounts and transactions
 * @param {{ status: 'ACTIVE'|'FROZEN'|'CLOSED'|'PENDING'|'COMPLETED'|'FAILED'|'REVERSED', text?: string }} props
 */
export default function StatusBadge({ status, text }) {
  const statusLower = (status || 'unknown').toLowerCase();
  const label = text || status;

  return (
    <span className={`badge-status ${statusLower}`}>
      <span className={`status-dot ${statusLower}`}></span>
      {label}
    </span>
  );
}

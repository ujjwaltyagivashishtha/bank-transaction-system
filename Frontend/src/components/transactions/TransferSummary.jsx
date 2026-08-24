import React from 'react';
import { ShieldCheck, ArrowDown, Lock } from 'lucide-react';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';

export default function TransferSummary({ fromAccountId, toAccountId, amount, fromAccountBalance = 0 }) {
  const numericAmount = Number(amount) || 0;
  const remainingBalance = Math.max(0, fromAccountBalance - numericAmount);

  return (
    <div className="transfer-summary-card">
      <div className="summary-heading">
        <Lock size={16} color="var(--accent-blue-light)" />
        <span>Transfer Summary</span>
      </div>

      <div className="summary-amount-box">
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
          Total Transfer Amount
        </span>
        <span className="summary-amount-num">{formatCurrency(numericAmount)}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="summary-row">
          <span className="summary-label">From Account</span>
          <span className="summary-val">{fromAccountId ? formatAccountId(fromAccountId) : '—'}</span>
        </div>

        <div className="summary-row">
          <span className="summary-label">Available Sender Balance</span>
          <span className="summary-val" style={{ color: 'var(--accent-green-light)' }}>
            {formatCurrency(fromAccountBalance)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
          <ArrowDown size={14} color="var(--text-tertiary)" />
        </div>

        <div className="summary-row">
          <span className="summary-label">To Account</span>
          <span className="summary-val">{toAccountId ? formatAccountId(toAccountId) : '—'}</span>
        </div>

        <div className="summary-row" style={{ paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
          <span className="summary-label">Est. Remaining Balance</span>
          <span className="summary-val">{formatCurrency(remainingBalance)}</span>
        </div>
      </div>

      <div className="security-badge">
        <ShieldCheck size={16} color="#10B981" />
        <span>Protected with unique cryptographical idempotency key.</span>
      </div>
    </div>
  );
}

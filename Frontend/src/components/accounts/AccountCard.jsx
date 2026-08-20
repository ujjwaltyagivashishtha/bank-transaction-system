import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CreditCard, Shield } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import CopyButton from '../common/CopyButton';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AccountCard({ account, balance = 0, isPrimary = false }) {
  const navigate = useNavigate();
  const isSendable = account.status === 'ACTIVE';

  const handleQuickTransfer = () => {
    navigate('/transfer', { state: { selectedFromAccount: account._id } });
  };

  return (
    <div className="account-card" id={`account-card-${account._id}`}>
      <div className="account-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="account-type-badge">
            {isPrimary ? 'Primary Account' : 'Digital Ledger Account'}
          </span>
          <div className="account-id-chip" title="Click icon to copy full Account ID">
            <span>{formatAccountId(account._id)}</span>
            <CopyButton text={account._id} label="Account ID" />
          </div>
        </div>
        <StatusBadge status={account.status} />
      </div>

      <div className="account-card-body">
        <span className="account-balance-label">Available Balance</span>
        <span className="account-balance-val">{formatCurrency(balance)}</span>
      </div>

      <div className="account-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="currency-tag">{account.currency || 'INR'}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Immutable</span>
        </div>

        {isSendable ? (
          <button
            onClick={handleQuickTransfer}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            title="Send money from this account"
          >
            <ArrowRightLeft size={13} />
            <span>Transfer</span>
          </button>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            Transfers disabled ({account.status.toLowerCase()})
          </span>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CreditCard, Shield, Lock, Unlock, FileText } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import CopyButton from '../common/CopyButton';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';
import { freezeAccount, unfreezeAccount } from '../../api/accounts.api';
import { useAccounts } from '../../context/AccountContext';
import { useToast } from '../../context/ToastContext';

export default function AccountCard({ account, balance = 0, isPrimary = false, onOpenStatement }) {
  const navigate = useNavigate();
  const { fetchAccounts } = useAccounts();
  const { showSuccess, showError } = useToast();
  const [updating, setUpdating] = useState(false);

  const isSendable = account.status === 'ACTIVE';
  const isFrozen = account.status === 'FROZEN';

  const handleQuickTransfer = () => {
    navigate('/transfer', { state: { selectedFromAccount: account._id } });
  };

  const handleToggleFreeze = async () => {
    setUpdating(true);
    try {
      if (isFrozen) {
        await unfreezeAccount(account._id);
        showSuccess('Account reactivated successfully.');
      } else {
        await freezeAccount(account._id, 'User requested lock');
        showSuccess('Account has been frozen.');
      }
      await fetchAccounts();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update account status');
    } finally {
      setUpdating(false);
    }
  };

  const displayAccNumber = account.accountNumber || account._id;

  return (
    <div className="account-card" id={`account-card-${account._id}`}>
      <div className="account-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="account-type-badge">
            {isPrimary ? 'Primary Account' : 'Digital Ledger Account'}
          </span>
          <div className="account-id-chip" title="Click icon to copy full Account Number">
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {account.accountNumber ? `A/C ${account.accountNumber}` : formatAccountId(account._id)}
            </span>
            <CopyButton text={displayAccNumber} label="Account Number" />
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
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Double-Entry Verified</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Freeze / Unfreeze Toggle */}
          {account.status !== 'CLOSED' && (
            <button
              onClick={handleToggleFreeze}
              disabled={updating}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 8px', fontSize: '0.75rem' }}
              title={isFrozen ? 'Reactivate account' : 'Freeze account to prevent outgoing transfers'}
            >
              {isFrozen ? <Unlock size={12} /> : <Lock size={12} />}
              <span>{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
            </button>
          )}

          {/* Quick Transfer */}
          {isSendable ? (
            <button
              onClick={handleQuickTransfer}
              className="btn btn-primary btn-sm"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              title="Send money from this account"
            >
              <ArrowRightLeft size={13} />
              <span>Transfer</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              ({account.status.toLowerCase()})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

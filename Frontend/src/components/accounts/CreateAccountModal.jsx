import React from 'react';
import Modal from '../common/Modal';
import { useAccounts } from '../../context/AccountContext';
import { PlusCircle, ShieldCheck, Wallet } from 'lucide-react';
import Spinner from '../common/Spinner';

export default function CreateAccountModal({ isOpen, onClose }) {
  const { createAccount, creating } = useAccounts();

  const handleConfirm = async () => {
    const res = await createAccount();
    if (res.success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Open New Bank Account">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Wallet size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Indian Rupee (INR) Account</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Standard Digital Savings Ledger Account
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Your new account will be instantly initialized in <strong>ACTIVE</strong> status with a zero starting balance. You can receive transfers or fund it immediately.
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <ShieldCheck size={16} color="#10B981" />
          <span>Secured by MongoDB Double-Entry Immutable Ledger.</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={creating}>
            {creating ? (
              <>
                <Spinner size={16} color="#FFFFFF" />
                Opening Account...
              </>
            ) : (
              <>
                <PlusCircle size={16} />
                Confirm & Open Account
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

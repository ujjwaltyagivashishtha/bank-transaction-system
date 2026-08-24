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
            background: 'var(--accent-blue-bg)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--accent-blue-border)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Indian Rupee (INR) Account</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
            color: 'var(--text-secondary)',
            background: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green-border)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <ShieldCheck size={15} color="var(--accent-green-light)" />
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

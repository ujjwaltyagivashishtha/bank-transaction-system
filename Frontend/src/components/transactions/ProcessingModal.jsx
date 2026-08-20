import React from 'react';
import { CheckCircle2, XCircle, ShieldCheck, ArrowRightLeft, Clock } from 'lucide-react';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import StatusBadge from '../common/StatusBadge';
import CopyButton from '../common/CopyButton';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';

export default function ProcessingModal({
  isOpen,
  status, // 'PROCESSING' | 'SUCCESS' | 'ERROR'
  data,   // { fromAccount, toAccount, amount, transactionId, error, message }
  onClose,
  onViewActivity,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={status === 'PROCESSING' ? undefined : onClose}
      title={
        status === 'PROCESSING'
          ? 'Securing Transaction'
          : status === 'SUCCESS'
          ? 'Transfer Confirmation'
          : 'Transaction Failed'
      }
      hideCloseButton={status === 'PROCESSING'}
    >
      {/* 1. PROCESSING STATE */}
      {status === 'PROCESSING' && (
        <div className="processing-indicator-card">
          <div className="spinner-outer" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Processing Transfer</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Your transaction is being securely written to the immutable double-entry ledger.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-surface-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-tertiary)',
            }}
          >
            <Clock size={16} color="var(--accent-amber)" />
            <span>Please do not refresh or submit again while the ledger settles.</span>
          </div>
        </div>
      )}

      {/* 2. SUCCESS (COMPLETED) STATE */}
      {status === 'SUCCESS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-green-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-green)',
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Transfer Completed
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {formatCurrency(data?.amount)} transferred successfully.
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              border: '1px solid var(--border-light)',
            }}
          >
            <div className="summary-row">
              <span className="summary-label">Status</span>
              <StatusBadge status="COMPLETED" />
            </div>
            <div className="summary-row">
              <span className="summary-label">From Account</span>
              <span className="summary-val">{formatAccountId(data?.fromAccount)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">To Account</span>
              <span className="summary-val">{formatAccountId(data?.toAccount)}</span>
            </div>
            {data?.transactionId && (
              <div className="summary-row" style={{ paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <span className="summary-label">Transaction ID</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {String(data.transactionId).substring(0, 10)}...
                  </span>
                  <CopyButton text={data.transactionId} label="Transaction ID" />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            {onViewActivity && (
              <button className="btn btn-secondary" onClick={onViewActivity}>
                View Activity
              </button>
            )}
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. PENDING (STILL PROCESSING) STATE */}
      {status === 'PENDING_RESULT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-amber-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <Clock size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Transaction Still Processing
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {data?.message || 'The transaction is queued and undergoing ledger settlement.'}
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              border: '1px solid var(--border-light)',
            }}
          >
            <div className="summary-row">
              <span className="summary-label">Status</span>
              <StatusBadge status="PENDING" />
            </div>
            <div className="summary-row">
              <span className="summary-label">Amount</span>
              <span className="summary-val">{formatCurrency(data?.amount)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">From Account</span>
              <span className="summary-val">{formatAccountId(data?.fromAccount)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">To Account</span>
              <span className="summary-val">{formatAccountId(data?.toAccount)}</span>
            </div>
            {data?.transactionId && (
              <div className="summary-row" style={{ paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <span className="summary-label">Transaction ID</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {String(data.transactionId).substring(0, 10)}...
                  </span>
                  <CopyButton text={data.transactionId} label="Transaction ID" />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            {onViewActivity && (
              <button className="btn btn-secondary" onClick={onViewActivity}>
                View Activity
              </button>
            )}
            <button className="btn btn-primary" onClick={onClose}>
              Close & Check Later
            </button>
          </div>
        </div>
      )}

      {/* 4. ERROR STATE */}
      {status === 'ERROR' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-red-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-red)',
              }}
            >
              <XCircle size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Transfer Failed
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The transaction could not be completed.
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--accent-red-bg)',
              color: 'var(--accent-red)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: '0.88rem',
              fontWeight: 500,
              border: '1px solid var(--accent-red-border)',
              lineHeight: 1.4,
            }}
          >
            {data?.error || 'An unexpected error occurred while communicating with the ledger service.'}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose}>
              Close & Retry
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

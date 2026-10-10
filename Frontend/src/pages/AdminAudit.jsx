import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Layers, Database, ArrowRightLeft, FileCheck, Search, Undo2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAdminOverview, getAdminAuditLogs, inspectLedger, runReconciliation, reverseTransaction } from '../api/admin.api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatAccountId } from '../utils/formatAccountId';
import Spinner from '../components/common/Spinner';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export default function AdminAudit() {
  const { isSystemUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reconciliation state
  const [reconReport, setReconReport] = useState(null);
  const [reconLoading, setReconLoading] = useState(false);

  // Ledger inspector state
  const [searchTxId, setSearchTxId] = useState('');
  const [inspectedTx, setInspectedTx] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Compensating reversal modal
  const [reversalModal, setReversalModal] = useState({ isOpen: false, txId: '', reason: '', loading: false });

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, logsData] = await Promise.all([
        getAdminOverview(),
        getAdminAuditLogs({ limit: 15 })
      ]);
      setOverview(overviewData.systemOverview);
      setAuditLogs(logsData.auditLogs || []);
    } catch (err) {
      console.error('Failed to load admin audit overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSystemUser) {
      loadData();
    }
  }, [isSystemUser]);

  if (!isSystemUser) {
    return (
      <div className="dashboard-scroll-area">
        <div className="empty-state-box">
          <div className="empty-icon-circle" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)', border: '1px solid var(--accent-red-border)' }}>
            <ShieldAlert size={26} />
          </div>
          <div className="empty-title">Restricted Administration Surface</div>
          <p className="empty-desc">
            This module is reserved exclusively for authenticated System Administrators with double-entry audit privileges.
          </p>
        </div>
      </div>
    );
  }

  // Trigger live ledger reconciliation
  const handleRunRecon = async () => {
    setReconLoading(true);
    try {
      const data = await runReconciliation();
      setReconReport(data.report);
      showSuccess(`Reconciliation audit completed: ${data.report?.status}`);
    } catch (err) {
      showError('Reconciliation audit failed');
    } finally {
      setReconLoading(false);
    }
  };

  // Inspect raw ledger entries for transaction
  const handleInspect = async (e) => {
    e.preventDefault();
    if (!searchTxId.trim()) return;
    setInspectLoading(true);
    setInspectedTx(null);
    try {
      const data = await inspectLedger(searchTxId.trim());
      setInspectedTx(data);
    } catch (err) {
      showError(err.response?.data?.message || 'Transaction not found');
    } finally {
      setInspectLoading(false);
    }
  };

  // Submit compensating reversal
  const handleExecuteReversal = async (e) => {
    e.preventDefault();
    setReversalModal(prev => ({ ...prev, loading: true }));
    try {
      await reverseTransaction(reversalModal.txId, reversalModal.reason || 'Admin authorized reversal');
      showSuccess('Compensating reversal posted successfully');
      setReversalModal({ isOpen: false, txId: '', reason: '', loading: false });
      await loadData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to execute reversal');
      setReversalModal(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B'
            }}>
              <Database size={18} />
            </div>
            <h1 className="page-title">Ledger Integrity & Audit Administration</h1>
          </div>
          <p className="page-subtitle">
            System-level monitoring, live double-entry reconciliation, and compensating transaction controls.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh System Metrics">
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Accounts</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
              {overview.totalAccounts}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {overview.statusCounts?.active} Active · {overview.statusCounts?.frozen} Frozen · {overview.statusCounts?.closed} Closed
            </div>
          </div>

          <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Completed Transfers</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-green-light)', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
              {overview.totalCompletedTransactions}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {overview.pendingTransactions} Pending · {overview.failedTransactions} Failed
            </div>
          </div>

          <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total System Liquidity</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818CF8', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
              {formatCurrency(overview.totalSystemLiquidity)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Credits: {formatCurrency(overview.totalLedgerCredits)}
            </div>
          </div>

          <div className="stat-card" style={{ padding: '18px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontWeight: 700 }}>Ledger Immutability</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-green-light)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={18} /> Verified
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Schema hooks forbid update & delete
            </div>
          </div>
        </div>
      )}

      {/* Action Sections: Reconciliation Runner + Raw Ledger Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {/* Live Reconciliation Auditor */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={18} color="var(--accent-blue-light)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Double-Entry Reconciliation</h3>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRunRecon}
              disabled={reconLoading}
            >
              {reconLoading ? 'Auditing...' : 'Run Audit'}
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Audits every completed transfer to verify balanced debit/credit pairs, detects orphaned records, and flags negative accounts.
          </p>

          {reconReport && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Reconciliation Status:</span>
                <span style={{ fontWeight: 800, color: reconReport.status === 'BALANCED' ? 'var(--accent-green-light)' : 'var(--accent-red)' }}>
                  {reconReport.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Transactions Audited:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{reconReport.summary?.totalCompletedTransactionsAudited}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Accounts Audited:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{reconReport.summary?.totalAccountsAudited}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Discrepancies Detected:</span>
                <span style={{ fontWeight: 700, color: reconReport.discrepancies?.length === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {reconReport.discrepancies?.length || 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ledger Transaction Inspector */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Search size={18} color="var(--accent-blue-light)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Postings Inspector</h3>
          </div>

          <form onSubmit={handleInspect} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Enter Ref (e.g. TXN-...) or ID"
              value={searchTxId}
              onChange={(e) => setSearchTxId(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={inspectLoading}>
              {inspectLoading ? 'Searching...' : 'Inspect'}
            </button>
          </form>

          {inspectedTx && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Reference:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{inspectedTx.transaction?.reference}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Amount:</span>
                <span style={{ fontWeight: 800 }}>{formatCurrency(inspectedTx.transaction?.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Double-Entry Balanced:</span>
                <span style={{ color: inspectedTx.isBalanced ? 'var(--accent-green-light)' : 'var(--accent-red)', fontWeight: 700 }}>
                  {inspectedTx.isBalanced ? '✓ Balanced (1 Debit / 1 Credit)' : '⚠ Discrepancy'}
                </span>
              </div>

              {inspectedTx.transaction?.status === 'COMPLETED' && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '6px', color: 'var(--accent-amber)', borderColor: 'rgba(245,158,11,0.3)' }}
                  onClick={() => setReversalModal({ isOpen: true, txId: inspectedTx.transaction._id, reason: '', loading: false })}
                >
                  <Undo2 size={13} />
                  <span>Execute Compensating Reversal</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Administrative Audit Log Timeline */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-xl)', padding: '24px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '14px' }}>Administrative Audit Trail</h3>

        {auditLogs.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No administrative audit events recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.map((log) => (
              <div
                key={log._id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)',
                  fontSize: '0.8rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{log.action}</span>
                  <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>
                    by {log.performedBy?.name || 'Admin'}
                  </span>
                  {log.details?.reason && (
                    <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      ({log.details.reason})
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {new Date(log.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REVERSAL MODAL */}
      <Modal
        isOpen={reversalModal.isOpen}
        onClose={() => setReversalModal({ isOpen: false, txId: '', reason: '', loading: false })}
        title="Execute Compensating Reversal"
      >
        <form onSubmit={handleExecuteReversal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            This will post an immutable, atomic counter-balancing transaction refunding the original transfer and updating transaction state to <code>REVERSED</code>.
          </p>

          <div className="form-group">
            <label className="form-label">Transaction ID</label>
            <input type="text" className="form-input" value={reversalModal.txId} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Reversal Reason</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Authorized customer dispute, Duplicate entry correction"
              value={reversalModal.reason}
              onChange={(e) => setReversalModal(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReversalModal({ isOpen: false, txId: '', reason: '', loading: false })}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={reversalModal.loading}>
              {reversalModal.loading ? 'Executing...' : 'Confirm Reversal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

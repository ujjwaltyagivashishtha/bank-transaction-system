import React, { useState } from 'react';
import { History, ArrowRight, Search, Clock, Download, FileText, CheckCircle2, XCircle, Printer, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useActivity } from '../../context/ActivityContext';
import { useAccounts } from '../../context/AccountContext';
import { formatAccountId } from '../../utils/formatAccountId';
import { formatCurrency } from '../../utils/formatCurrency';
import { getTransactionReceipt, getAccountStatement } from '../../api/transactions.api';
import StatusBadge from '../common/StatusBadge';
import CopyButton from '../common/CopyButton';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';

export default function ActivityTable({ limit }) {
  const { transactions, loading, pagination, summary, fetchTransactions, exportCsv } = useActivity();
  const { accounts } = useAccounts();

  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Receipt Modal State
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, loading: false, data: null });

  // Statement Modal State
  const [statementModal, setStatementModal] = useState({
    isOpen: false,
    selectedAccount: accounts[0]?._id || '',
    loading: false,
    data: null,
  });

  const handleOpenReceipt = async (txId) => {
    setReceiptModal({ isOpen: true, loading: true, data: null });
    try {
      const data = await getTransactionReceipt(txId);
      setReceiptModal({ isOpen: true, loading: false, data: data.receipt });
    } catch (err) {
      console.error('Failed to load receipt:', err);
      setReceiptModal({ isOpen: false, loading: false, data: null });
    }
  };

  const handleGenerateStatement = async (e) => {
    e.preventDefault();
    if (!statementModal.selectedAccount) return;

    setStatementModal((prev) => ({ ...prev, loading: true }));
    try {
      const data = await getAccountStatement(statementModal.selectedAccount);
      setStatementModal((prev) => ({ ...prev, loading: false, data: data.statement }));
    } catch (err) {
      console.error('Failed to generate statement:', err);
      setStatementModal((prev) => ({ ...prev, loading: false, data: null }));
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'CREDIT' && tx.direction !== 'CREDIT') return false;
    if (filter === 'DEBIT' && tx.direction !== 'DEBIT') return false;
    if (filter === 'COMPLETED' && tx.status !== 'COMPLETED') return false;
    if (filter === 'PENDING' && tx.status !== 'PENDING') return false;
    if (filter === 'FAILED' && tx.status !== 'FAILED' && tx.status !== 'REVERSED') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchFrom = String(tx.fromAccountNumber || tx.fromAccount || '').toLowerCase().includes(term);
      const matchTo = String(tx.toAccountNumber || tx.toAccount || '').toLowerCase().includes(term);
      const matchKey = String(tx.idempotencyKey || '').toLowerCase().includes(term);
      const matchRef = String(tx.reference || '').toLowerCase().includes(term);
      const matchDesc = String(tx.description || '').toLowerCase().includes(term);
      return matchFrom || matchTo || matchKey || matchRef || matchDesc;
    }
    return true;
  });

  const displayedList = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;

  return (
    <div className="content-section">
      {/* Controls & Filter Tabs */}
      {!limit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div className="tab-filter-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <button
              className={`tab-filter-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All Activity ({transactions.length})
            </button>
            <button
              className={`tab-filter-btn ${filter === 'CREDIT' ? 'active' : ''}`}
              onClick={() => setFilter('CREDIT')}
            >
              Money In
            </button>
            <button
              className={`tab-filter-btn ${filter === 'DEBIT' ? 'active' : ''}`}
              onClick={() => setFilter('DEBIT')}
            >
              Money Out
            </button>
            <button
              className={`tab-filter-btn ${filter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setFilter('COMPLETED')}
            >
              Completed
            </button>
            <button
              className={`tab-filter-btn ${filter === 'PENDING' ? 'active' : ''}`}
              onClick={() => setFilter('PENDING')}
            >
              Processing
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="sidebar-search-box" style={{ width: '220px' }}>
              <Search size={14} />
              <input
                type="text"
                className="sidebar-search-input"
                placeholder="Search by ref, note, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setStatementModal({ isOpen: true, selectedAccount: accounts[0]?._id || '', loading: false, data: null })}
              title="Generate Account Statement"
            >
              <FileText size={14} />
              <span>Statement</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={exportCsv}
              title="Export Transactions as CSV (Protected Against Formula Injection)"
            >
              <Download size={14} />
              <span>CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="activity-table-container">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size={32} color="var(--accent-blue-light)" />
          </div>
        ) : displayedList.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon-circle">
              <History size={26} />
            </div>
            <div className="empty-title">No Transactions Found</div>
            <p className="empty-desc">
              {transactions.length === 0
                ? 'All completed transfers and ledger credits will be persistently recorded here.'
                : 'No transactions match the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <table className="activity-table" aria-label="Transaction Activity Table">
            <thead>
              <tr>
                <th>Type / Status</th>
                <th>From Account</th>
                <th>To Account</th>
                <th>Amount</th>
                <th>Date & Time</th>
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedList.map((tx) => {
                const dateObj = new Date(tx.createdAt);
                const formattedTime = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Just now';

                const isCredit = tx.direction === 'CREDIT';
                const fromDisplay = tx.fromAccountNumber || tx.fromAccount;
                const toDisplay = tx.toAccountNumber || tx.toAccount;

                return (
                  <tr key={tx._id || tx.idempotencyKey}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StatusBadge status={tx.status} />
                        {isCredit ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-green-light)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                            <ArrowDownLeft size={12} /> IN
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                            <ArrowUpRight size={12} /> OUT
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatAccountId(fromDisplay)}
                        </span>
                        <CopyButton text={fromDisplay} label="From Account" />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatAccountId(toDisplay)}
                        </span>
                        <CopyButton text={toDisplay} label="To Account" />
                      </div>
                    </td>
                    <td>
                      <span className={isCredit ? 'amount-credit' : 'amount-debit'} style={{ fontWeight: 700 }}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {formattedTime}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'var(--text-tertiary)',
                          }}
                          title={tx.reference || tx._id}
                        >
                          {tx.reference ? tx.reference.substring(0, 14) + '...' : String(tx._id).substring(0, 8) + '...'}
                        </span>
                        <CopyButton text={tx.reference || tx._id} label="Transaction Reference" />
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => handleOpenReceipt(tx._id)}
                        title="View printable receipt"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* RECEIPT MODAL */}
      <Modal
        isOpen={receiptModal.isOpen}
        onClose={() => setReceiptModal({ isOpen: false, loading: false, data: null })}
        title="Transaction Receipt"
      >
        {receiptModal.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <Spinner size={28} />
          </div>
        ) : receiptModal.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-glass)', paddingBottom: '16px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--accent-blue-light)' }}>
                  TRANSACT BANKING LEDGER
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Official Double-Entry Settlement Receipt
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '12px' }}>
                  {receiptModal.data.formattedAmount}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <StatusBadge status={receiptModal.data.status} />
                </div>
              </div>

              <div className="summary-row">
                <span className="summary-label">Receipt Number</span>
                <span className="summary-val" style={{ fontFamily: 'var(--font-mono)' }}>{receiptModal.data.receiptNumber}</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Reference</span>
                <span className="summary-val" style={{ fontFamily: 'var(--font-mono)' }}>{receiptModal.data.reference}</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Date & Time</span>
                <span className="summary-val">
                  {new Date(receiptModal.data.timestamp).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Sender</span>
                <span className="summary-val">{receiptModal.data.sender?.name} ({receiptModal.data.sender?.accountNumber})</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Recipient</span>
                <span className="summary-val">{receiptModal.data.recipient?.name} ({receiptModal.data.recipient?.accountNumber})</span>
              </div>

              <div className="summary-row" style={{ paddingTop: '8px', borderTop: '1px dashed var(--border-glass)' }}>
                <span className="summary-label">Settlement Standard</span>
                <span className="summary-val" style={{ color: 'var(--accent-green-light)' }}>
                  {receiptModal.data.settlementType}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                title="Print Receipt"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setReceiptModal({ isOpen: false, loading: false, data: null })}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ACCOUNT STATEMENT MODAL */}
      <Modal
        isOpen={statementModal.isOpen}
        onClose={() => setStatementModal({ isOpen: false, selectedAccount: '', loading: false, data: null })}
        title="Account Statement Generator"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <form onSubmit={handleGenerateStatement} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Select Account</label>
              <select
                className="form-select"
                value={statementModal.selectedAccount}
                onChange={(e) => setStatementModal((prev) => ({ ...prev, selectedAccount: e.target.value, data: null }))}
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.accountNumber ? `A/C ${acc.accountNumber}` : formatAccountId(acc._id)} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={statementModal.loading}>
              {statementModal.loading ? 'Generating...' : 'Generate'}
            </button>
          </form>

          {statementModal.data && (
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>Account {statementModal.data.maskedAccountNumber}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Holder: {statementModal.data.accountHolder}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Closing Balance</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-green-light)' }}>{formatCurrency(statementModal.data.closingBalance)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Opening Balance: {formatCurrency(statementModal.data.openingBalance)}</span>
                <span>Total In: +{formatCurrency(statementModal.data.summary.totalDeposits)}</span>
                <span>Total Out: -{formatCurrency(statementModal.data.summary.totalWithdrawals)}</span>
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Ledger Postings ({statementModal.data.entries.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {statementModal.data.entries.map((entry) => (
                    <div
                      key={entry._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: entry.type === 'CREDIT' ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                          {entry.type}
                        </span>
                        <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>{entry.description}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)' }}>
                        <span style={{ fontWeight: 700 }}>
                          {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </span>
                        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>
                          Bal: {formatCurrency(entry.balanceAfter)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

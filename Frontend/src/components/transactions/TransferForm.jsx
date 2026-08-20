import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRightLeft, AlertCircle, Sparkles, Check, Wallet } from 'lucide-react';
import { useAccounts } from '../../context/AccountContext';
import { useActivity } from '../../context/ActivityContext';
import { useToast } from '../../context/ToastContext';
import { createTransaction } from '../../api/transactions.api';
import { generateIdempotencyKey } from '../../utils/generateIdempotencyKey';
import { formatCurrency, parseCurrencyInput } from '../../utils/formatCurrency';
import { formatAccountId } from '../../utils/formatAccountId';
import TransferSummary from './TransferSummary';
import ProcessingModal from './ProcessingModal';

export default function TransferForm() {
  const { activeAccounts, balances, fetchAccounts } = useAccounts();
  const { logTransaction, updateTransaction } = useActivity();
  const { showError, showSuccess } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Selected account state
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState('');
  
  // Processing Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    status: 'PROCESSING', // 'PROCESSING' | 'SUCCESS' | 'ERROR'
    data: null,
  });

  // Pre-fill sender account if passed via navigation state
  useEffect(() => {
    if (location.state?.selectedFromAccount) {
      setFromAccount(location.state.selectedFromAccount);
    } else if (activeAccounts.length > 0 && !fromAccount) {
      setFromAccount(activeAccounts[0]._id);
    }
  }, [location.state, activeAccounts, fromAccount]);

  const selectedFromBalance = fromAccount ? (balances[fromAccount] || 0) : 0;

  // Idempotency key state (preserved on retry unless form inputs change)
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState(() => generateIdempotencyKey());

  // Regenerate key when critical transfer fields change
  const handleAccountChange = (val) => {
    setFromAccount(val);
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setValidationError('');
  };

  const handleToAccountChange = (e) => {
    setToAccount(e.target.value);
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setValidationError('');
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      setAmount(val);
      setCurrentIdempotencyKey(generateIdempotencyKey());
      setValidationError('');
    }
  };

  // Amount preset helper
  const handleSetPresetAmount = (preset) => {
    if (preset === 'MAX') {
      setAmount(selectedFromBalance.toString());
    } else {
      setAmount(preset.toString());
    }
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const numericAmount = parseFloat(amount);

    // Validation
    if (!fromAccount) {
      setValidationError('Please select a sender account.');
      return;
    }
    if (!toAccount.trim()) {
      setValidationError('Please enter a valid destination Account ID.');
      return;
    }
    if (fromAccount === toAccount.trim()) {
      setValidationError('Destination account cannot be the same as sender account.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError('Transfer amount must be a valid number greater than ₹0.');
      return;
    }
    if (numericAmount > selectedFromBalance) {
      setValidationError(
        `Insufficient balance. Available: ${formatCurrency(selectedFromBalance)}, Requested: ${formatCurrency(numericAmount)}`
      );
      return;
    }

    const activeKey = currentIdempotencyKey || generateIdempotencyKey();

    // Log preliminary session transaction
    logTransaction({
      fromAccount,
      toAccount: toAccount.trim(),
      amount: numericAmount,
      idempotencyKey: activeKey,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    // Open Processing Modal
    setModalState({
      isOpen: true,
      status: 'PROCESSING',
      data: { fromAccount, toAccount: toAccount.trim(), amount: numericAmount, idempotencyKey: activeKey },
    });

    try {
      const response = await createTransaction({
        fromAccount,
        toAccount: toAccount.trim(),
        amount: numericAmount,
        idempotencyKey: activeKey,
      });

      const txResult = response.transaction || {};
      const txId = txResult._id || response._id;
      const txStatus = txResult.status || 'COMPLETED';

      // Update session activity with actual status from backend
      updateTransaction(activeKey, {
        status: txStatus,
        transactionId: txId,
        id: txId,
      });

      if (txStatus === 'COMPLETED') {
        setModalState({
          isOpen: true,
          status: 'SUCCESS',
          data: {
            fromAccount,
            toAccount: toAccount.trim(),
            amount: numericAmount,
            transactionId: txId,
            message: response.message,
          },
        });
        showSuccess(`Successfully transferred ${formatCurrency(numericAmount)}!`);
        // Refresh fresh balances from ledger
        await fetchAccounts();
        // Reset form and generate fresh key for next transfer
        setAmount('');
        setToAccount('');
        setCurrentIdempotencyKey(generateIdempotencyKey());
      } else if (txStatus === 'PENDING') {
        setModalState({
          isOpen: true,
          status: 'PENDING_RESULT',
          data: {
            fromAccount,
            toAccount: toAccount.trim(),
            amount: numericAmount,
            transactionId: txId,
            message: response.message || 'Transaction is still processing in the background.',
          },
        });
        await fetchAccounts();
      } else {
        // FAILED or REVERSED
        setModalState({
          isOpen: true,
          status: 'ERROR',
          data: {
            fromAccount,
            toAccount: toAccount.trim(),
            amount: numericAmount,
            error: response.message || `Transaction status: ${txStatus}`,
          },
        });
        await fetchAccounts();
      }
    } catch (err) {
      console.error('Transfer failed:', err);
      let serverMessage = err.response?.data?.message || 'Transaction processing failed, please retry.';
      
      if (err.response?.status === 409) {
        serverMessage = 'This transfer could not be completed because the account balance changed. Please review the balance and try again.';
      }
      
      // Update session activity to failed
      updateTransaction(activeKey, {
        status: 'FAILED',
        error: serverMessage,
      });

      setModalState({
        isOpen: true,
        status: 'ERROR',
        data: {
          fromAccount,
          toAccount: toAccount.trim(),
          amount: numericAmount,
          error: serverMessage,
        },
      });

      // Refresh accounts to ensure accurate balances
      await fetchAccounts();
    }
  };

  return (
    <>
      <div className="transfer-container">
        {/* Transfer Form Card */}
        <div className="transfer-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Send Money</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Transfer funds securely using our double-entry ledger settlement.
            </p>
          </div>

          {validationError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--accent-red-bg)',
                color: 'var(--accent-red)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                border: '1px solid var(--accent-red-border)',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. From Account Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="fromAccount">
                <span>From Account</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                  Available: {formatCurrency(selectedFromBalance)}
                </span>
              </label>
              <select
                id="fromAccount"
                className="form-select"
                value={fromAccount}
                onChange={(e) => handleAccountChange(e.target.value)}
                disabled={activeAccounts.length === 0}
              >
                {activeAccounts.length === 0 ? (
                  <option value="">No ACTIVE accounts available</option>
                ) : (
                  activeAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {formatAccountId(acc._id)} ({acc.currency || 'INR'}) — Available: {formatCurrency(balances[acc._id] || 0)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Destination Account Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="toAccount">
                <span>To Account ID</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Enter destination MongoDB Account ID
                </span>
              </label>
              <div className="form-input-container">
                <input
                  id="toAccount"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 67a18f2d59048..."
                  value={toAccount}
                  onChange={handleToAccountChange}
                  required
                />
              </div>
            </div>

            {/* 3. Amount Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                <span>Amount (₹ INR)</span>
                {amount && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(amount)}
                  </span>
                )}
              </label>
              <div className="form-input-container">
                <span className="form-input-prefix" style={{ fontWeight: 700, fontSize: '1rem' }}>₹</span>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  className="form-input has-prefix"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                />
              </div>

              {/* Amount Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    onClick={() => handleSetPresetAmount(preset)}
                  >
                    +₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
                {selectedFromBalance > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', marginLeft: 'auto' }}
                    onClick={() => handleSetPresetAmount('MAX')}
                  >
                    Max Balance
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: '10px' }}
              disabled={activeAccounts.length === 0 || !amount || parseFloat(amount) <= 0}
              id="transfer-submit-btn"
            >
              <ArrowRightLeft size={18} />
              <span>Transfer {amount ? formatCurrency(amount) : 'Funds'}</span>
            </button>
          </form>
        </div>

        {/* Transfer Summary Preview */}
        <TransferSummary
          fromAccountId={fromAccount}
          toAccountId={toAccount}
          amount={amount}
          fromAccountBalance={selectedFromBalance}
        />
      </div>

      {/* Processing / Result Modal */}
      <ProcessingModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        data={modalState.data}
        onClose={() => setModalState({ isOpen: false, status: 'PROCESSING', data: null })}
        onViewActivity={() => {
          setModalState({ isOpen: false, status: 'PROCESSING', data: null });
          navigate('/activity');
        }}
      />
    </>
  );
}

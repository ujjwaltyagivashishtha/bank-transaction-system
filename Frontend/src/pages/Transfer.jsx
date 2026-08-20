import React from 'react';
import TransferForm from '../components/transactions/TransferForm';

export default function Transfer() {
  return (
    <div className="dashboard-scroll-area">
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Transfer Funds</h1>
          <p className="page-subtitle">
            Execute direct double-entry ledger transfers between active accounts.
          </p>
        </div>
      </header>

      <TransferForm />
    </div>
  );
}

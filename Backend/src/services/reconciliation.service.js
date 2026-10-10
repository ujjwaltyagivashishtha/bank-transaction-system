const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const auditLogModel = require("../models/auditLog.model");

/**
 * Audit and verify the integrity of the double-entry ledger.
 * Does NOT modify data silently. Produces structured discrepancies report.
 * 
 * @param {string|mongoose.Types.ObjectId} [performedByUserId]
 * @returns {Promise<Object>} Reconciliation report
 */
async function runLedgerReconciliation(performedByUserId = null) {
    const discrepancies = [];
    const startTime = Date.now();

    // 1. Audit all COMPLETED transactions
    const completedTransactions = await transactionModel.find({ status: "COMPLETED" });

    for (const tx of completedTransactions) {
        const ledgerEntries = await ledgerModel.find({ transaction: tx._id });

        const debits = ledgerEntries.filter(e => e.type === "DEBIT");
        const credits = ledgerEntries.filter(e => e.type === "CREDIT");

        const isSystemIssuance = tx.description === "System Capital Issuance" || String(tx.idempotencyKey).startsWith("sys_fund");

        // Check 1: Missing Debit (Required for all peer-to-peer transfers)
        if (!isSystemIssuance && debits.length === 0) {
            discrepancies.push({
                type: "MISSING_DEBIT_ENTRY",
                severity: "CRITICAL",
                transactionId: tx._id,
                reference: tx.reference || tx.idempotencyKey,
                details: `Transaction ${tx._id} is missing a DEBIT entry`
            });
        }

        // Check 2: Missing Credit (Required for all transactions including issuance)
        if (credits.length === 0) {
            discrepancies.push({
                type: "MISSING_CREDIT_ENTRY",
                severity: "CRITICAL",
                transactionId: tx._id,
                reference: tx.reference || tx.idempotencyKey,
                details: `Transaction ${tx._id} is missing a CREDIT entry`
            });
        }

        // Check 3: Duplicate postings
        if (debits.length > 1) {
            discrepancies.push({
                type: "DUPLICATE_DEBIT_POSTING",
                severity: "CRITICAL",
                transactionId: tx._id,
                reference: tx.reference || tx.idempotencyKey,
                details: `Transaction ${tx._id} has ${debits.length} DEBIT entries`
            });
        }

        if (credits.length > 1) {
            discrepancies.push({
                type: "DUPLICATE_CREDIT_POSTING",
                severity: "CRITICAL",
                transactionId: tx._id,
                reference: tx.reference || tx.idempotencyKey,
                details: `Transaction ${tx._id} has ${credits.length} CREDIT entries`
            });
        }

        // Check 4: Mismatched amounts
        if (debits.length === 1 && credits.length === 1) {
            const debitPaise = debits[0].amountInPaise || Math.round(debits[0].amount * 100);
            const creditPaise = credits[0].amountInPaise || Math.round(credits[0].amount * 100);
            const txPaise = tx.amountInPaise || Math.round(tx.amount * 100);

            if (debitPaise !== creditPaise) {
                discrepancies.push({
                    type: "UNBALANCED_ENTRIES",
                    severity: "CRITICAL",
                    transactionId: tx._id,
                    reference: tx.reference,
                    details: `Debit (${debitPaise}p) does not match Credit (${creditPaise}p)`
                });
            }

            if (debitPaise !== txPaise) {
                discrepancies.push({
                    type: "TRANSACTION_LEDGER_MISMATCH",
                    severity: "HIGH",
                    transactionId: tx._id,
                    reference: tx.reference,
                    details: `Ledger amount (${debitPaise}p) does not match Transaction recorded amount (${txPaise}p)`
                });
            }
        }
    }

    // 2. Audit orphaned ledger entries (where transaction no longer exists)
    const allLedger = await ledgerModel.find({}).select("transaction");
    const uniqueTxIds = [...new Set(allLedger.map(l => String(l.transaction)))];
    
    for (const txId of uniqueTxIds) {
        if (!mongoose.Types.ObjectId.isValid(txId)) continue;
        const exists = await transactionModel.exists({ _id: txId });
        if (!exists) {
            discrepancies.push({
                type: "ORPHANED_LEDGER_RECORD",
                severity: "HIGH",
                transactionId: txId,
                details: `Ledger entries exist for non-existent transaction ${txId}`
            });
        }
    }

    // 3. Audit account balances for negative balances
    const allAccounts = await accountModel.find({ status: { $ne: "CLOSED" } });
    let totalAccountsAudited = allAccounts.length;

    for (const acc of allAccounts) {
        const balancePaise = await acc.getBalanceInPaise();
        if (balancePaise < 0) {
            discrepancies.push({
                type: "NEGATIVE_ACCOUNT_BALANCE",
                severity: "CRITICAL",
                accountId: acc._id,
                accountNumber: acc.accountNumber,
                details: `Account ${acc._id} has negative balance of ₹${(balancePaise / 100).toFixed(2)}`
            });
        }
    }

    const report = {
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status: discrepancies.length === 0 ? "BALANCED" : "DISCREPANCIES_DETECTED",
        summary: {
            totalCompletedTransactionsAudited: completedTransactions.length,
            totalAccountsAudited,
            totalDiscrepanciesFound: discrepancies.length
        },
        discrepancies
    };

    // Log the reconciliation run
    if (performedByUserId && mongoose.Types.ObjectId.isValid(performedByUserId)) {
        try {
            await auditLogModel.create({
                action: "RECONCILIATION_RUN",
                performedBy: performedByUserId,
                details: {
                    status: report.status,
                    totalDiscrepancies: discrepancies.length
                }
            });
        } catch (e) {
            console.warn("Failed to log reconciliation audit trail:", e.message);
        }
    }

    return report;
}

/**
 * Creates an authorized compensating transaction for a completed transfer.
 * Preserves ledger immutability by posting a counter-balancing DEBIT/CREDIT pair.
 */
async function createCompensatingReversal({ originalTransactionId, reason, performedByUserId }) {
    if (!mongoose.Types.ObjectId.isValid(originalTransactionId)) {
        throw new Error("Invalid original transaction ID format");
    }

    const originalTx = await transactionModel.findById(originalTransactionId);
    if (!originalTx) {
        throw new Error("Original transaction not found");
    }

    if (originalTx.status !== "COMPLETED") {
        throw new Error(`Cannot reverse a transaction with status ${originalTx.status}. Only COMPLETED transfers can be reversed.`);
    }

    const amountInPaise = originalTx.amountInPaise || Math.round(originalTx.amount * 100);
    const amountInRupees = amountInPaise / 100;

    // Check recipient has sufficient funds to refund
    const recipientAccount = await accountModel.findById(originalTx.toAccount);
    if (!recipientAccount || recipientAccount.status !== "ACTIVE") {
        throw new Error("Cannot reverse: Recipient account is inactive or not found");
    }

    const recipientBal = await recipientAccount.getBalanceInPaise();
    if (recipientBal < amountInPaise) {
        throw new Error(`Cannot reverse: Recipient account has insufficient balance to refund (Available: ₹${(recipientBal / 100).toFixed(2)}, Needed: ₹${amountInRupees.toFixed(2)})`);
    }

    const session = await mongoose.startSession();
    let reversalTx = null;

    try {
        session.startTransaction({
            readPreference: 'primary',
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        // 1. Create reversal transaction
        const revKey = `REV_${originalTx._id}_${Date.now()}`;
        const created = await transactionModel.create([{
            fromAccount: originalTx.toAccount,    // Original recipient pays back
            toAccount: originalTx.fromAccount,    // Original sender receives refund
            amount: amountInRupees,
            amountInPaise,
            idempotencyKey: revKey,
            description: `Compensating reversal for ${originalTx.reference || originalTx._id}. Reason: ${reason || 'Authorized reversal'}`,
            reversalOf: originalTx._id,
            status: "PENDING"
        }], { session });

        reversalTx = created[0];

        // 2. Post counter-balancing ledger entries
        await ledgerModel.create([{
            account: originalTx.toAccount,
            amount: amountInRupees,
            amountInPaise,
            transaction: reversalTx._id,
            type: "DEBIT"
        }], { session });

        await ledgerModel.create([{
            account: originalTx.fromAccount,
            amount: amountInRupees,
            amountInPaise,
            transaction: reversalTx._id,
            type: "CREDIT"
        }], { session });

        // 3. Mark reversal completed
        await transactionModel.updateOne(
            { _id: reversalTx._id },
            { $set: { status: "COMPLETED" } },
            { session }
        );

        // 4. Update original transaction status to REVERSED
        await transactionModel.updateOne(
            { _id: originalTx._id },
            { $set: { status: "REVERSED" } },
            { session }
        );

        await session.commitTransaction();
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw err;
    } finally {
        await session.endSession();
    }

    // Audit log
    if (performedByUserId && mongoose.Types.ObjectId.isValid(performedByUserId)) {
        try {
            await auditLogModel.create({
                action: "TRANSACTION_REVERSAL",
                performedBy: performedByUserId,
                targetTransaction: originalTx._id,
                details: {
                    reversalTransactionId: reversalTx._id,
                    amount: amountInRupees,
                    reason
                }
            });
        } catch (e) {
            console.warn("Failed to create audit log for reversal:", e.message);
        }
    }

    return reversalTx;
}

module.exports = {
    runLedgerReconciliation,
    createCompensatingReversal
};

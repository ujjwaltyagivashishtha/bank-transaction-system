const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * - Create a new transaction (Money Transfer)
 * Fully atomic, race-safe, and secured with account ownership & concurrency protection.
 */
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    // 1. Request & Monetary Validation
    if (!fromAccount || !toAccount || amount === undefined || amount === null || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid positive number greater than 0"
        });
    }

    if (!mongoose.Types.ObjectId.isValid(fromAccount) || !mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount ID format"
        });
    }

    if (String(fromAccount) === String(toAccount)) {
        return res.status(400).json({
            message: "Cannot transfer money to the same account"
        });
    }

    // 2. Pre-check Idempotency with Ownership Verification (Fast path)
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: String(idempotencyKey).trim()
    });

    if (isTransactionAlreadyExists) {
        // SECURITY: Verify the existing transaction belongs to this authenticated user
        const senderAccount = await accountModel.findOne({
            _id: isTransactionAlreadyExists.fromAccount,
            user: req.user._id
        });

        if (!senderAccount) {
            return res.status(409).json({
                message: "Idempotency key collision with another user's transaction"
            });
        }

        // Verify request parameters match original transaction
        if (String(isTransactionAlreadyExists.toAccount) !== String(toAccount) ||
            isTransactionAlreadyExists.amount !== numericAmount) {
            return res.status(409).json({
                message: "Idempotency key conflict: parameters do not match original transaction"
            });
        }

        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            });
        }
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
                transaction: isTransactionAlreadyExists
            });
        }
        return res.status(400).json({
            message: `Transaction ${isTransactionAlreadyExists.status.toLowerCase()}, please retry with a new key`,
            transaction: isTransactionAlreadyExists
        });
    }

    // 3. Account Ownership & Status Verification
    // CRITICAL SECURITY: Ensure sender account belongs strictly to the authenticated user
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    });

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "Sender account not found or does not belong to you"
        });
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    });

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Destination account not found"
        });
    }

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        });
    }

    // 4. Atomic Database Transaction with Concurrency & Double-Spend Protection
    const session = await mongoose.startSession();
    let completedTransaction = null;

    try {
        session.startTransaction({
            readPreference: 'primary',
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        // 4.1 Acquire write lock on the sender account document inside the session
        // This guarantees serializability and prevents concurrent double-spending race conditions
        const lockedAccount = await accountModel.findOneAndUpdate(
            { _id: fromAccount, status: "ACTIVE" },
            { $inc: { __v: 1 } },
            { session, returnDocument: 'after' }
        );

        if (!lockedAccount) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return res.status(400).json({
                message: "Account lock failed or account is no longer ACTIVE"
            });
        }

        // 4.2 Derive balance INSIDE the active transaction session under lock
        const currentBalance = await fromUserAccount.getBalance(session);

        if (currentBalance < numericAmount) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ₹${currentBalance}. Requested amount is ₹${numericAmount}`
            });
        }

        // 5. Create transaction record (PENDING)
        let transaction;
        try {
            const created = await transactionModel.create([ {
                fromAccount,
                toAccount,
                amount: numericAmount,
                idempotencyKey: String(idempotencyKey).trim(),
                status: "PENDING"
            } ], { session });
            transaction = created[ 0 ];
        } catch (insertErr) {
            // Gracefully handle duplicate idempotency key race condition (E11000)
            if (insertErr.code === 11000 || insertErr.message?.includes('duplicate key')) {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
                const duplicateTx = await transactionModel.findOne({ idempotencyKey: String(idempotencyKey).trim() });
                if (duplicateTx) {
                    const senderAccount = await accountModel.findOne({
                        _id: duplicateTx.fromAccount,
                        user: req.user._id
                    });
                    if (!senderAccount) {
                        return res.status(409).json({
                            message: "Idempotency key collision with another user's transaction"
                        });
                    }
                    return res.status(200).json({
                        message: duplicateTx.status === "COMPLETED" ? "Transaction already processed" : "Transaction is still processing",
                        transaction: duplicateTx
                    });
                }
            }
            throw insertErr;
        }

        // 6. Create DEBIT ledger entry
        await ledgerModel.create([ {
            account: fromAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session });

        // 7. Create CREDIT ledger entry
        await ledgerModel.create([ {
            account: toAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session });

        // 8. Mark transaction COMPLETED
        completedTransaction = await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session, returnDocument: 'after' }
        );

        // 9. Commit MongoDB session
        await session.commitTransaction();
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Transfer transaction aborted:", error.message);
        
        // Return 409 Conflict on MongoDB write conflicts or transient transaction errors
        if ((error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) || 
            error.code === 112 || 
            error.message?.includes('Write conflict')) {
            return res.status(409).json({
                message: "This transfer could not be completed because the account balance or state changed concurrently. Please review your balance and try again."
            });
        }

        return res.status(500).json({
            message: error.message || "Transaction processing failed, please retry"
        });
    } finally {
        await session.endSession();
    }

    // 10. Non-fatal Email Notification
    try {
        await emailService.sendTransactionEmail(req.user.email, req.user.name, numericAmount, toAccount);
    } catch (emailErr) {
        console.warn("Transaction email notification failed (non-fatal):", emailErr.message);
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: completedTransaction
    });
}

/**
 * - Create Initial Funds Transaction (System User Only)
 * Controlled system issuance of initial funds to a destination account.
 * Follows an authorized issuance model: credits destination account directly without generating artificial negative balances.
 */
async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || amount === undefined || amount === null || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid positive number greater than 0"
        });
    }

    if (!mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid toAccount ID format"
        });
    }

    // Check existing idempotency
    const existingTx = await transactionModel.findOne({
        idempotencyKey: String(idempotencyKey).trim()
    });

    if (existingTx) {
        return res.status(200).json({
            message: "Initial funds transaction already processed",
            transaction: existingTx
        });
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    });

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Destination account not found"
        });
    }

    if (toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Destination account must be ACTIVE"
        });
    }

    // Ensure system user has an authoritative issuance account representation
    let fromUserAccount = await accountModel.findOne({
        user: req.user._id
    });

    if (!fromUserAccount) {
        fromUserAccount = await accountModel.create({
            user: req.user._id,
            status: "ACTIVE",
            currency: "INR"
        });
    }

    const session = await mongoose.startSession();
    let completedTx = null;

    try {
        session.startTransaction({
            readPreference: 'primary',
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        // 1. Create Issuance Transaction record (PENDING)
        let createdTx;
        try {
            const created = await transactionModel.create([ {
                fromAccount: fromUserAccount._id,
                toAccount: toUserAccount._id,
                amount: numericAmount,
                idempotencyKey: String(idempotencyKey).trim(),
                status: "PENDING"
            } ], { session });
            createdTx = created[ 0 ];
        } catch (insertErr) {
            if (insertErr.code === 11000 || insertErr.message?.includes('duplicate key')) {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
                const duplicateTx = await transactionModel.findOne({ idempotencyKey: String(idempotencyKey).trim() });
                if (duplicateTx) {
                    return res.status(200).json({
                        message: "Initial funds transaction already processed",
                        transaction: duplicateTx
                    });
                }
            }
            throw insertErr;
        }

        // 2. Credit recipient account with newly minted / issued capital
        await ledgerModel.create([ {
            account: toUserAccount._id,
            amount: numericAmount,
            transaction: createdTx._id,
            type: "CREDIT"
        } ], { session });

        // 3. Mark transaction COMPLETED
        completedTx = await transactionModel.findOneAndUpdate(
            { _id: createdTx._id },
            { status: "COMPLETED" },
            { session, returnDocument: 'after' }
        );

        await session.commitTransaction();
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("System initial funds error:", error.message);
        return res.status(500).json({
            message: "Failed to issue initial funds transaction"
        });
    } finally {
        await session.endSession();
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: completedTx
    });
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
};
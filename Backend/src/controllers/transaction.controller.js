const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const { parseAmountToPaise, paiseToRupees, formatINR } = require("../utils/money");
const { runLedgerReconciliation, createCompensatingReversal } = require("../services/reconciliation.service");

/**
 * Helper to resolve an account identifier which may be either a MongoDB ObjectId or a 12-digit accountNumber
 */
async function resolveAccount(identifier, session = null) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    let query = {};
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
        query = { _id: trimmed };
    } else {
        query = { accountNumber: trimmed };
    }

    const queryExec = accountModel.findOne(query);
    if (session) {
        queryExec.session(session);
    }
    return await queryExec;
}

/**
 * Create a new transfer transaction
 * Fully atomic, race-safe, and secured with double-entry ledger postings.
 */
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey, description } = req.body;

    // 1. Request and Idempotency Parameter Validation
    if (!fromAccount || !toAccount || amount === undefined || amount === null || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    let amountInPaise;
    try {
        amountInPaise = parseAmountToPaise(amount);
    } catch (parseErr) {
        return res.status(400).json({
            message: parseErr.message
        });
    }

    const amountInRupees = paiseToRupees(amountInPaise);

    // Resolve sender account (by ID or account number)
    const fromUserAccount = await resolveAccount(fromAccount);
    if (!fromUserAccount) {
        return res.status(400).json({
            message: "Sender account not found"
        });
    }

    // CRITICAL SECURITY: Verify sender account belongs strictly to authenticated user
    if (String(fromUserAccount.user) !== String(req.user._id)) {
        return res.status(400).json({
            message: "Sender account not found or does not belong to you"
        });
    }

    // Resolve destination account
    const toUserAccount = await resolveAccount(toAccount);
    if (!toUserAccount) {
        return res.status(400).json({
            message: "Destination account not found"
        });
    }

    // Self-transfer check
    if (String(fromUserAccount._id) === String(toUserAccount._id)) {
        return res.status(400).json({
            message: "Cannot transfer money to the same account"
        });
    }

    // Status checks
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        });
    }

    // 2. Idempotency Check with Ownership & Parameter Verification
    const existingTx = await transactionModel.findOne({
        idempotencyKey: String(idempotencyKey).trim()
    });

    if (existingTx) {
        // SECURITY: Verify the existing transaction belongs to this authenticated user
        const originalSender = await accountModel.findOne({
            _id: existingTx.fromAccount,
            user: req.user._id
        });

        if (!originalSender) {
            return res.status(409).json({
                message: "Idempotency key collision with another user's transaction"
            });
        }

        // Verify financially significant request parameters match original transaction
        const existingTxPaise = existingTx.amountInPaise || Math.round(existingTx.amount * 100);
        if (String(existingTx.toAccount) !== String(toUserAccount._id) || existingTxPaise !== amountInPaise) {
            return res.status(409).json({
                message: "Idempotency key conflict: parameters do not match original transaction"
            });
        }

        if (existingTx.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: existingTx
            });
        }
        if (existingTx.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
                transaction: existingTx
            });
        }
        return res.status(400).json({
            message: `Transaction ${existingTx.status.toLowerCase()}, please retry with a new key`,
            transaction: existingTx
        });
    }

    // 3. Atomic Database Transaction with Concurrency & Double-Spend Protection
    const session = await mongoose.startSession();
    let completedTransaction = null;

    try {
        session.startTransaction({
            readPreference: 'primary',
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' }
        });

        // Acquire write lock on sender account inside transaction session
        const lockedAccount = await accountModel.findOneAndUpdate(
            { _id: fromUserAccount._id, status: "ACTIVE" },
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

        // Check sender balance inside active session under document lock
        const currentBalancePaise = await fromUserAccount.getBalanceInPaise(session);

        if (currentBalancePaise < amountInPaise) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${formatINR(currentBalancePaise / 100)}. Requested amount is ${formatINR(amountInRupees)}`
            });
        }

        // Create transaction record (PENDING)
        let transaction;
        try {
            const created = await transactionModel.create([ {
                fromAccount: fromUserAccount._id,
                toAccount: toUserAccount._id,
                amount: amountInRupees,
                amountInPaise,
                description: description || "Funds Transfer",
                idempotencyKey: String(idempotencyKey).trim(),
                status: "PENDING"
            } ], { session });
            transaction = created[ 0 ];
        } catch (insertErr) {
            if (insertErr.code === 11000 || insertErr.message?.includes('duplicate key')) {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
                const duplicateTx = await transactionModel.findOne({ idempotencyKey: String(idempotencyKey).trim() });
                if (duplicateTx) {
                    const originalSender = await accountModel.findOne({
                        _id: duplicateTx.fromAccount,
                        user: req.user._id
                    });
                    if (!originalSender) {
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

        // Create DEBIT ledger entry
        await ledgerModel.create([ {
            account: fromUserAccount._id,
            amount: amountInRupees,
            amountInPaise,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session });

        // Create CREDIT ledger entry
        await ledgerModel.create([ {
            account: toUserAccount._id,
            amount: amountInRupees,
            amountInPaise,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session });

        // Mark transaction COMPLETED
        completedTransaction = await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session, returnDocument: 'after' }
        );

        await session.commitTransaction();
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Transfer transaction aborted:", error.message);

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

    // Non-fatal email notification
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amountInRupees,
            toUserAccount.accountNumber || toUserAccount._id,
            completedTransaction?.reference
        );
    } catch (emailErr) {
        console.warn("Transaction email notification failed (non-fatal):", emailErr.message);
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: completedTransaction
    });
}

/**
 * System User Initial Funding
 */
async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || amount === undefined || amount === null || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        });
    }

    let amountInPaise;
    try {
        amountInPaise = parseAmountToPaise(amount);
    } catch (err) {
        return res.status(400).json({
            message: err.message
        });
    }

    const amountInRupees = paiseToRupees(amountInPaise);

    const existingTx = await transactionModel.findOne({
        idempotencyKey: String(idempotencyKey).trim()
    });

    if (existingTx) {
        return res.status(200).json({
            message: "Initial funds transaction already processed",
            transaction: existingTx
        });
    }

    const toUserAccount = await resolveAccount(toAccount);

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

        let createdTx;
        try {
            const created = await transactionModel.create([ {
                fromAccount: fromUserAccount._id,
                toAccount: toUserAccount._id,
                amount: amountInRupees,
                amountInPaise,
                description: "System Capital Issuance",
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

        // Credit recipient with newly issued capital
        await ledgerModel.create([ {
            account: toUserAccount._id,
            amount: amountInRupees,
            amountInPaise,
            transaction: createdTx._id,
            type: "CREDIT"
        } ], { session });

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

/**
 * GET /api/transactions
 * Persistent, paginated transaction history for the authenticated user
 */
async function getTransactionsController(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id accountNumber");
        const accountIds = userAccounts.map(a => a._id);
        const accountMap = {};
        userAccounts.forEach(a => {
            accountMap[String(a._id)] = a.accountNumber || String(a._id);
        });

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const { accountId, status, type, startDate, endDate, search } = req.query;

        // Build match filter
        const matchFilter = {};

        if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
            // Ensure requested account belongs to user
            if (!accountIds.some(id => String(id) === String(accountId))) {
                return res.status(403).json({ message: "Access denied to requested account transactions" });
            }
            if (type === "DEBIT") {
                matchFilter.fromAccount = new mongoose.Types.ObjectId(accountId);
            } else if (type === "CREDIT") {
                matchFilter.toAccount = new mongoose.Types.ObjectId(accountId);
            } else {
                matchFilter.$or = [
                    { fromAccount: new mongoose.Types.ObjectId(accountId) },
                    { toAccount: new mongoose.Types.ObjectId(accountId) }
                ];
            }
        } else {
            if (type === "DEBIT") {
                matchFilter.fromAccount = { $in: accountIds };
            } else if (type === "CREDIT") {
                matchFilter.toAccount = { $in: accountIds };
            } else {
                matchFilter.$or = [
                    { fromAccount: { $in: accountIds } },
                    { toAccount: { $in: accountIds } }
                ];
            }
        }

        if (status && status !== "ALL") {
            matchFilter.status = status;
        }

        if (startDate || endDate) {
            matchFilter.createdAt = {};
            if (startDate) {
                const sDate = new Date(startDate);
                if (!isNaN(sDate.getTime())) matchFilter.createdAt.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                if (!isNaN(eDate.getTime())) matchFilter.createdAt.$lte = eDate;
            }
        }

        if (search && search.trim()) {
            const s = search.trim();
            matchFilter.$and = matchFilter.$and || [];
            matchFilter.$and.push({
                $or: [
                    { reference: { $regex: s, $options: "i" } },
                    { description: { $regex: s, $options: "i" } },
                    { idempotencyKey: { $regex: s, $options: "i" } }
                ]
            });
        }

        const [transactions, total] = await Promise.all([
            transactionModel.find(matchFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("fromAccount", "accountNumber status currency")
                .populate("toAccount", "accountNumber status currency")
                .lean(),
            transactionModel.countDocuments(matchFilter)
        ]);

        // Enrich with user-specific direction: DEBIT vs CREDIT
        let totalIn = 0;
        let totalOut = 0;

        const enriched = transactions.map(tx => {
            const fromId = String(tx.fromAccount?._id || tx.fromAccount);
            const toId = String(tx.toAccount?._id || tx.toAccount);

            const isFromUser = accountIds.some(id => String(id) === fromId);
            const isToUser = accountIds.some(id => String(id) === toId);

            let direction = "TRANSFER";
            if (isFromUser && !isToUser) {
                direction = "DEBIT";
                if (tx.status === "COMPLETED") totalOut += tx.amount;
            } else if (!isFromUser && isToUser) {
                direction = "CREDIT";
                if (tx.status === "COMPLETED") totalIn += tx.amount;
            } else {
                direction = "INTERNAL_TRANSFER";
            }

            return {
                ...tx,
                direction,
                fromAccountNumber: tx.fromAccount?.accountNumber || fromId,
                toAccountNumber: tx.toAccount?.accountNumber || toId
            };
        });

        res.status(200).json({
            transactions: enriched,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                totalIn,
                totalOut
            }
        });
    } catch (err) {
        console.error("Error fetching transactions:", err.message);
        res.status(500).json({
            message: "Failed to fetch transactions"
        });
    }
}

/**
 * GET /api/transactions/:id
 * Single transaction detail with ownership check
 */
async function getTransactionByIdController(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid transaction ID format" });
        }

        const tx = await transactionModel.findById(id)
            .populate("fromAccount", "accountNumber user status")
            .populate("toAccount", "accountNumber user status");

        if (!tx) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        // Ownership validation: Sender or recipient must belong to req.user (unless system user)
        const isSender = tx.fromAccount && String(tx.fromAccount.user) === String(req.user._id);
        const isRecipient = tx.toAccount && String(tx.toAccount.user) === String(req.user._id);

        if (!isSender && !isRecipient && !req.user.systemUser) {
            return res.status(403).json({ message: "Access denied to transaction" });
        }

        // Fetch corresponding ledger entries
        const ledgerEntries = await ledgerModel.find({ transaction: tx._id }).lean();

        res.status(200).json({
            transaction: tx,
            ledgerEntries,
            direction: isSender && !isRecipient ? "DEBIT" : (!isSender && isRecipient ? "CREDIT" : "INTERNAL")
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch transaction details" });
    }
}

/**
 * GET /api/transactions/:id/receipt
 * Formatted transaction receipt
 */
async function getTransactionReceiptController(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid transaction ID" });
        }

        const tx = await transactionModel.findById(id)
            .populate({
                path: "fromAccount",
                populate: { path: "user", select: "name email" }
            })
            .populate({
                path: "toAccount",
                populate: { path: "user", select: "name email" }
            });

        if (!tx) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        const isSender = tx.fromAccount?.user && String(tx.fromAccount.user._id) === String(req.user._id);
        const isRecipient = tx.toAccount?.user && String(tx.toAccount.user._id) === String(req.user._id);

        if (!isSender && !isRecipient && !req.user.systemUser) {
            return res.status(403).json({ message: "Access denied to transaction receipt" });
        }

        const receipt = {
            receiptNumber: `RCP-${tx.reference || tx._id}`,
            transactionId: tx._id,
            reference: tx.reference,
            timestamp: tx.createdAt,
            status: tx.status,
            amount: tx.amount,
            formattedAmount: formatINR(tx.amount),
            currency: tx.currency || "INR",
            description: tx.description,
            sender: {
                name: tx.fromAccount?.user?.name || "Transact Client",
                accountNumber: tx.fromAccount?.accountNumber ? `•••• ${tx.fromAccount.accountNumber.slice(-4)}` : "—"
            },
            recipient: {
                name: tx.toAccount?.user?.name || "Recipient",
                accountNumber: tx.toAccount?.accountNumber ? `•••• ${tx.toAccount.accountNumber.slice(-4)}` : "—"
            },
            settlementType: "Double-Entry Ledger Verified"
        };

        res.status(200).json({ receipt });
    } catch (err) {
        res.status(500).json({ message: "Failed to generate transaction receipt" });
    }
}

/**
 * GET /api/accounts/:id/statement
 * Account statement over specified date range with opening & closing balances
 */
async function getAccountStatementController(req, res) {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid account ID" });
        }

        const account = await accountModel.findOne({ _id: id, user: req.user._id }).populate("user", "name email");
        if (!account) {
            return res.status(404).json({ message: "Account not found or access denied" });
        }

        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();

        // 1. Calculate opening balance: sum of ledger entries before `start`
        const openingAgg = await ledgerModel.aggregate([
            { $match: { account: account._id, createdAt: { $lt: start } } },
            {
                $group: {
                    _id: null,
                    totalCredit: { $sum: { $cond: [ { $eq: [ "$type", "CREDIT" ] }, "$amount", 0 ] } },
                    totalDebit: { $sum: { $cond: [ { $eq: [ "$type", "DEBIT" ] }, "$amount", 0 ] } }
                }
            }
        ]);

        const openingCredit = openingAgg[0]?.totalCredit || 0;
        const openingDebit = openingAgg[0]?.totalDebit || 0;
        const openingBalance = Math.round((openingCredit - openingDebit) * 100) / 100;

        // 2. Fetch ledger entries in date range
        const entries = await ledgerModel.find({
            account: account._id,
            createdAt: { $gte: start, $lte: end }
        })
        .sort({ createdAt: 1 })
        .populate("transaction", "reference status description fromAccount toAccount")
        .lean();

        let runningBalance = openingBalance;
        let totalDeposits = 0;
        let totalWithdrawals = 0;

        const statementEntries = entries.map(entry => {
            if (entry.type === "CREDIT") {
                runningBalance = Math.round((runningBalance + entry.amount) * 100) / 100;
                totalDeposits += entry.amount;
            } else {
                runningBalance = Math.round((runningBalance - entry.amount) * 100) / 100;
                totalWithdrawals += entry.amount;
            }

            return {
                _id: entry._id,
                date: entry.createdAt,
                type: entry.type,
                amount: entry.amount,
                reference: entry.transaction?.reference || String(entry.transaction?._id || ""),
                description: entry.transaction?.description || (entry.type === "CREDIT" ? "Deposit" : "Withdrawal"),
                balanceAfter: runningBalance
            };
        });

        const statement = {
            accountNumber: account.accountNumber,
            maskedAccountNumber: account.getMaskedAccountNumber(),
            accountHolder: account.user?.name,
            period: {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            },
            currency: account.currency || "INR",
            openingBalance,
            closingBalance: runningBalance,
            summary: {
                totalDeposits: Math.round(totalDeposits * 100) / 100,
                totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
                netChange: Math.round((totalDeposits - totalWithdrawals) * 100) / 100,
                transactionCount: entries.length
            },
            entries: statementEntries
        };

        res.status(200).json({ statement });
    } catch (err) {
        console.error("Statement generation error:", err.message);
        res.status(500).json({ message: "Failed to generate account statement" });
    }
}

/**
 * Sanitizes cell contents to prevent spreadsheet formula injection (CSV Injection / CWE-1236)
 */
function sanitizeCsvCell(value) {
    if (value === null || value === undefined) return '""';
    const str = String(value).trim();
    // If string starts with =, +, -, @, \t, \r, escape with single quote prefix
    if (/^[=+\-@\t\r]/.test(str)) {
        return `"'${str.replace(/"/g, '""')}"`;
    }
    return `"${str.replace(/"/g, '""')}"`;
}

/**
 * GET /api/transactions/export/csv
 * CSV export of user's transactions with formula injection protection
 */
async function exportTransactionsCsvController(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id accountNumber");
        const accountIds = userAccounts.map(a => a._id);

        const transactions = await transactionModel.find({
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        })
        .sort({ createdAt: -1 })
        .populate("fromAccount", "accountNumber")
        .populate("toAccount", "accountNumber")
        .lean();

        const headers = ["Reference", "Date", "Type", "Amount (INR)", "Status", "From Account", "To Account", "Description"];
        const rows = transactions.map(tx => {
            const isDebit = accountIds.some(id => String(id) === String(tx.fromAccount?._id));
            const type = isDebit ? "DEBIT" : "CREDIT";

            return [
                sanitizeCsvCell(tx.reference || tx._id),
                sanitizeCsvCell(new Date(tx.createdAt).toISOString()),
                sanitizeCsvCell(type),
                sanitizeCsvCell(tx.amount.toFixed(2)),
                sanitizeCsvCell(tx.status),
                sanitizeCsvCell(tx.fromAccount?.accountNumber || tx.fromAccount),
                sanitizeCsvCell(tx.toAccount?.accountNumber || tx.toAccount),
                sanitizeCsvCell(tx.description || "Funds Transfer")
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\r\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="transact_statement_${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).json({ message: "Failed to export CSV" });
    }
}

/**
 * GET /api/transactions/reconciliation/report
 * System User / Admin audit of double-entry ledger balance
 */
async function getReconciliationReportController(req, res) {
    try {
        const report = await runLedgerReconciliation(req.user._id);
        res.status(200).json({ report });
    } catch (err) {
        console.error("Reconciliation execution failed:", err.message);
        res.status(500).json({ message: "Failed to execute reconciliation audit" });
    }
}

/**
 * POST /api/transactions/:id/reverse
 * Admin or authorized reversal of a completed transfer
 */
async function reverseTransactionController(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const reversal = await createCompensatingReversal({
            originalTransactionId: id,
            reason,
            performedByUserId: req.user._id
        });

        res.status(201).json({
            message: "Compensating reversal completed successfully",
            reversal
        });
    } catch (err) {
        res.status(400).json({ message: err.message || "Failed to execute reversal" });
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getTransactionsController,
    getTransactionByIdController,
    getTransactionReceiptController,
    getAccountStatementController,
    exportTransactionsCsvController,
    getReconciliationReportController,
    reverseTransactionController
};
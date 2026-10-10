const mongoose = require("mongoose");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const auditLogModel = require("../models/auditLog.model");

/**
 * GET /api/admin/overview
 * System-wide overview of all accounts, total system liquidity, and ledger state
 */
async function getAdminOverviewController(req, res) {
    try {
        const [accounts, totalTransactions, pendingTransactions, failedTransactions] = await Promise.all([
            accountModel.find({}).populate("user", "name email").lean(),
            transactionModel.countDocuments({ status: "COMPLETED" }),
            transactionModel.countDocuments({ status: "PENDING" }),
            transactionModel.countDocuments({ status: "FAILED" }),
        ]);

        const statusCounts = {
            active: accounts.filter(a => a.status === "ACTIVE").length,
            frozen: accounts.filter(a => a.status === "FROZEN").length,
            closed: accounts.filter(a => a.status === "CLOSED").length,
            total: accounts.length
        };

        // Sum total liquidity across all accounts
        const ledgerAgg = await ledgerModel.aggregate([
            {
                $group: {
                    _id: "$type",
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        const totalCredits = ledgerAgg.find(g => g._id === "CREDIT")?.totalAmount || 0;
        const totalDebits = ledgerAgg.find(g => g._id === "DEBIT")?.totalAmount || 0;
        const totalSystemLiquidity = Math.round((totalCredits - totalDebits) * 100) / 100;

        res.status(200).json({
            systemOverview: {
                totalAccounts: accounts.length,
                statusCounts,
                totalCompletedTransactions: totalTransactions,
                pendingTransactions,
                failedTransactions,
                totalSystemLiquidity,
                totalLedgerCredits: Math.round(totalCredits * 100) / 100,
                totalLedgerDebits: Math.round(totalDebits * 100) / 100,
            },
            accounts: accounts.slice(0, 50).map(a => ({
                _id: a._id,
                accountNumber: a.accountNumber,
                holderName: a.user?.name || "System",
                holderEmail: a.user?.email,
                status: a.status,
                currency: a.currency,
                createdAt: a.createdAt
            }))
        });
    } catch (err) {
        console.error("Admin overview failed:", err.message);
        res.status(500).json({ message: "Failed to generate admin overview" });
    }
}

/**
 * GET /api/admin/audit-logs
 * Fetch administrative audit log trail
 */
async function getAuditLogsController(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            auditLogModel.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("performedBy", "name email")
                .populate("targetAccount", "accountNumber")
                .populate("targetTransaction", "reference amount")
                .lean(),
            auditLogModel.countDocuments()
        ]);

        res.status(200).json({
            auditLogs: logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch audit logs" });
    }
}

/**
 * GET /api/admin/ledger-inspect/:identifier
 * Detailed ledger debit/credit postings inspection for a transaction reference or ID
 */
async function inspectLedgerController(req, res) {
    try {
        const { identifier } = req.params;
        let query = {};

        if (mongoose.Types.ObjectId.isValid(identifier)) {
            query = { _id: identifier };
        } else {
            query = { reference: identifier };
        }

        const tx = await transactionModel.findOne(query)
            .populate("fromAccount", "accountNumber status")
            .populate("toAccount", "accountNumber status");

        if (!tx) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        const ledgerEntries = await ledgerModel.find({ transaction: tx._id }).lean();

        res.status(200).json({
            transaction: tx,
            ledgerEntries,
            isBalanced: ledgerEntries.length >= 2 &&
                ledgerEntries.some(e => e.type === "DEBIT") &&
                ledgerEntries.some(e => e.type === "CREDIT")
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to inspect ledger transaction" });
    }
}

module.exports = {
    getAdminOverviewController,
    getAuditLogsController,
    inspectLedgerController
};

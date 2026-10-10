const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model");
const accountModel = require("../models/account.model");

/**
 * Categorize a transaction based on description or context
 */
function categorizeTransaction(tx) {
    const desc = (tx.description || "").toLowerCase();
    if (desc.includes("rent") || desc.includes("home") || desc.includes("lease")) return "Housing & Rent";
    if (desc.includes("food") || desc.includes("grocery") || desc.includes("dinner") || desc.includes("dining")) return "Food & Dining";
    if (desc.includes("bill") || desc.includes("utility") || desc.includes("electricity") || desc.includes("wifi")) return "Bills & Utilities";
    if (desc.includes("freelance") || desc.includes("salary") || desc.includes("payroll") || desc.includes("bonus")) return "Income & Earnings";
    if (desc.includes("system") || desc.includes("issuance") || desc.includes("capital")) return "Capital Allocation";
    if (desc.includes("loan") || desc.includes("repay")) return "Loans & Debt";
    return "Peer Transfers";
}

/**
 * GET /api/analytics/insights
 * Generates personal financial insights based on real user transaction data
 */
async function getFinancialInsightsController(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id accountNumber");
        const accountIds = userAccounts.map(a => a._id);

        if (accountIds.length === 0) {
            return res.status(200).json({
                hasData: false,
                message: "Open an account to generate financial insights",
                summary: { totalIn: 0, totalOut: 0, netSavings: 0, savingsRate: 0, averageTransfer: 0 },
                monthlyTrends: [],
                categoryBreakdown: [],
                accountDistribution: []
            });
        }

        // Fetch transactions over the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const transactions = await transactionModel.find({
            createdAt: { $gte: sixMonthsAgo },
            status: "COMPLETED",
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        }).sort({ createdAt: 1 }).lean();

        if (transactions.length === 0) {
            return res.status(200).json({
                hasData: false,
                message: "No completed transactions recorded in the last 6 months",
                summary: { totalIn: 0, totalOut: 0, netSavings: 0, savingsRate: 0, averageTransfer: 0 },
                monthlyTrends: [],
                categoryBreakdown: [],
                accountDistribution: []
            });
        }

        let totalIn = 0;
        let totalOut = 0;
        let transferCount = 0;
        let largestTransfer = 0;

        const categoryMap = {};
        const accountMap = {};
        const monthlyMap = {};

        // Initialize last 6 months buckets
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            monthlyMap[key] = { month: key, moneyIn: 0, moneyOut: 0, net: 0, count: 0 };
        }

        userAccounts.forEach(acc => {
            const num = acc.accountNumber || String(acc._id);
            accountMap[num] = { accountNumber: num, volume: 0, count: 0 };
        });

        transactions.forEach(tx => {
            const fromId = String(tx.fromAccount);
            const toId = String(tx.toAccount);

            const isFromUser = accountIds.some(id => String(id) === fromId);
            const isToUser = accountIds.some(id => String(id) === toId);

            const amount = tx.amount || 0;
            if (amount > largestTransfer) largestTransfer = amount;

            const txDate = new Date(tx.createdAt);
            const monthKey = txDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

            if (isFromUser && !isToUser) {
                // Outflow
                totalOut += amount;
                transferCount++;
                if (monthlyMap[monthKey]) {
                    monthlyMap[monthKey].moneyOut += amount;
                    monthlyMap[monthKey].count++;
                }

                const cat = categorizeTransaction(tx);
                categoryMap[cat] = (categoryMap[cat] || 0) + amount;
            } else if (!isFromUser && isToUser) {
                // Inflow
                totalIn += amount;
                if (monthlyMap[monthKey]) {
                    monthlyMap[monthKey].moneyIn += amount;
                    monthlyMap[monthKey].count++;
                }
            } else {
                // Internal transfer between user's own accounts
                transferCount++;
                if (monthlyMap[monthKey]) {
                    monthlyMap[monthKey].count++;
                }
            }
        });

        // Compute monthly nets
        const monthlyTrends = Object.values(monthlyMap).map(m => ({
            ...m,
            moneyIn: Math.round(m.moneyIn * 100) / 100,
            moneyOut: Math.round(m.moneyOut * 100) / 100,
            net: Math.round((m.moneyIn - m.moneyOut) * 100) / 100
        }));

        // Compute category percentages
        const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
            category,
            amount: Math.round(amount * 100) / 100,
            percentage: totalOut > 0 ? Math.round((amount / totalOut) * 100) : 0
        })).sort((a, b) => b.amount - a.amount);

        const netSavings = Math.round((totalIn - totalOut) * 100) / 100;
        const savingsRate = totalIn > 0 ? Math.max(0, Math.round((netSavings / totalIn) * 100)) : 0;
        const averageTransfer = transferCount > 0 ? Math.round((totalOut / transferCount) * 100) / 100 : 0;

        res.status(200).json({
            hasData: true,
            summary: {
                totalIn: Math.round(totalIn * 100) / 100,
                totalOut: Math.round(totalOut * 100) / 100,
                netSavings,
                savingsRate,
                averageTransfer,
                largestTransfer: Math.round(largestTransfer * 100) / 100,
                totalTransactionsAnalyzed: transactions.length
            },
            monthlyTrends,
            categoryBreakdown
        });
    } catch (err) {
        console.error("Analytics generation failed:", err.message);
        res.status(500).json({ message: "Failed to generate financial analytics" });
    }
}

module.exports = {
    getFinancialInsightsController
};

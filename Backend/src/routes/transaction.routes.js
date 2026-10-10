const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * POST /api/transactions/
 * Create a new transfer transaction
 */
transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);

/**
 * POST /api/transactions/system/initial-funds
 * Create initial funds transaction from system user
 */
transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);

/**
 * GET /api/transactions/
 * Get user's persistent transaction history with pagination and filters
 */
transactionRoutes.get("/", authMiddleware.authMiddleware, transactionController.getTransactionsController);

/**
 * GET /api/transactions/export/csv
 * Export transaction history as CSV with spreadsheet formula injection protection
 */
transactionRoutes.get("/export/csv", authMiddleware.authMiddleware, transactionController.exportTransactionsCsvController);

/**
 * GET /api/transactions/reconciliation/report
 * Run or view ledger reconciliation report (System User only)
 */
transactionRoutes.get("/reconciliation/report", authMiddleware.authSystemUserMiddleware, transactionController.getReconciliationReportController);

/**
 * GET /api/transactions/:id
 * Get single transaction details
 */
transactionRoutes.get("/:id", authMiddleware.authMiddleware, transactionController.getTransactionByIdController);

/**
 * GET /api/transactions/:id/receipt
 * Get printable/shareable transaction receipt
 */
transactionRoutes.get("/:id/receipt", authMiddleware.authMiddleware, transactionController.getTransactionReceiptController);

/**
 * POST /api/transactions/:id/reverse
 * Execute compensating transaction reversal (System User only)
 */
transactionRoutes.post("/:id/reverse", authMiddleware.authSystemUserMiddleware, transactionController.reverseTransactionController);

module.exports = transactionRoutes;
const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

/**
 * GET /api/admin/overview
 * System-wide accounts, ledger liquidity, and operational metrics
 */
router.get("/overview", authMiddleware.authSystemUserMiddleware, adminController.getAdminOverviewController);

/**
 * GET /api/admin/audit-logs
 * System audit logs
 */
router.get("/audit-logs", authMiddleware.authSystemUserMiddleware, adminController.getAuditLogsController);

/**
 * GET /api/admin/ledger-inspect/:identifier
 * Inspect raw balanced ledger entries for any transaction
 */
router.get("/ledger-inspect/:identifier", authMiddleware.authSystemUserMiddleware, adminController.inspectLedgerController);

module.exports = router;

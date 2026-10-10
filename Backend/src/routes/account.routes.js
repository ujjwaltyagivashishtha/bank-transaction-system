const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");
const transactionController = require("../controllers/transaction.controller");

const recipientController = require("../controllers/recipient.controller");

const router = express.Router();

/**
 * POST /api/accounts/
 * Create a new account
 */
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);

/**
 * GET /api/accounts/
 * Get all accounts of the logged-in user
 */
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController);

/**
 * GET /api/accounts/lookup?identifier=...
 * Verify recipient before initiating transfer (Section 9)
 */
router.get("/lookup", authMiddleware.authMiddleware, accountController.lookupAccountController);

/**
 * Recipient search, recent, and saved aliases under /api/accounts/recipients
 */
router.get("/recipients/search", authMiddleware.authMiddleware, recipientController.searchRecipientsController);
router.get("/recipients/recent", authMiddleware.authMiddleware, recipientController.getRecentRecipientsController);
router.get("/recipients/saved", authMiddleware.authMiddleware, recipientController.getSavedRecipientsController);
router.post("/recipients/saved", authMiddleware.authMiddleware, recipientController.saveRecipientController);
router.delete("/recipients/saved/:id", authMiddleware.authMiddleware, recipientController.deleteSavedRecipientController);

/**
 * GET /api/accounts/balance/:accountId
 */
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController);

/**
 * GET /api/accounts/:id/statement
 * Get account statement over date range
 */
router.get("/:id/statement", authMiddleware.authMiddleware, transactionController.getAccountStatementController);

/**
 * PATCH /api/accounts/:id/freeze
 */
router.patch("/:id/freeze", authMiddleware.authMiddleware, accountController.freezeAccountController);

/**
 * PATCH /api/accounts/:id/unfreeze
 */
router.patch("/:id/unfreeze", authMiddleware.authMiddleware, accountController.unfreezeAccountController);

/**
 * PATCH /api/accounts/:id/close
 */
router.patch("/:id/close", authMiddleware.authMiddleware, accountController.closeAccountController);

module.exports = router;
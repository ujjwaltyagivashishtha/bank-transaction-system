const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const analyticsController = require("../controllers/analytics.controller");

const router = express.Router();

/**
 * GET /api/analytics/insights
 * Real personal financial insights & monthly cash flow analytics
 */
router.get("/insights", authMiddleware.authMiddleware, analyticsController.getFinancialInsightsController);

module.exports = router;

const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const recipientController = require("../controllers/recipient.controller");

const router = express.Router();

// All recipient endpoints require authenticated user
router.use(authMiddleware.authMiddleware);

// 1. Search recipients by name or account number
router.get("/search", recipientController.searchRecipientsController);

// 2. Recent transfer recipients
router.get("/recent", recipientController.getRecentRecipientsController);

// 3. Saved beneficiaries
router.get("/saved", recipientController.getSavedRecipientsController);
router.get("/", recipientController.getSavedRecipientsController);

// 4. Save a new beneficiary
router.post("/saved", recipientController.saveRecipientController);
router.post("/", recipientController.saveRecipientController);

// 5. Delete a saved beneficiary
router.delete("/saved/:id", recipientController.deleteSavedRecipientController);
router.delete("/:id", recipientController.deleteSavedRecipientController);

module.exports = router;

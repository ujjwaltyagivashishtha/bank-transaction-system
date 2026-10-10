const mongoose = require("mongoose");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const auditLogModel = require("../models/auditLog.model");

/**
 * Create a new account
 * Generates unique 12-digit public account number
 */
async function createAccountController(req, res) {
  try {
    const user = req.user;

    const account = await accountModel.create({
      user: user._id,
      status: "ACTIVE",
      currency: "INR",
    });

    res.status(201).json({
      account: {
        _id: account._id,
        accountNumber: account.accountNumber,
        maskedAccountNumber: account.getMaskedAccountNumber(),
        status: account.status,
        currency: account.currency,
        createdAt: account.createdAt,
      },
    });
  } catch (err) {
    console.error("Account creation failed:", err.message);
    res.status(500).json({
      message: "Failed to create account",
    });
  }
}

/**
 * Get all accounts of the logged-in user with their current balances
 */
async function getUserAccountsController(req, res) {
  try {
    const accounts = await accountModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 });

    const enrichedAccounts = await Promise.all(
      accounts.map(async (acc) => {
        const balance = await acc.getBalance();
        return {
          _id: acc._id,
          accountNumber: acc.accountNumber,
          maskedAccountNumber: acc.getMaskedAccountNumber(),
          status: acc.status,
          currency: acc.currency,
          balance,
          createdAt: acc.createdAt,
        };
      }),
    );

    res.status(200).json({
      accounts: enrichedAccounts,
    });
  } catch (err) {
    console.error("Error retrieving accounts:", err.message);
    res.status(500).json({
      message: "Failed to retrieve accounts",
    });
  }
}

/**
 * Get balance for a specific account with ownership validation
 */
async function getAccountBalanceController(req, res) {
  try {
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({
        message: "Invalid account ID format",
      });
    }

    const account = await accountModel.findOne({
      _id: accountId,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found or does not belong to you",
      });
    }

    const balance = await account.getBalance();

    res.status(200).json({
      accountId: account._id,
      accountNumber: account.accountNumber,
      balance: balance,
      currency: account.currency,
      status: account.status,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch account balance",
    });
  }
}

/**
 * Lookup recipient account for transfer verification (Section 9)
 * Accepts either 12-digit accountNumber or MongoDB ObjectId
 * Returns only sanitized details: masked owner name, account number, status, currency
 */
async function lookupAccountController(req, res) {
  try {
    const { identifier } = req.query;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({
        message: "Recipient identifier (account number or ID) is required",
      });
    }

    const trimmed = identifier.trim();
    let query = {};

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      query = { _id: trimmed };
    } else {
      query = { accountNumber: trimmed };
    }

    const account = await accountModel
      .findOne(query)
      .populate("user", "name email");

    if (!account) {
      return res.status(404).json({
        message:
          "Recipient account not found. Please verify the account number.",
      });
    }

    // Prevent looking up one's own account as recipient
    const isSelf = String(account.user._id) === String(req.user._id);

    // Sanitize owner name for privacy (e.g. "Alice E*****")
    const rawName = account.user?.name || "Bank Customer";
    const parts = rawName.split(" ");
    const maskedName = parts
      .map((p, idx) => {
        if (p.length <= 2) return p;
        return p[0] + "*".repeat(p.length - 1);
      })
      .join(" ");

    res.status(200).json({
      recipient: {
        accountId: account._id,
        maskedAccountNumber: account.getMaskedAccountNumber(),
        recipientName: maskedName,
        status: account.status,
        currency: account.currency,
        isSelf,
      },
    });
  } catch (err) {
    console.error("Account lookup failed:", err.message);
    res.status(500).json({
      message: "Failed to lookup recipient account",
    });
  }
}

/**
 * Freeze an account (blocks further transfers out)
 */
async function freezeAccountController(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await accountModel.findOne({ _id: id, user: req.user._id });
    if (!account) {
      return res
        .status(404)
        .json({ message: "Account not found or access denied" });
    }

    if (account.status === "CLOSED") {
      return res
        .status(400)
        .json({ message: "Cannot freeze a CLOSED account" });
    }

    account.status = "FROZEN";
    await account.save();

    await auditLogModel.create({
      action: "ACCOUNT_FREEZE",
      performedBy: req.user._id,
      targetAccount: account._id,
      details: { reason: req.body?.reason || "User requested lock" },
    });

    res.status(200).json({
      message: "Account has been frozen successfully",
      account,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to freeze account" });
  }
}

/**
 * Unfreeze an account
 */
async function unfreezeAccountController(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await accountModel.findOne({ _id: id, user: req.user._id });
    if (!account) {
      return res
        .status(404)
        .json({ message: "Account not found or access denied" });
    }

    if (account.status !== "FROZEN") {
      return res
        .status(400)
        .json({ message: "Account is not currently frozen" });
    }

    account.status = "ACTIVE";
    await account.save();

    await auditLogModel.create({
      action: "ACCOUNT_UNFREEZE",
      performedBy: req.user._id,
      targetAccount: account._id,
    });

    res.status(200).json({
      message: "Account has been reactivated successfully",
      account,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to unfreeze account" });
  }
}

/**
 * Close an account (Strict rule: Balance must be zero)
 */
async function closeAccountController(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await accountModel.findOne({ _id: id, user: req.user._id });
    if (!account) {
      return res
        .status(404)
        .json({ message: "Account not found or access denied" });
    }

    if (account.status === "CLOSED") {
      return res.status(400).json({ message: "Account is already closed" });
    }

    const balance = await account.getBalance();
    if (balance !== 0) {
      return res.status(400).json({
        message: `Cannot close account with non-zero balance (Current balance: ₹${balance.toFixed(2)}). Please transfer remaining funds before closing.`,
      });
    }

    account.status = "CLOSED";
    await account.save();

    await auditLogModel.create({
      action: "ACCOUNT_CLOSE",
      performedBy: req.user._id,
      targetAccount: account._id,
    });

    res.status(200).json({
      message: "Account closed successfully",
      account,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to close account" });
  }
}

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
  lookupAccountController,
  freezeAccountController,
  unfreezeAccountController,
  closeAccountController,
};

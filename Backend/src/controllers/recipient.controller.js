const mongoose = require("mongoose");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const transactionModel = require("../models/transaction.model");
const recipientModel = require("../models/recipient.model");

/**
 * Escape regular expression special characters to avoid ReDoS or invalid regex syntax
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 1. Search recipients by name, email, or account number
 * GET /api/recipients/search?query=...
 */
async function searchRecipientsController(req, res) {
  try {
    const rawQuery = req.query.query || req.query.q;
    if (
      !rawQuery ||
      typeof rawQuery !== "string" ||
      rawQuery.trim().length < 2
    ) {
      return res.status(400).json({
        message: "Search query must be at least 2 characters",
      });
    }

    const query = rawQuery.trim();
    const escaped = escapeRegex(query);
    const currentUserId = req.user._id;

    // Find users matching name or email (exclude self and system users)
    const matchingUsers = await userModel
      .find({
        _id: { $ne: currentUserId },
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ],
        systemUser: { $ne: true },
      })
      .select("_id name email")
      .limit(15);

    const matchingUserIds = matchingUsers.map((u) => u._id);

    // Account search conditions:
    // Must be ACTIVE, cannot belong to current user
    const accountFilter = {
      user: { $ne: currentUserId },
      status: "ACTIVE",
      $or: [
        { accountNumber: { $regex: escaped, $options: "i" } },
        { user: { $in: matchingUserIds } },
      ],
    };

    const matchingAccounts = await accountModel
      .find(accountFilter)
      .populate("user", "name email systemUser")
      .limit(10);

    // Filter out any system users that might not have matched earlier
    const sanitized = matchingAccounts
      .filter((acc) => acc.user && !acc.user.systemUser)
      .map((acc) => {
        // Mask email for privacy: show first 2 chars + *** + @domain
        let maskedEmail = "";
        if (acc.user.email) {
          const [localPart, domain] = acc.user.email.split("@");
          const visible = localPart.slice(0, Math.min(2, localPart.length));
          maskedEmail = `${visible}***@${domain}`;
        }
        return {
          accountId: acc._id,
          maskedAccountNumber: acc.getMaskedAccountNumber(),
          recipientName: acc.user.name,
          maskedEmail,
          status: acc.status,
          currency: acc.currency || "INR",
        };
      });

    res.status(200).json({
      recipients: sanitized,
    });
  } catch (err) {
    console.error("Recipient search failed:", err.message);
    res.status(500).json({
      message: "Failed to search recipients",
    });
  }
}

/**
 * 2. Get recent transfer recipients from user's outgoing transaction history
 * GET /api/recipients/recent
 */
async function getRecentRecipientsController(req, res) {
  try {
    const currentUserId = req.user._id;

    // Find user's accounts
    const userAccounts = await accountModel
      .find({ user: currentUserId })
      .select("_id");
    const userAccountIds = userAccounts.map((a) => a._id);

    if (userAccountIds.length === 0) {
      return res.status(200).json({ recentRecipients: [] });
    }

    // Find completed outgoing transactions
    const recentTxs = await transactionModel
      .find({
        fromAccount: { $in: userAccountIds },
        status: "COMPLETED",
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "toAccount",
        populate: { path: "user", select: "name email systemUser" },
      });

    const seenAccounts = new Set();
    const recentRecipients = [];

    for (const tx of recentTxs) {
      const toAcc = tx.toAccount;
      if (!toAcc || !toAcc.user) continue;

      const toAccountIdStr = String(toAcc._id);

      // Skip self-transfers or already collected accounts
      if (
        String(toAcc.user._id) === String(currentUserId) ||
        toAcc.user.systemUser
      ) {
        continue;
      }

      if (!seenAccounts.has(toAccountIdStr)) {
        seenAccounts.add(toAccountIdStr);
        recentRecipients.push({
          accountId: toAcc._id,
          maskedAccountNumber: toAcc.getMaskedAccountNumber
            ? toAcc.getMaskedAccountNumber()
            : `•••• ${toAcc.accountNumber.slice(-4)}`,
          recipientName: toAcc.user.name,
          status: toAcc.status,
          currency: toAcc.currency || "INR",
          lastTransferredAt: tx.createdAt,
          lastAmount: tx.amount,
        });

        if (recentRecipients.length >= 8) break;
      }
    }

    res.status(200).json({
      recentRecipients,
    });
  } catch (err) {
    console.error("Error retrieving recent recipients:", err.message);
    res.status(500).json({
      message: "Failed to retrieve recent recipients",
    });
  }
}

/**
 * 3. Get saved beneficiaries for authenticated user
 * GET /api/recipients/saved
 */
async function getSavedRecipientsController(req, res) {
  try {
    const saved = await recipientModel
      .find({ user: req.user._id })
      .populate("account", "status currency accountNumber")
      .sort({ createdAt: -1 });

    const formatted = saved.map((r) => ({
      _id: r._id,
      accountId: r.account?._id || r.account,
      maskedAccountNumber: `•••• ${r.accountNumber.slice(-4)}`,
      recipientName: r.recipientName,
      nickname: r.nickname || "",
      status: r.account?.status || "ACTIVE",
      currency: r.account?.currency || "INR",
      createdAt: r.createdAt,
    }));

    res.status(200).json({
      savedRecipients: formatted,
    });
  } catch (err) {
    console.error("Error retrieving saved recipients:", err.message);
    res.status(500).json({
      message: "Failed to retrieve saved recipients",
    });
  }
}

/**
 * 4. Save a new beneficiary
 * POST /api/recipients/saved
 */
async function saveRecipientController(req, res) {
  try {
    const { identifier, nickname } = req.body;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({
        message: "Recipient account number or ID is required",
      });
    }

    const trimmed = identifier.trim();
    let query = {};
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      query = { _id: trimmed };
    } else {
      query = { accountNumber: trimmed };
    }

    const targetAccount = await accountModel
      .findOne(query)
      .populate("user", "name systemUser");
    if (!targetAccount) {
      return res.status(404).json({
        message:
          "Recipient account not found. Please verify the account number.",
      });
    }

    if (targetAccount.status !== "ACTIVE") {
      return res.status(400).json({
        message: `Cannot save recipient. Account is currently ${targetAccount.status.toLowerCase()}.`,
      });
    }

    // Cannot save own account as beneficiary
    const targetUserId = targetAccount.user?._id || targetAccount.user;
    if (String(targetUserId) === String(req.user._id)) {
      return res.status(400).json({
        message: "Cannot save your own account as a recipient.",
      });
    }

    // Do not save system accounts
    if (targetAccount.user && targetAccount.user.systemUser) {
      return res.status(400).json({
        message: "System accounts cannot be saved as beneficiaries.",
      });
    }

    const recipientName = targetAccount.user?.name || "Bank Customer";
    const trimmedNickname =
      nickname && typeof nickname === "string"
        ? nickname.trim().slice(0, 50)
        : "";

    // Upsert to handle re-saving or updating nickname
    const savedDoc = await recipientModel.findOneAndUpdate(
      { user: req.user._id, account: targetAccount._id },
      {
        user: req.user._id,
        account: targetAccount._id,
        accountNumber: targetAccount.accountNumber,
        recipientName,
        nickname: trimmedNickname,
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    res.status(201).json({
      message: "Recipient saved successfully",
      recipient: {
        _id: savedDoc._id,
        accountId: targetAccount._id,
        maskedAccountNumber: targetAccount.getMaskedAccountNumber
          ? targetAccount.getMaskedAccountNumber()
          : `•••• ${targetAccount.accountNumber.slice(-4)}`,
        recipientName,
        nickname: savedDoc.nickname,
        status: targetAccount.status,
        currency: targetAccount.currency,
      },
    });
  } catch (err) {
    console.error("Save recipient failed:", err.message);
    res.status(500).json({
      message: "Failed to save recipient",
    });
  }
}

/**
 * 5. Delete a saved beneficiary
 * DELETE /api/recipients/saved/:id
 */
async function deleteSavedRecipientController(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid recipient ID format",
      });
    }

    const result = await recipientModel.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!result) {
      return res.status(404).json({
        message: "Saved recipient not found or not owned by you",
      });
    }

    res.status(200).json({
      message: "Saved recipient removed successfully",
    });
  } catch (err) {
    console.error("Delete recipient failed:", err.message);
    res.status(500).json({
      message: "Failed to remove saved recipient",
    });
  }
}

module.exports = {
  searchRecipientsController,
  getRecentRecipientsController,
  getSavedRecipientsController,
  saveRecipientController,
  deleteSavedRecipientController,
};

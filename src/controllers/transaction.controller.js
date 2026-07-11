const transactionModel = require("../models/transaction.model");
const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * - Create a new transaction
 * THE 10-STEPS TRANSAFER FLOW:
 * 1. Validate the request
 * 2. Validate the Idompotency-Key
 * 3. Check Account Status (fromAccount and toAccount)
 * 4. Derive sender balance from ledger
 * 5. Create a new transaction with status PENDING
 * 6. Create a DEBIT entry
 * 7. Create a CREDIT entry
 * 8. Mark transaction as COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  /**
   * - Step 1: Validate the request
   */

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "fromAccount, toAccount, amount and idempotencyKey are required",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromUserAccount || !toUserAccount) {
    return res.status(400).json({
      message: "Both fromAccount and toAccount must be valid accounts",
    });
  }

  /**
   * - Step 2: Validate the Idompotency-Key
   */

  const existingTransaction = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (existingTransaction) {
    if (existingTransaction.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already completed",
        transaction: existingTransaction,
      });
    } else if (existingTransaction.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is still pending",
      });
    } else if (existingTransaction.status === "FAILED") {
      return res.status(400).json({
        message: "Transaction has failed",
      });
    } else if (existingTransaction.status === "REVERSED") {
      return res.status(400).json({
        message: "Transaction has been reversed",
      });
    }
  }

  /**
   * - Step 3: Check Account Status (fromAccount and toAccount)
   */

  if (
    fromUserAccount.status !== "ACTIVE" &&
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message: "Both fromAccount and toAccount must be active accounts",
    });
  }

  /**
   * - Step 4: Derive sender balance from ledger
   */

  const senderBalance = await fromUserAccount.getBalance();

  if (senderBalance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${senderBalance}. Requested amount is ${amount}`,
    });
  }

  /**
   * - Step 5: Create a new transaction with status PENDING
   */

  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = new transactionModel(
    {
      fromAccount,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    },
    { session },
  );


  /**
   * - Step 6: Create a DEBIT entry
   */


  const debitEntry = new ledgerModel(
    {
      account: fromAccount,
      type: "DEBIT",
      amount: amount,
      transaction: transaction._id,
    },
    { session },
  );

  /**
   * - Step 7: Create a CREDIT entry
   */

  const creditEntry = new ledgerModel(
    {
      account: toAccount,
      type: "CREDIT",
      amount: amount,
      transaction: transaction._id,
    },
    { session },
  );

  /**
   * - Step 8: Mark transaction as COMPLETED
   */

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  /**
   * - Step 9: Commit MongoDB session
   */
  await session.commitTransaction();
  await session.endSession();


  /**
   * - Step 10: Send email notification
   */

  await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);

  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount and idempotencyKey are required",
    });
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount
  });

  if(!toUserAccount){
    return res.status(400).json({
      message: "toAccount must be a valid account",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    systemAccount: true,
    user: req.user._id
  });

  if(!fromUserAccount){
    return res.status(400).json({
      message: "System user account not found",
    });
  }


  const session = await mongoose.startSession();
  session.startTransaction();
  
  const transaction = new transactionModel(
    {
      fromAccount: fromUserAccount._id,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    },
    { session },
  );

  const debitEntry = new ledgerModel(
    {
      account: fromUserAccount._id,
      type: "DEBIT",
      amount: amount,
      transaction: transaction._id,
    },
    { session },
  );
  
  const creditEntry = new ledgerModel(
    {
      account: toAccount,
      type: "CREDIT",
      amount: amount,
      transaction: transaction._id,
    },
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });
  
  await session.commitTransaction();
  await session.endSession();

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: transaction
  });
}


module.exports = {
  createTransaction,
  createInitialFundsTransaction
};
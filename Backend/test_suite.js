require("dotenv").config();
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const app = require("./src/app");
const userModel = require("./src/models/user.model");
const accountModel = require("./src/models/account.model");
const transactionModel = require("./src/models/transaction.model");
const ledgerModel = require("./src/models/ledger.model");

async function runTestSuite() {
  console.log("=================================================");
  console.log("🚀 STARTING BANKING SYSTEM AUTOMATED TEST SUITE");
  console.log("=================================================");

  let testPassed = 0;
  let testFailed = 0;
  let replSet = null;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      testFailed++;
    }
  }

  try {
    let uri;
    if (process.env.MONGO_URI) {
      console.log(
        "Connecting to configured MongoDB replica set URI for transaction support...",
      );
      uri = process.env.MONGO_URI;
    } else {
      console.log(
        "Initializing in-memory MongoDB replica set with transaction support...",
      );
      replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      uri = replSet.getUri();
    }

    // Set dummy JWT_SECRET if missing
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || "test_jwt_secret_key_1234567890";

    let connected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 20000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
        });
        connected = true;
        break;
      } catch (connErr) {
        console.warn(
          `Connection attempt ${attempt} warning: ${connErr.message}. Retrying in 2s...`,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (!connected)
      throw new Error(
        "Could not establish connection to MongoDB after 3 attempts.",
      );
    console.log("Connected to MongoDB successfully.\n");

    const timestamp = Date.now();
    const user1Email = `user1_${timestamp}@example.com`;
    const user2Email = `user2_${timestamp}@example.com`;
    const sysUserEmail = `sysadmin_${timestamp}@example.com`;

    // -----------------------------------------------------------------
    // TEST SECTION 1: AUTHENTICATION
    // -----------------------------------------------------------------
    console.log("--- 1. Authentication & Security ---");

    // 1.1 Register User 1
    const regRes1 = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice Explorer",
        email: user1Email,
        password: "password123",
      });
    assert(
      regRes1.status === 201 &&
        regRes1.body.token &&
        regRes1.body.user?.email === user1Email,
      "Register User 1",
    );
    const user1Token = regRes1.body.token;

    // 1.2 Duplicate Registration Rejection
    const dupRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice Clone",
        email: user1Email,
        password: "password123",
      });
    assert(dupRes.status === 422, "Duplicate Registration Rejection (422)");

    // 1.3 Register User 2
    const regRes2 = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Bob Builder",
        email: user2Email,
        password: "password123",
      });
    assert(regRes2.status === 201, "Register User 2");
    const user2Token = regRes2.body.token;

    // 1.4 Register System User & elevate systemUser in DB
    const regSysRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "System Admin",
        email: sysUserEmail,
        password: "adminPassword123",
      });
    await userModel.updateOne(
      { email: sysUserEmail },
      { $set: { systemUser: true } },
    );

    // Login System User to get token with systemUser = true
    const sysLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: sysUserEmail, password: "adminPassword123" });
    assert(
      sysLoginRes.status === 200 && sysLoginRes.body.user.systemUser === true,
      "System User Login & systemUser flag",
    );
    const sysToken = sysLoginRes.body.token;

    // 1.5 Invalid Password Login
    const badLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user1Email, password: "wrongpassword" });
    assert(
      badLoginRes.status === 401,
      "Invalid Password Login Rejection (401)",
    );

    // 1.6 /api/auth/me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      meRes.status === 200 &&
        meRes.body.user.name === "Alice Explorer" &&
        meRes.body.user.password === undefined,
      "GET /api/auth/me returns sanitized user without password",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 2: ACCOUNTS & OWNERSHIP
    // -----------------------------------------------------------------
    console.log("\n--- 2. Accounts & Ownership Protection ---");

    // 2.1 Create Account for User 1 (Account A)
    const accRes1 = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      accRes1.status === 201 && accRes1.body.account?.status === "ACTIVE",
      "Create Account for User 1 (Account A)",
    );
    const accountAId = accRes1.body.account._id;

    // 2.2 Create Account for User 2 (Account B)
    const accRes2 = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user2Token}`);
    assert(
      accRes2.status === 201 && accRes2.body.account?.status === "ACTIVE",
      "Create Account for User 2 (Account B)",
    );
    const accountBId = accRes2.body.account._id;

    // 2.3 User 1 Lists Accounts
    const listRes = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      listRes.status === 200 && listRes.body.accounts.length >= 1,
      "List User 1 Accounts",
    );

    // 2.4 User 1 Fetches Balance for Account A
    const balRes1 = await request(app)
      .get(`/api/accounts/balance/${accountAId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      balRes1.status === 200 && balRes1.body.balance === 0,
      "Account A Initial Balance is ₹0.00",
    );

    // 2.5 Ownership Test: User 1 Attempts to fetch balance of Account B (belonging to User 2)
    const foreignBalRes = await request(app)
      .get(`/api/accounts/balance/${accountBId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      foreignBalRes.status === 404,
      "Foreign Account Balance Access Blocked (404)",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 3: SYSTEM FUNDING (AUTHORIZED ISSUANCE MODEL)
    // -----------------------------------------------------------------
    console.log("\n--- 3. System Initial Funding ---");

    // 3.1 Normal User 1 attempts System Funding (MUST receive 403 Forbidden)
    const unauthorizedFundRes = await request(app)
      .post("/api/transactions/system/initial-funds")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        toAccount: accountAId,
        amount: 10000,
        idempotencyKey: `sys_unauth_${timestamp}`,
      });
    assert(
      unauthorizedFundRes.status === 403,
      "Normal User Calling System Funding receives 403 Forbidden",
    );

    // 3.2 System User funds Account A with ₹10,000
    const fundRes = await request(app)
      .post("/api/transactions/system/initial-funds")
      .set("Authorization", `Bearer ${sysToken}`)
      .send({
        toAccount: accountAId,
        amount: 10000,
        idempotencyKey: `sys_fund_${timestamp}`,
      });
    assert(
      fundRes.status === 201 &&
        fundRes.body.transaction?.status === "COMPLETED",
      "System User Initial Funding of ₹10,000 to Account A",
    );

    // 3.3 Check Account A balance now
    const balAfterFund = await request(app)
      .get(`/api/accounts/balance/${accountAId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      balAfterFund.body.balance === 10000,
      "Account A Balance is now exactly ₹10,000.00",
    );

    // 3.4 Check that system funding did not create negative balance on system user account
    const sysUserDoc = await userModel.findOne({ email: sysUserEmail });
    const sysAccounts = await accountModel.find({ user: sysUserDoc._id });
    let sysHasNegative = false;
    for (const sa of sysAccounts) {
      const b = await sa.getBalance();
      if (b < 0) sysHasNegative = true;
    }
    assert(
      !sysHasNegative,
      "System Funding did not generate any negative accounts (Authorized Issuance Model)",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 4: TRANSFER VALIDATION & SECURITY
    // -----------------------------------------------------------------
    console.log("\n--- 4. Transfer Validation & Security ---");

    // 4.1 Zero Amount Rejection
    const zeroRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 0,
        idempotencyKey: `zero_${timestamp}`,
      });
    assert(zeroRes.status === 400, "Zero Amount Transfer Rejected (400)");

    // 4.2 Negative Amount Rejection
    const negRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: -500,
        idempotencyKey: `neg_${timestamp}`,
      });
    assert(negRes.status === 400, "Negative Amount Transfer Rejected (400)");

    // 4.3 Invalid NaN / String Amount Rejection
    const nanRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: "invalid_amount",
        idempotencyKey: `nan_${timestamp}`,
      });
    assert(nanRes.status === 400, "Invalid NaN Amount Transfer Rejected (400)");

    // 4.4 Self-Transfer Rejection
    const selfRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountAId,
        amount: 100,
        idempotencyKey: `self_${timestamp}`,
      });
    assert(selfRes.status === 400, "Self-Transfer Rejected (400)");

    // 4.5 Foreign Sender Account Attack: User 1 tries to transfer FROM Account B (which belongs to User 2)
    const attackRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountBId,
        toAccount: accountAId,
        amount: 100,
        idempotencyKey: `attack_${timestamp}`,
      });
    assert(
      attackRes.status === 400,
      "Foreign Sender Account Transfer Attack Blocked (400)",
    );

    // 4.6 Frozen Account Rejection
    const accRes3 = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    const accountCId = accRes3.body.account._id;
    await accountModel.updateOne(
      { _id: accountCId },
      { $set: { status: "FROZEN" } },
    );

    const frozenRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountCId,
        toAccount: accountBId,
        amount: 100,
        idempotencyKey: `frozen_${timestamp}`,
      });
    assert(frozenRes.status === 400, "Frozen Account Transfer Rejected (400)");

    // 4.7 Insufficient Balance Rejection: User 1 tries to transfer ₹50,000 when balance is ₹10,000
    const overspendRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 50000,
        idempotencyKey: `over_${timestamp}`,
      });
    assert(
      overspendRes.status === 400,
      "Insufficient Balance Transfer Rejected (400)",
    );

    // 4.8 Valid Transfer: User 1 transfers ₹3,000 to User 2 (Account A -> Account B)
    const validTxKey = `valid_tx_${timestamp}`;
    const validTxRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 3000,
        idempotencyKey: validTxKey,
      });
    assert(
      validTxRes.status === 201 &&
        validTxRes.body.transaction?.status === "COMPLETED",
      "Valid Transfer ₹3,000 from Account A to Account B",
    );

    // Verify Balances: Account A should be 7000, Account B should be 3000
    const balA = (
      await request(app)
        .get(`/api/accounts/balance/${accountAId}`)
        .set("Authorization", `Bearer ${user1Token}`)
    ).body.balance;
    const balB = (
      await request(app)
        .get(`/api/accounts/balance/${accountBId}`)
        .set("Authorization", `Bearer ${user2Token}`)
    ).body.balance;
    assert(
      balA === 7000 && balB === 3000,
      `Post-Transfer Balances Correct (Account A: ₹${balA}, Account B: ₹${balB})`,
    );

    // -----------------------------------------------------------------
    // TEST SECTION 5: IDEMPOTENCY & RETRY DEDUPLICATION & OWNERSHIP
    // -----------------------------------------------------------------
    console.log("\n--- 5. Idempotency & Deduplication ---");

    // 5.1 Retry identical request with same idempotency key
    const retryRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 3000,
        idempotencyKey: validTxKey,
      });
    assert(
      retryRes.status === 200 &&
        retryRes.body.transaction?.status === "COMPLETED",
      "Duplicate Idempotency Request Returns Existing Transaction (200)",
    );

    // Verify Balances were NOT deducted again
    const balAAfterRetry = (
      await request(app)
        .get(`/api/accounts/balance/${accountAId}`)
        .set("Authorization", `Bearer ${user1Token}`)
    ).body.balance;
    assert(
      balAAfterRetry === 7000,
      `Balances Unchanged After Duplicate Request (Account A remains ₹${balAAfterRetry})`,
    );

    // 5.2 Idempotency Key Hijack / Collision by a different user
    const foreignIdempRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user2Token}`)
      .send({
        fromAccount: accountBId,
        toAccount: accountAId,
        amount: 100,
        idempotencyKey: validTxKey,
      });
    assert(
      foreignIdempRes.status === 409,
      "Foreign User Replaying Someone Else's Idempotency Key is Rejected (409 Conflict)",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 6: CONCURRENCY & DOUBLE-SPEND DEFENSE
    // -----------------------------------------------------------------
    console.log("\n--- 6. Concurrency & Double-Spend Defense ---");
    // Starting balance Account A = ₹7,000
    // Request 1 tries to transfer ₹5,000
    // Request 2 tries to transfer ₹5,000
    // Both sent simultaneously with Promise.all
    // Result: Total spent must NOT exceed ₹7,000!

    const [concurrentRes1, concurrentRes2] = await Promise.all([
      request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          fromAccount: accountAId,
          toAccount: accountBId,
          amount: 5000,
          idempotencyKey: `concurrent_1_${timestamp}`,
        }),
      request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({
          fromAccount: accountAId,
          toAccount: accountBId,
          amount: 5000,
          idempotencyKey: `concurrent_2_${timestamp}`,
        }),
    ]);

    const status1 = concurrentRes1.status;
    const status2 = concurrentRes2.status;
    const oneSuccessOneFail =
      (status1 === 201 &&
        (status2 === 400 || status2 === 409 || status2 === 500)) ||
      (status2 === 201 &&
        (status1 === 400 || status1 === 409 || status1 === 500));
    assert(
      oneSuccessOneFail,
      `Concurrent Double-Spend Handled (Status 1: ${status1}, Status 2: ${status2})`,
    );

    const finalBalA = (
      await request(app)
        .get(`/api/accounts/balance/${accountAId}`)
        .set("Authorization", `Bearer ${user1Token}`)
    ).body.balance;
    assert(
      finalBalA >= 0 && finalBalA === 2000,
      `Account A Final Balance Safe and Consistent (₹${finalBalA} >= ₹0)`,
    );

    // -----------------------------------------------------------------
    // TEST SECTION 7: LEDGER IMMUTABILITY
    // -----------------------------------------------------------------
    console.log("\n--- 7. Ledger Immutability ---");
    let immutabilityTriggered = false;
    try {
      await ledgerModel.updateOne(
        { account: accountAId },
        { $set: { amount: 999999 } },
      );
    } catch (e) {
      immutabilityTriggered = true;
    }
    assert(
      immutabilityTriggered,
      "Direct Ledger Update Prevented by Immutability Hook",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 8: TRANSACTION ROLLBACK VERIFICATION
    // -----------------------------------------------------------------
    console.log("\n--- 8. Transaction Rollback Verification ---");
    const balBeforeRollbackA = (
      await request(app)
        .get(`/api/accounts/balance/${accountAId}`)
        .set("Authorization", `Bearer ${user1Token}`)
    ).body.balance;
    const balBeforeRollbackB = (
      await request(app)
        .get(`/api/accounts/balance/${accountBId}`)
        .set("Authorization", `Bearer ${user2Token}`)
    ).body.balance;

    // Simulate an aborted transaction midway
    const abortSession = await mongoose.startSession();
    const rollbackKey = `rollback_test_${timestamp}`;
    let rollbackTxId = null;

    try {
      abortSession.startTransaction();
      const createdTx = (
        await transactionModel.create(
          [
            {
              fromAccount: accountAId,
              toAccount: accountBId,
              amount: 1000,
              idempotencyKey: rollbackKey,
              status: "PENDING",
            },
          ],
          { session: abortSession },
        )
      )[0];
      rollbackTxId = createdTx._id;

      await ledgerModel.create(
        [
          {
            account: accountAId,
            amount: 1000,
            transaction: createdTx._id,
            type: "DEBIT",
          },
        ],
        { session: abortSession },
      );

      // Intentionally abort the transaction
      await abortSession.abortTransaction();
    } catch (e) {
      if (abortSession.inTransaction()) await abortSession.abortTransaction();
    } finally {
      await abortSession.endSession();
    }

    const uncommittedTx = await transactionModel.findOne({
      idempotencyKey: rollbackKey,
    });
    const uncommittedLedger = await ledgerModel.findOne({
      transaction: rollbackTxId,
    });
    const balAfterRollbackA = (
      await request(app)
        .get(`/api/accounts/balance/${accountAId}`)
        .set("Authorization", `Bearer ${user1Token}`)
    ).body.balance;
    const balAfterRollbackB = (
      await request(app)
        .get(`/api/accounts/balance/${accountBId}`)
        .set("Authorization", `Bearer ${user2Token}`)
    ).body.balance;

    assert(
      !uncommittedTx && !uncommittedLedger,
      "Aborted Transaction & Ledger Records Cleanly Rolled Back",
    );
    assert(
      balAfterRollbackA === balBeforeRollbackA &&
        balAfterRollbackB === balBeforeRollbackB,
      "Account Balances Unchanged After Rollback",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 9: LOGOUT & TOKEN BLACKLIST VERIFICATION
    // -----------------------------------------------------------------
    console.log("\n--- 9. Logout & Token Blacklist Verification ---");
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${user2Token}`);
    assert(logoutRes.status === 200, "User 2 Logout Successful");

    const blacklistedAccessRes = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${user2Token}`);
    assert(
      blacklistedAccessRes.status === 401,
      "Blacklisted Token Access Rejected (401 Unauthorized)",
    );

    // Re-login User 2 for remaining integration tests
    const user2ReLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user2Email, password: "password123" });
    const user2FreshToken = user2ReLogin.body.token;

    // -----------------------------------------------------------------
    // TEST SECTION 10: FINANCIAL PRECISION & MONEY EDGE CASES
    // -----------------------------------------------------------------
    console.log("\n--- 10. Financial Precision & Money Edge Cases ---");

    // 10.1 Fractional sub-paise input (10.005) rejected
    const subPaiseRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 10.005,
        idempotencyKey: `subpaise_${timestamp}`,
      });
    assert(
      subPaiseRes.status === 400,
      "Sub-paise fractional floating amount rejected (400)",
    );

    // 10.2 Excessive string decimal precision ("50.1234") rejected
    const excessivePrecRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: "50.1234",
        idempotencyKey: `excessive_${timestamp}`,
      });
    assert(
      excessivePrecRes.status === 400,
      "Excessive string decimal precision rejected (400)",
    );

    // 10.3 Single transaction exceeding ₹10,00,000 maximum limit rejected
    const overLimitRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 1500000,
        idempotencyKey: `overlimit_${timestamp}`,
      });
    assert(
      overLimitRes.status === 400,
      "Transfer exceeding maximum allowable transaction limit rejected (400)",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 11: PERSISTENT HISTORY, STATEMENTS, RECEIPTS & CSV
    // -----------------------------------------------------------------
    console.log(
      "\n--- 11. Persistent History, Receipts, Statements & Exports ---",
    );

    // 11.1 Recipient Lookup
    const lookupRes = await request(app)
      .get(`/api/accounts/lookup?identifier=${accountBId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      lookupRes.status === 200 &&
        lookupRes.body.recipient?.recipientName &&
        !lookupRes.body.recipient.isSelf,
      "Recipient Lookup Returns Masked Details",
    );

    // 11.2 Self Recipient Lookup indicates isSelf: true
    const selfLookupRes = await request(app)
      .get(`/api/accounts/lookup?identifier=${accountAId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      selfLookupRes.status === 200 &&
        selfLookupRes.body.recipient?.isSelf === true,
      "Self Recipient Lookup Detected (isSelf: true)",
    );

    // 11.3 Persistent Transaction History List
    const txHistoryRes = await request(app)
      .get("/api/transactions?limit=10")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      txHistoryRes.status === 200 &&
        txHistoryRes.body.transactions.length >= 1 &&
        txHistoryRes.body.pagination?.total >= 1,
      "Persistent Transaction History Retrieved with Pagination",
    );

    // 11.4 Single Transaction Detail
    const sampleTxId = txHistoryRes.body.transactions[0]._id;
    const txDetailRes = await request(app)
      .get(`/api/transactions/${sampleTxId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      txDetailRes.status === 200 &&
        txDetailRes.body.transaction &&
        txDetailRes.body.ledgerEntries?.length >= 2,
      "Transaction Detail Retrieved with Ledger Postings",
    );

    // 11.5 Transaction Receipt Endpoint
    const receiptRes = await request(app)
      .get(`/api/transactions/${sampleTxId}/receipt`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      receiptRes.status === 200 && receiptRes.body.receipt?.receiptNumber,
      "Transaction Receipt Generated",
    );

    // 11.6 Account Statement Endpoint
    const stmtRes = await request(app)
      .get(`/api/accounts/${accountAId}/statement`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      stmtRes.status === 200 &&
        stmtRes.body.statement?.entries?.length >= 1 &&
        typeof stmtRes.body.statement.closingBalance === "number",
      "Account Statement Generated with Opening/Closing Balances",
    );

    // 11.7 CSV Transaction Export
    const csvRes = await request(app)
      .get("/api/transactions/export/csv")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      csvRes.status === 200 &&
        csvRes.headers["content-type"].includes("text/csv") &&
        csvRes.text.includes("Reference,Date"),
      "CSV Transaction Export with Headers Generated",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 12: ACCOUNT LIFECYCLE (FREEZE, UNFREEZE, SAFE CLOSURE)
    // -----------------------------------------------------------------
    console.log("\n--- 12. Account Lifecycle & Safe Closure ---");

    // 12.1 Freeze Account
    const freezeRes = await request(app)
      .patch(`/api/accounts/${accountAId}/freeze`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      freezeRes.status === 200 && freezeRes.body.account?.status === "FROZEN",
      "Account Frozen Successfully",
    );

    // 12.2 Transfer From Frozen Account Blocked
    const transferFromFrozen = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 100,
        idempotencyKey: `blocked_frozen_${timestamp}`,
      });
    assert(
      transferFromFrozen.status === 400,
      "Transfer From Frozen Account Rejected (400)",
    );

    // 12.3 Unfreeze Account
    const unfreezeRes = await request(app)
      .patch(`/api/accounts/${accountAId}/unfreeze`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      unfreezeRes.status === 200 &&
        unfreezeRes.body.account?.status === "ACTIVE",
      "Account Reactivated Successfully",
    );

    // 12.4 Close Account With Outstanding Balance Rejected
    const closeWithBalRes = await request(app)
      .patch(`/api/accounts/${accountAId}/close`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      closeWithBalRes.status === 400 &&
        closeWithBalRes.body.message.includes("non-zero balance"),
      "Closing Account With Non-Zero Balance Rejected (400)",
    );

    // 12.5 Create Empty Account & Close It Succeeded
    const emptyAccRes = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    const emptyAccId = emptyAccRes.body.account._id;
    const closeEmptyRes = await request(app)
      .patch(`/api/accounts/${emptyAccId}/close`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      closeEmptyRes.status === 200 &&
        closeEmptyRes.body.account?.status === "CLOSED",
      "Zero-Balance Account Closed Successfully",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 13: RECONCILIATION & COMPENSATING REVERSALS
    // -----------------------------------------------------------------
    console.log("\n--- 13. Reconciliation & Compensating Reversals ---");

    // 13.1 Normal User Access to Reconciliation Blocked (403)
    const unauthReconRes = await request(app)
      .get("/api/transactions/reconciliation/report")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      unauthReconRes.status === 403,
      "Non-System User Reconciliation Report Access Blocked (403)",
    );

    // 13.2 System User Reconciliation Report Executes & Confirms Balanced Ledger
    const reconRes = await request(app)
      .get("/api/transactions/reconciliation/report")
      .set("Authorization", `Bearer ${sysToken}`);
    assert(
      reconRes.status === 200 &&
        reconRes.body.report?.status === "BALANCED" &&
        reconRes.body.report.discrepancies?.length === 0,
      "System User Ledger Reconciliation Confirms Balanced State",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 14: SYSTEM HEALTH CHECK & RUNTIME MONITORING
    // -----------------------------------------------------------------
    console.log("\n--- 14. System Health Check & Runtime Monitoring ---");

    const healthRes = await request(app).get("/api/health");
    assert(
      healthRes.status === 200 &&
        healthRes.body.status === "UP" &&
        healthRes.body.database?.status === "connected",
      "GET /api/health Reports Healthy Service & Database Status",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 15: SECURITY CENTER & PASSWORD LIFECYCLE
    // -----------------------------------------------------------------
    console.log("\n--- 15. Security Center & Password Lifecycle ---");

    // 15.1 Change password with invalid current password rejected (401)
    const badPwChange = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        currentPassword: "wrongCurrentPassword",
        newPassword: "newStrongPassword123",
      });
    assert(
      badPwChange.status === 401,
      "Password Change with Invalid Current Password Rejected (401)",
    );

    // 15.2 Change password with short new password rejected (400)
    const shortPwChange = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ currentPassword: "password123", newPassword: "short" });
    assert(
      shortPwChange.status === 400,
      "Password Change with Weak / Short Password Rejected (400)",
    );

    // 15.3 Valid password change succeeds
    const goodPwChange = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        currentPassword: "password123",
        newPassword: "newStrongPassword123",
      });
    assert(
      goodPwChange.status === 200,
      "Valid Password Change Succeeded (200)",
    );

    // 15.4 Update notification preferences
    const prefRes = await request(app)
      .patch("/api/auth/preferences")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        emailNotifications: true,
        transferAlerts: true,
        securityAlerts: true,
      });
    assert(
      prefRes.status === 200 &&
        prefRes.body.preferences?.transferAlerts === true,
      "Notification Preferences Updated Successfully",
    );

    // 15.5 Security status & audit events
    const secStatusRes = await request(app)
      .get("/api/auth/security-status")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      secStatusRes.status === 200 &&
        secStatusRes.body.security?.twoFactorStatus,
      "Security Status & Session Health Retrieved",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 16: FINANCIAL INSIGHTS & ANALYTICS
    // -----------------------------------------------------------------
    console.log("\n--- 16. Financial Insights & Analytics ---");

    const insightsRes = await request(app)
      .get("/api/analytics/insights")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      insightsRes.status === 200 &&
        insightsRes.body.hasData === true &&
        typeof insightsRes.body.summary?.totalIn === "number" &&
        Array.isArray(insightsRes.body.monthlyTrends),
      "Financial Insights & Monthly Trends Generated",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 17: ADMINISTRATION & AUDIT TRAIL
    // -----------------------------------------------------------------
    console.log("\n--- 17. Administration & System Audit Trail ---");

    // 17.1 Normal user accessing admin overview receives 403
    const unauthAdminRes = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      unauthAdminRes.status === 403,
      "Non-System User Admin Overview Blocked (403)",
    );

    // 17.2 System User accesses admin overview with liquidity & status counts
    const adminOverviewRes = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${sysToken}`);
    assert(
      adminOverviewRes.status === 200 &&
        adminOverviewRes.body.systemOverview?.totalAccounts >= 2 &&
        typeof adminOverviewRes.body.systemOverview?.totalSystemLiquidity ===
          "number",
      "System User Admin Overview Successfully Audits System Liquidity",
    );

    // 17.3 System User accesses audit logs
    const auditLogsRes = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${sysToken}`);
    assert(
      auditLogsRes.status === 200 &&
        Array.isArray(auditLogsRes.body.auditLogs) &&
        auditLogsRes.body.pagination?.total >= 1,
      "Administrative Audit Trail Retrieved with Pagination",
    );

    // -----------------------------------------------------------------
    // TEST SECTION 18: RECIPIENT SEARCH, RECENT & SAVED BENEFICIARIES
    // -----------------------------------------------------------------
    console.log(
      "\n--- 18. Recipient Directory, Search, Recent & Saved Beneficiaries ---",
    );

    // 18.1 Recipient Search requires at least 2 characters
    const shortSearchRes = await request(app)
      .get("/api/recipients/search?query=a")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      shortSearchRes.status === 400,
      "Recipient Search Rejects Under-2-Character Query (400)",
    );

    // 18.2 Recipient Search by Name (User 1 searches for Bob)
    const searchBobRes = await request(app)
      .get("/api/recipients/search?query=Bob")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      searchBobRes.status === 200 &&
        Array.isArray(searchBobRes.body.recipients) &&
        searchBobRes.body.recipients.length >= 1,
      "Recipient Search by Name Returns Matching Accounts",
    );
    assert(
      searchBobRes.body.recipients.every(
        (r) => !r.accountNumber && r.maskedAccountNumber,
      ),
      "Recipient Search Does Not Expose Full Account Numbers",
    );

    // 18.2b Recipient Search by Email (User 1 searches for User 2's email)
    const searchEmailRes = await request(app)
      .get(
        `/api/recipients/search?query=${encodeURIComponent(user2Email.substring(0, 6))}`,
      )
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      searchEmailRes.status === 200 &&
        searchEmailRes.body.recipients.length >= 1,
      "Recipient Search by Email Returns Matching Accounts",
    );

    // 18.2c Search results include maskedEmail
    const hasEmail = searchBobRes.body.recipients.some(
      (r) => typeof r.maskedEmail === "string" && r.maskedEmail.length > 0,
    );
    assert(hasEmail, "Recipient Search Results Include maskedEmail Field");

    // 18.3 Recipient Search excludes the sender's own account
    const user1Account = await accountModel.findOne({
      user: regRes1.body.user._id,
    });
    const searchAliceRes = await request(app)
      .get("/api/recipients/search?query=Alice")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      searchAliceRes.status === 200 &&
        !searchAliceRes.body.recipients.some(
          (r) => r.accountNumber === user1Account.accountNumber,
        ),
      "Recipient Search Excludes Sender's Own Accounts",
    );

    // 18.4 Recent Recipients (User 1 previously transferred to User 2)
    const recentRecRes = await request(app)
      .get("/api/recipients/recent")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      recentRecRes.status === 200 &&
        Array.isArray(recentRecRes.body.recentRecipients) &&
        recentRecRes.body.recentRecipients.length >= 1,
      "Recent Recipients Retrieved from Historical Ledger",
    );
    assert(
      recentRecRes.body.recentRecipients.every(
        (r) => !r.accountNumber && r.maskedAccountNumber,
      ),
      "Recent Recipients Do Not Expose Full Account Numbers",
    );

    // 18.5 Save Recipient (User 1 saves User 2 as beneficiary)
    const bobAccountNum = regRes2.body.user
      ? (await accountModel.findOne({ user: regRes2.body.user._id }))
          .accountNumber
      : null;
    const saveRecRes = await request(app)
      .post("/api/recipients/saved")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ identifier: bobAccountNum, nickname: "Design Partner" });
    assert(
      saveRecRes.status === 201 &&
        saveRecRes.body.recipient?.nickname === "Design Partner",
      "Save Beneficiary with Nickname (201)",
    );
    const savedBeneficiaryId = saveRecRes.body.recipient?._id;

    // 18.6 Prevent saving own account as beneficiary
    const saveSelfRes = await request(app)
      .post("/api/recipients/saved")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ identifier: user1Account.accountNumber, nickname: "My Self" });
    assert(
      saveSelfRes.status === 400,
      "Self-Beneficiary Prevention Enforced (400)",
    );

    // 18.7 Retrieve Saved Beneficiaries
    const getSavedRes = await request(app)
      .get("/api/recipients/saved")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      getSavedRes.status === 200 &&
        getSavedRes.body.savedRecipients.some(
          (r) => r.nickname === "Design Partner",
        ),
      "Retrieve Saved Beneficiaries (200)",
    );
    assert(
      getSavedRes.body.savedRecipients.every(
        (r) => !r.accountNumber && r.maskedAccountNumber,
      ),
      "Saved Recipients Do Not Expose Full Account Numbers",
    );

    // 18.8 Unauthorized deletion by another user blocked (sysToken is authenticated as a different user)
    const unauthDeleteRes = await request(app)
      .delete(`/api/recipients/saved/${savedBeneficiaryId}`)
      .set("Authorization", `Bearer ${sysToken}`);
    assert(
      unauthDeleteRes.status === 404,
      "Cross-User Beneficiary Deletion Blocked (404)",
    );

    // 18.9 Authorized deletion by owner
    const deleteRes = await request(app)
      .delete(`/api/recipients/saved/${savedBeneficiaryId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(
      deleteRes.status === 200,
      "Authorized Beneficiary Deletion Succeeded (200)",
    );

    // 18.10 Unauthenticated access blocked
    const unauthRecRes = await request(app).get("/api/recipients/recent");
    assert(
      unauthRecRes.status === 401,
      "Unauthenticated Recipient Access Blocked (401)",
    );

    console.log("\n=================================================");
    console.log(`🏁 TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log("=================================================");

    await mongoose.disconnect();
    if (replSet) await replSet.stop();

    if (testFailed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("Critical test execution error:", err);
    if (replSet) await replSet.stop();
    process.exit(1);
  }
}

runTestSuite();

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
    // 1. Initialize MongoDB with Replica Set for full Transaction Support
    console.log("Initializing in-memory MongoDB replica set with transaction support...");
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    
    // Set dummy JWT_SECRET if missing
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_1234567890";

    await mongoose.connect(uri);
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
      .send({ name: "Alice Explorer", email: user1Email, password: "password123" });
    assert(regRes1.status === 201 && regRes1.body.token && regRes1.body.user?.email === user1Email, "Register User 1");
    const user1Token = regRes1.body.token;

    // 1.2 Duplicate Registration Rejection
    const dupRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Alice Clone", email: user1Email, password: "password123" });
    assert(dupRes.status === 422, "Duplicate Registration Rejection (422)");

    // 1.3 Register User 2
    const regRes2 = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bob Builder", email: user2Email, password: "password123" });
    assert(regRes2.status === 201, "Register User 2");
    const user2Token = regRes2.body.token;

    // 1.4 Register System User & elevate systemUser in DB
    const regSysRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "System Admin", email: sysUserEmail, password: "adminPassword123" });
    await userModel.updateOne({ email: sysUserEmail }, { $set: { systemUser: true } });

    // Login System User to get token with systemUser = true
    const sysLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: sysUserEmail, password: "adminPassword123" });
    assert(sysLoginRes.status === 200 && sysLoginRes.body.user.systemUser === true, "System User Login & systemUser flag");
    const sysToken = sysLoginRes.body.token;

    // 1.5 Invalid Password Login
    const badLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user1Email, password: "wrongpassword" });
    assert(badLoginRes.status === 401, "Invalid Password Login Rejection (401)");

    // 1.6 /api/auth/me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(meRes.status === 200 && meRes.body.user.name === "Alice Explorer" && meRes.body.user.password === undefined, "GET /api/auth/me returns sanitized user without password");

    // -----------------------------------------------------------------
    // TEST SECTION 2: ACCOUNTS & OWNERSHIP
    // -----------------------------------------------------------------
    console.log("\n--- 2. Accounts & Ownership Protection ---");

    // 2.1 Create Account for User 1 (Account A)
    const accRes1 = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(accRes1.status === 201 && accRes1.body.account?.status === "ACTIVE", "Create Account for User 1 (Account A)");
    const accountAId = accRes1.body.account._id;

    // 2.2 Create Account for User 2 (Account B)
    const accRes2 = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user2Token}`);
    assert(accRes2.status === 201 && accRes2.body.account?.status === "ACTIVE", "Create Account for User 2 (Account B)");
    const accountBId = accRes2.body.account._id;

    // 2.3 User 1 Lists Accounts
    const listRes = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    assert(listRes.status === 200 && listRes.body.accounts.length >= 1, "List User 1 Accounts");

    // 2.4 User 1 Fetches Balance for Account A
    const balRes1 = await request(app)
      .get(`/api/accounts/balance/${accountAId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(balRes1.status === 200 && balRes1.body.balance === 0, "Account A Initial Balance is ₹0.00");

    // 2.5 Ownership Test: User 1 Attempts to fetch balance of Account B (belonging to User 2)
    const foreignBalRes = await request(app)
      .get(`/api/accounts/balance/${accountBId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(foreignBalRes.status === 404, "Foreign Account Balance Access Blocked (404)");

    // -----------------------------------------------------------------
    // TEST SECTION 3: SYSTEM FUNDING (AUTHORIZED ISSUANCE MODEL)
    // -----------------------------------------------------------------
    console.log("\n--- 3. System Initial Funding ---");

    // 3.1 Normal User 1 attempts System Funding (MUST receive 403 Forbidden)
    const unauthorizedFundRes = await request(app)
      .post("/api/transactions/system/initial-funds")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ toAccount: accountAId, amount: 10000, idempotencyKey: `sys_unauth_${timestamp}` });
    assert(unauthorizedFundRes.status === 403, "Normal User Calling System Funding receives 403 Forbidden");

    // 3.2 System User funds Account A with ₹10,000
    const fundRes = await request(app)
      .post("/api/transactions/system/initial-funds")
      .set("Authorization", `Bearer ${sysToken}`)
      .send({ toAccount: accountAId, amount: 10000, idempotencyKey: `sys_fund_${timestamp}` });
    assert(fundRes.status === 201 && fundRes.body.transaction?.status === "COMPLETED", "System User Initial Funding of ₹10,000 to Account A");

    // 3.3 Check Account A balance now
    const balAfterFund = await request(app)
      .get(`/api/accounts/balance/${accountAId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    assert(balAfterFund.body.balance === 10000, "Account A Balance is now exactly ₹10,000.00");

    // 3.4 Check that system funding did not create negative balance on system user account
    const sysUserDoc = await userModel.findOne({ email: sysUserEmail });
    const sysAccounts = await accountModel.find({ user: sysUserDoc._id });
    let sysHasNegative = false;
    for (const sa of sysAccounts) {
      const b = await sa.getBalance();
      if (b < 0) sysHasNegative = true;
    }
    assert(!sysHasNegative, "System Funding did not generate any negative accounts (Authorized Issuance Model)");

    // -----------------------------------------------------------------
    // TEST SECTION 4: TRANSFER VALIDATION & SECURITY
    // -----------------------------------------------------------------
    console.log("\n--- 4. Transfer Validation & Security ---");

    // 4.1 Zero Amount Rejection
    const zeroRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountBId, amount: 0, idempotencyKey: `zero_${timestamp}` });
    assert(zeroRes.status === 400, "Zero Amount Transfer Rejected (400)");

    // 4.2 Negative Amount Rejection
    const negRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountBId, amount: -500, idempotencyKey: `neg_${timestamp}` });
    assert(negRes.status === 400, "Negative Amount Transfer Rejected (400)");

    // 4.3 Invalid NaN / String Amount Rejection
    const nanRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountBId, amount: "invalid_amount", idempotencyKey: `nan_${timestamp}` });
    assert(nanRes.status === 400, "Invalid NaN Amount Transfer Rejected (400)");

    // 4.4 Self-Transfer Rejection
    const selfRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountAId, amount: 100, idempotencyKey: `self_${timestamp}` });
    assert(selfRes.status === 400, "Self-Transfer Rejected (400)");

    // 4.5 Foreign Sender Account Attack: User 1 tries to transfer FROM Account B (which belongs to User 2)
    const attackRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountBId, toAccount: accountAId, amount: 100, idempotencyKey: `attack_${timestamp}` });
    assert(attackRes.status === 400, "Foreign Sender Account Transfer Attack Blocked (400)");

    // 4.6 Frozen Account Rejection
    const accRes3 = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${user1Token}`);
    const accountCId = accRes3.body.account._id;
    await accountModel.updateOne({ _id: accountCId }, { $set: { status: "FROZEN" } });

    const frozenRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountCId, toAccount: accountBId, amount: 100, idempotencyKey: `frozen_${timestamp}` });
    assert(frozenRes.status === 400, "Frozen Account Transfer Rejected (400)");

    // 4.7 Insufficient Balance Rejection: User 1 tries to transfer ₹50,000 when balance is ₹10,000
    const overspendRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountBId, amount: 50000, idempotencyKey: `over_${timestamp}` });
    assert(overspendRes.status === 400, "Insufficient Balance Transfer Rejected (400)");

    // 4.8 Valid Transfer: User 1 transfers ₹3,000 to User 2 (Account A -> Account B)
    const validTxKey = `valid_tx_${timestamp}`;
    const validTxRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountBId, amount: 3000, idempotencyKey: validTxKey });
    assert(validTxRes.status === 201 && validTxRes.body.transaction?.status === "COMPLETED", "Valid Transfer ₹3,000 from Account A to Account B");

    // Verify Balances: Account A should be 7000, Account B should be 3000
    const balA = (await request(app).get(`/api/accounts/balance/${accountAId}`).set("Authorization", `Bearer ${user1Token}`)).body.balance;
    const balB = (await request(app).get(`/api/accounts/balance/${accountBId}`).set("Authorization", `Bearer ${user2Token}`)).body.balance;
    assert(balA === 7000 && balB === 3000, `Post-Transfer Balances Correct (Account A: ₹${balA}, Account B: ₹${balB})`);

    // -----------------------------------------------------------------
    // TEST SECTION 5: IDEMPOTENCY & RETRY DEDUPLICATION & OWNERSHIP
    // -----------------------------------------------------------------
    console.log("\n--- 5. Idempotency & Deduplication ---");

    // 5.1 Retry identical request with same idempotency key
    const retryRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ fromAccount: accountAId, toAccount: accountBId, amount: 3000, idempotencyKey: validTxKey });
    assert(retryRes.status === 200 && retryRes.body.transaction?.status === "COMPLETED", "Duplicate Idempotency Request Returns Existing Transaction (200)");

    // Verify Balances were NOT deducted again
    const balAAfterRetry = (await request(app).get(`/api/accounts/balance/${accountAId}`).set("Authorization", `Bearer ${user1Token}`)).body.balance;
    assert(balAAfterRetry === 7000, `Balances Unchanged After Duplicate Request (Account A remains ₹${balAAfterRetry})`);

    // 5.2 Idempotency Key Hijack / Collision by a different user
    const foreignIdempRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${user2Token}`)
      .send({ fromAccount: accountBId, toAccount: accountAId, amount: 100, idempotencyKey: validTxKey });
    assert(foreignIdempRes.status === 409, "Foreign User Replaying Someone Else's Idempotency Key is Rejected (409 Conflict)");

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
        .send({ fromAccount: accountAId, toAccount: accountBId, amount: 5000, idempotencyKey: `concurrent_1_${timestamp}` }),
      request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ fromAccount: accountAId, toAccount: accountBId, amount: 5000, idempotencyKey: `concurrent_2_${timestamp}` })
    ]);

    const status1 = concurrentRes1.status;
    const status2 = concurrentRes2.status;
    const oneSuccessOneFail = (status1 === 201 && (status2 === 400 || status2 === 409 || status2 === 500)) || 
                              (status2 === 201 && (status1 === 400 || status1 === 409 || status1 === 500));
    assert(oneSuccessOneFail, `Concurrent Double-Spend Handled (Status 1: ${status1}, Status 2: ${status2})`);

    const finalBalA = (await request(app).get(`/api/accounts/balance/${accountAId}`).set("Authorization", `Bearer ${user1Token}`)).body.balance;
    assert(finalBalA >= 0 && finalBalA === 2000, `Account A Final Balance Safe and Consistent (₹${finalBalA} >= ₹0)`);

    // -----------------------------------------------------------------
    // TEST SECTION 7: LEDGER IMMUTABILITY
    // -----------------------------------------------------------------
    console.log("\n--- 7. Ledger Immutability ---");
    let immutabilityTriggered = false;
    try {
      await ledgerModel.updateOne({ account: accountAId }, { $set: { amount: 999999 } });
    } catch (e) {
      immutabilityTriggered = true;
    }
    assert(immutabilityTriggered, "Direct Ledger Update Prevented by Immutability Hook");

    // -----------------------------------------------------------------
    // TEST SECTION 8: TRANSACTION ROLLBACK VERIFICATION
    // -----------------------------------------------------------------
    console.log("\n--- 8. Transaction Rollback Verification ---");
    const balBeforeRollbackA = (await request(app).get(`/api/accounts/balance/${accountAId}`).set("Authorization", `Bearer ${user1Token}`)).body.balance;
    const balBeforeRollbackB = (await request(app).get(`/api/accounts/balance/${accountBId}`).set("Authorization", `Bearer ${user2Token}`)).body.balance;

    // Simulate an aborted transaction midway
    const abortSession = await mongoose.startSession();
    const rollbackKey = `rollback_test_${timestamp}`;
    let rollbackTxId = null;

    try {
      abortSession.startTransaction();
      const createdTx = (await transactionModel.create([{
        fromAccount: accountAId,
        toAccount: accountBId,
        amount: 1000,
        idempotencyKey: rollbackKey,
        status: "PENDING"
      }], { session: abortSession }))[0];
      rollbackTxId = createdTx._id;

      await ledgerModel.create([{
        account: accountAId,
        amount: 1000,
        transaction: createdTx._id,
        type: "DEBIT"
      }], { session: abortSession });

      // Intentionally abort the transaction
      await abortSession.abortTransaction();
    } catch (e) {
      if (abortSession.inTransaction()) await abortSession.abortTransaction();
    } finally {
      await abortSession.endSession();
    }

    const uncommittedTx = await transactionModel.findOne({ idempotencyKey: rollbackKey });
    const uncommittedLedger = await ledgerModel.findOne({ transaction: rollbackTxId });
    const balAfterRollbackA = (await request(app).get(`/api/accounts/balance/${accountAId}`).set("Authorization", `Bearer ${user1Token}`)).body.balance;
    const balAfterRollbackB = (await request(app).get(`/api/accounts/balance/${accountBId}`).set("Authorization", `Bearer ${user2Token}`)).body.balance;

    assert(!uncommittedTx && !uncommittedLedger, "Aborted Transaction & Ledger Records Cleanly Rolled Back");
    assert(balAfterRollbackA === balBeforeRollbackA && balAfterRollbackB === balBeforeRollbackB, "Account Balances Unchanged After Rollback");

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
    assert(blacklistedAccessRes.status === 401, "Blacklisted Token Access Rejected (401 Unauthorized)");

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

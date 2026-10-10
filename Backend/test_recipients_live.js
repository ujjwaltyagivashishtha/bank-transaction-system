require("dotenv").config({ path: "./Backend/.env" });
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./src/app");
const userModel = require("./src/models/user.model");
const accountModel = require("./src/models/account.model");
const recipientModel = require("./src/models/recipient.model");
const transactionModel = require("./src/models/transaction.model");

async function runLiveRecipientTests() {
  console.log("=================================================");
  console.log("🧪 TESTING RECIPIENT DIRECTORY & BENEFICIARY SYSTEM");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas.\n");

    const ts = Date.now();
    const userA = { name: "Sender Alice", email: `alice_rec_${ts}@bank.local`, password: "Password123!" };
    const userB = { name: "Recipient Bob", email: `bob_rec_${ts}@bank.local`, password: "Password123!" };
    const userC = { name: "Charlie Stranger", email: `charlie_rec_${ts}@bank.local`, password: "Password123!" };

    // 1. Register Users
    const regA = await request(app).post("/api/auth/register").send(userA);
    const tokenA = regA.body.token;
    assert(regA.status === 201 && tokenA, "Register User Alice");

    const regB = await request(app).post("/api/auth/register").send(userB);
    const tokenB = regB.body.token;
    assert(regB.status === 201 && tokenB, "Register User Bob");

    const regC = await request(app).post("/api/auth/register").send(userC);
    const tokenC = regC.body.token;
    assert(regC.status === 201 && tokenC, "Register User Charlie");

    // 2. Create Accounts
    const accResA = await request(app).post("/api/accounts").set("Authorization", `Bearer ${tokenA}`).send({});
    const accA = accResA.body.account;
    assert(accResA.status === 201 && accA?.accountNumber, "Create Account for Alice");

    const accResB = await request(app).post("/api/accounts").set("Authorization", `Bearer ${tokenB}`).send({});
    const accB = accResB.body.account;
    assert(accResB.status === 201 && accB?.accountNumber, "Create Account for Bob");

    // 3. Fund Alice via System Admin
    const sysAdmin = await userModel.findOne({ systemUser: true });
    let adminToken = null;
    if (sysAdmin) {
      const jwt = require("jsonwebtoken");
      adminToken = jwt.sign({ userId: sysAdmin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
      await request(app)
        .post("/api/transactions/system/initial-funds")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          toAccount: accA.accountNumber,
          amount: 10000,
          idempotencyKey: `fund_alice_${ts}`
        });
    }

    // -----------------------------------------------------------------
    // TEST 1: RECIPIENT SEARCH
    // -----------------------------------------------------------------
    console.log("\n--- 1. Recipient Search Tests ---");

    // 1.1 Query too short (< 2 chars)
    const shortSearch = await request(app)
      .get("/api/recipients/search?query=a")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(shortSearch.status === 400, "Search query < 2 chars rejected with 400");

    // 1.2 Search Bob by name
    const searchByName = await request(app)
      .get("/api/recipients/search?query=Bob")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      searchByName.status === 200 &&
      Array.isArray(searchByName.body.recipients) &&
      searchByName.body.recipients.some(r => r.accountNumber === accB.accountNumber),
      "Search by recipient name returns Bob's account"
    );

    // 1.3 Search Bob by account number prefix
    const searchByNum = await request(app)
      .get(`/api/recipients/search?query=${accB.accountNumber.slice(0, 6)}`)
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      searchByNum.status === 200 &&
      searchByNum.body.recipients.some(r => r.accountNumber === accB.accountNumber),
      "Search by account number returns matching account"
    );

    // 1.4 Search excludes Alice's own account
    const searchSelf = await request(app)
      .get("/api/recipients/search?query=Alice")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      searchSelf.status === 200 &&
      !searchSelf.body.recipients.some(r => r.accountNumber === accA.accountNumber),
      "Search strictly excludes sender's own accounts"
    );

    // -----------------------------------------------------------------
    // TEST 2: RECENT RECIPIENTS & TRANSFERS
    // -----------------------------------------------------------------
    console.log("\n--- 2. Recent Recipients & Transfer Execution ---");

    // Before transfer: Alice has no recent recipients
    const recentBefore = await request(app)
      .get("/api/recipients/recent")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      recentBefore.status === 200 &&
      recentBefore.body.recentRecipients.length === 0,
      "Recent recipients empty before any transfer"
    );

    // Execute transfer from Alice to Bob (₹1,500)
    const transferRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        fromAccount: accA._id,
        toAccount: accB.accountNumber,
        amount: 1500,
        description: "Live Test Transfer to Bob",
        idempotencyKey: `tx_rec_${ts}`
      });
    assert(transferRes.status === 200 || transferRes.status === 201, "Transfer from Alice to Bob executed successfully");

    // After transfer: Bob appears in Alice's recent recipients
    const recentAfter = await request(app)
      .get("/api/recipients/recent")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      recentAfter.status === 200 &&
      recentAfter.body.recentRecipients.some(r => r.accountNumber === accB.accountNumber),
      "Bob appears in Alice's recent recipients list with last transferred details"
    );

    // Check recent recipients does not leak Charlie or other users
    assert(
      !recentAfter.body.recentRecipients.some(r => r.recipientName === "Charlie Stranger"),
      "Recent recipients does not leak other users"
    );

    // -----------------------------------------------------------------
    // TEST 3: SAVED BENEFICIARIES
    // -----------------------------------------------------------------
    console.log("\n--- 3. Saved Beneficiaries Tests ---");

    // 3.1 Save Bob as beneficiary with nickname
    const saveBob = await request(app)
      .post("/api/recipients/saved")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        identifier: accB.accountNumber,
        nickname: "Best Friend Bob"
      });
    assert(
      saveBob.status === 201 &&
      saveBob.body.recipient?.nickname === "Best Friend Bob" &&
      saveBob.body.recipient?.accountNumber === accB.accountNumber,
      "Save Bob as beneficiary with custom nickname"
    );
    const savedBobId = saveBob.body.recipient?._id;

    // 3.2 Prevent saving own account
    const saveSelf = await request(app)
      .post("/api/recipients/saved")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        identifier: accA.accountNumber,
        nickname: "Myself"
      });
    assert(saveSelf.status === 400, "Prevent saving sender's own account as beneficiary (400)");

    // 3.3 Prevent saving non-existent account
    const saveNonExistent = await request(app)
      .post("/api/recipients/saved")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        identifier: "109999999999",
        nickname: "Ghost"
      });
    assert(saveNonExistent.status === 404, "Prevent saving non-existent account (404)");

    // 3.4 Retrieve Alice's saved beneficiaries
    const getSaved = await request(app)
      .get("/api/recipients/saved")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      getSaved.status === 200 &&
      getSaved.body.savedRecipients.some(r => r.nickname === "Best Friend Bob"),
      "Retrieve saved beneficiaries list contains Bob"
    );

    // 3.5 Cross-user delete prevention: Charlie tries to delete Alice's saved beneficiary
    const unauthDelete = await request(app)
      .delete(`/api/recipients/saved/${savedBobId}`)
      .set("Authorization", `Bearer ${tokenC}`);
    assert(unauthDelete.status === 404, "Cross-user beneficiary deletion rejected (404)");

    // 3.6 Authorized deletion: Alice deletes Bob from saved
    const authDelete = await request(app)
      .delete(`/api/recipients/saved/${savedBobId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    assert(authDelete.status === 200, "Owner successfully deletes saved beneficiary (200)");

    // Verify Bob is no longer in saved
    const getSavedAfterDelete = await request(app)
      .get("/api/recipients/saved")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(
      getSavedAfterDelete.status === 200 &&
      !getSavedAfterDelete.body.savedRecipients.some(r => r.accountNumber === accB.accountNumber),
      "Bob verified removed from saved beneficiaries"
    );

    // -----------------------------------------------------------------
    // TEST 4: SECURITY & AUTHENTICATION
    // -----------------------------------------------------------------
    console.log("\n--- 4. Security & Authorization ---");

    const noToken = await request(app).get("/api/recipients/recent");
    assert(noToken.status === 401, "Unauthenticated access rejected with 401");

    const noTokenSearch = await request(app).get("/api/recipients/search?query=Bob");
    assert(noTokenSearch.status === 401, "Unauthenticated search rejected with 401");

    // Also test alias under /api/accounts/recipients
    const aliasSearch = await request(app)
      .get("/api/accounts/recipients/search?query=Bob")
      .set("Authorization", `Bearer ${tokenA}`);
    assert(aliasSearch.status === 200, "Alias /api/accounts/recipients/search works identically");

    console.log("\n=================================================");
    console.log(`🏁 LIVE RECIPIENT TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    await mongoose.disconnect();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error("Live test failed with error:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runLiveRecipientTests();

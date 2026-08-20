# 🏦 TRANSACT | Next-Gen Banking Transaction & Immutable Ledger System

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-emerald.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

**TRANSACT** is a fullstack banking system designed with an **immutable double-entry ledger**, **atomic MongoDB transaction sessions**, **strict account ownership enforcement**, **race-safe idempotency with user binding**, and a **custom SaaS desktop UI** inspired by high-end financial platforms.

---

## 🌟 Key Architecture & Highlights

### 1. Immutable Double-Entry Ledger
* **Derivation over Mutation**: Account balances are never stored as a mutable integer column. Instead, balances are derived dynamically using MongoDB aggregation pipelines over immutable ledger records:
  $$\text{Balance} = \sum \text{Credits} - \sum \text{Debits}$$
* **Immutability Hooks**: Mongoose pre-hooks strictly forbid `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `findOneAndUpdate`, and `findOneAndDelete` operations on the ledger collection.

### 2. Multi-Layer Financial Security
* **Account Ownership Verification**: The backend strictly validates that the sender account (`fromAccount`) belongs directly to the authenticated user (`req.user._id`), preventing IDOR / foreign-account transfer attacks.
* **Strict Monetary Validation**: Transfers require finite positive amounts ($> 0$), rejecting $0$, negatives, `NaN`, `Infinity`, and malformed types at both middleware and Mongoose schema levels.
* **Self-Transfer Prevention**: Transfers between identical source and destination accounts are blocked before entering the database session.
* **Account Status Enforcement**: Money movement requires both source and destination accounts to be in `ACTIVE` status (`FROZEN` and `CLOSED` accounts cannot transact).

### 3. Concurrency & Race-Safe Idempotency
* **Snapshot Isolation & Document Locks**: Database operations occur inside isolated MongoDB sessions (`session.startTransaction()`). Document-level write locking on the sender account serializes concurrent requests and eliminates double-spending.
* **Explicit 409 Conflict Semantics**: When a concurrent transfer detects an account state or balance change, it returns a clear `409 Conflict` status, and the frontend prompts the user to review their balance without resubmitting duplicate requests.
* **Idempotency with User Binding**: Unique database index on `idempotencyKey`. Duplicate requests from the original sender return the existing transaction record without duplicate debits/credits. Replay attempts by unauthorized foreign users are rejected with `409 Conflict`.
* **Guaranteed Cleanup**: Every session is enclosed in a `try...catch...finally` block that reliably aborts on failure and always calls `session.endSession()`.

### 4. Controlled System Funding (Authorized Issuance Model)
* **Authorized Issuance**: System initial funding (`/api/transactions/system/initial-funds`) represents authorized central issuance. It directly creates an atomic `CREDIT` ledger entry for the recipient account without driving any personal user accounts into artificial negative balances.
* **RBAC Enforcement**: Guaranteed `403 Forbidden` for standard users; accessible solely by authenticated system administrators (`systemUser: true`).

### 5. Non-Fatal Notifications
* Email notifications for registration and transfer completions are dispatched in non-fatal asynchronous blocks after database commits, ensuring network or SMTP issues never roll back valid financial transactions.

---

## 🖥️ UI & Design System

The frontend is built with **React (JSX)**, **Vite**, **React Router DOM**, **Axios**, and **Lucide React** utilizing a **bespoke pure CSS design system** (no Tailwind CSS):
* **Three-Part Desktop Layout**: Dark vertical icon navigation rail, light Mac-style sidebar with window dots, and spacious dashboard canvas.
* **Hero Metric Card**: High-contrast, large-format balance card modeled after modern SaaS execution dashboards.
* **Processing Experience**: Contextual modal reflecting real-time transaction lifecycle states (`PROCESSING`, `COMPLETED`, `PENDING`, `FAILED`, `REVERSED`).
* **Transfer Activity Table**: Real-time session audit log for transfers executed during the active browser session, structured to seamlessly connect with future persistent backend history APIs.

---

## 📁 Directory Structure

```text
Bank Transaction System/
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection logic
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Register, login, me, logout
│   │   │   ├── account.controller.js # Create account, list, balance
│   │   │   └── transaction.controller.js # Atomic transfers & system funding
│   │   ├── middleware/
│   │   │   └── auth.middleware.js   # JWT verification & system-user guards
│   │   ├── models/
│   │   │   ├── user.model.js        # User model with bcrypt password hashing
│   │   │   ├── account.model.js     # Account model with getBalance() aggregation
│   │   │   ├── transaction.model.js # Transaction record with unique idempotency
│   │   │   ├── ledger.model.js      # Immutable double-entry ledger entries
│   │   │   └── blackList.model.js   # JWT token blacklist with TTL
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # /api/auth
│   │   │   ├── account.routes.js    # /api/accounts
│   │   │   └── transaction.routes.js # /api/transactions
│   │   ├── services/
│   │   │   └── email.service.js     # Nodemailer email notification service
│   │   └── app.js                   # Express application & centralized error handler
│   ├── server.js                    # Server startup & listener
│   ├── package.json
│   └── test_suite.js                # Automated end-to-end test suite (34 test cases)
│
├── Frontend/
│   ├── src/
│   │   ├── api/                     # Axios API service clients
│   │   ├── components/              # Layout, common, dashboard, transactions
│   │   ├── context/                 # AuthContext, AccountContext, ActivityContext, ToastContext
│   │   ├── pages/                   # Login, Register, Dashboard, Accounts, Transfer, Activity, Settings
│   │   ├── utils/                   # INR formatting, ID truncation, Idempotency generator
│   │   ├── App.jsx                  # Protected routes & router configuration
│   │   ├── main.jsx                 # React root mount
│   │   └── index.css                # Pure CSS design system & typography tokens
│   ├── vite.config.js               # Dev server with /api proxy configuration
│   ├── package.json
│   ├── package-lock.json
│   └── index.html
│
├── .env.example
└── README.md
```

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Sign in & receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & roles | Yes |
| `POST` | `/api/auth/logout` | Invalidate token & clear session | Yes |

### Accounts (`/api/accounts`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/accounts/` | Create a new digital savings account | Yes |
| `GET` | `/api/accounts/` | List all accounts belonging to the user | Yes |
| `GET` | `/api/accounts/balance/:accountId` | Get derived ledger balance for account | Yes (Owner only) |

### Transactions (`/api/transactions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transactions/` | Atomic transfer between active accounts | Yes (Sender owner) |
| `POST` | `/api/transactions/system/initial-funds` | System initial funds allocation | Yes (System user only) |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **MongoDB**: MongoDB Atlas cluster or local MongoDB instance (`mongodb://localhost:27017`)

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root and in `Backend/`:
```bash
cp .env.example Backend/.env
```
Ensure `MONGO_URI` and `JWT_SECRET` are configured.

### 3. Backend Setup & Startup
```bash
cd Backend
npm install
npm run dev
```
Backend runs on `http://localhost:3000`.

### 4. Frontend Setup & Startup
```bash
cd Frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173/` and proxies `/api` requests to `http://localhost:3000`.

---

## 🧪 Running Automated Tests

Run the automated test suite verifying authentication, ownership isolation, transfer validation, concurrency defense, idempotency deduplication, and ledger immutability:
```bash
cd Backend
npm test
```

To verify the production build of the frontend:
```bash
cd Frontend
npm run build
```

const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const mongoose = require("mongoose");

const app = express();

// 1. Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Allows flexible API usage
    crossOriginEmbedderPolicy: false
}));

// 2. CORS Allowlist
const isTest = process.env.NODE_ENV === "test";
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching allowlist
        if (!origin || allowedOrigins.includes(origin) || isTest) {
            callback(null, true);
        } else {
            callback(new Error(`CORS origin ${origin} not permitted`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
}));

// 3. Request Size Limits & Parsing
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

// 4. Correlation ID Middleware
app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
});

// 5. Rate Limiting (Skipped in test environment)
const isTestingEnv = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestingEnv ? 10000 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication requests, please try again later" }
});

const transferLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestingEnv ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many transfer requests, please try again later" }
});

// Apply rate limits
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/transactions", transferLimiter);

/**
 * Health Check Endpoint
 * GET /api/health
 */
app.get("/api/health", (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };

    const isHealthy = dbState === 1;

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "UP" : "DEGRADED",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatusMap[dbState] || "unknown"
        },
        version: "1.0.0"
    });
});

/**
 * Service root
 */
app.get("/", (req, res) => {
    res.json({
        service: "TRANSACT Banking Ledger API",
        status: "ONLINE",
        documentation: "/api/health"
    });
});

/**
 * Routes
 */
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const adminRoutes = require("./routes/admin.routes");
const recipientRoutes = require("./routes/recipient.routes");

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recipients", recipientRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json({
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

/**
 * Production-Appropriate Centralized Error Handling Middleware
 * Never exposes stack traces or database internals to clients.
 */
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === "production";
    
    // Log structured error for server diagnosis
    console.error(`[${req.requestId || "NO_REQ_ID"}] Error processing ${req.method} ${req.originalUrl}:`, err.message);

    if (err.name === "CastError") {
        return res.status(400).json({
            message: `Invalid identifier format for ${err.path}`
        });
    }

    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            message: messages.join(", ")
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            message: "Duplicate key conflict"
        });
    }

    const statusCode = err.status || err.statusCode || 500;
    const clientMessage = isProduction && statusCode === 500
        ? "An internal server error occurred. Please try again later."
        : (err.message || "Internal server error");

    res.status(statusCode).json({
        message: clientMessage,
        requestId: req.requestId
    });
});

module.exports = app;
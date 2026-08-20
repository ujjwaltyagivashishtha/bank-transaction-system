const express = require("express")
const cookieParser = require("cookie-parser")



const app = express()


app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */

app.get("/", (req, res) => {
    res.send("Ledger Service is up and running")
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);

    if (err.name === "CastError") {
        return res.status(400).json({
            message: `Invalid ID format for ${err.path}`
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

    res.status(err.status || 500).json({
        message: err.message || "Internal server error"
    });
});

module.exports = app
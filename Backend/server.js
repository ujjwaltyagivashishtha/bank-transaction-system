require("dotenv").config();

const { validateEnv } = require("./src/config/env.validator");
const app = require("./src/app");
const connectToDB = require("./src/config/db");

async function startServer() {
    validateEnv();
    await connectToDB();

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`🚀 TRANSACT Banking Ledger Server is running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    const shutdown = (signal) => {
        console.log(`\nReceived ${signal}, gracefully shutting down TRANSACT server...`);
        server.close(() => {
            console.log("HTTP server closed.");
            process.exit(0);
        });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer();
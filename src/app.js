const express = require('express');
const cookieParser = require('cookie-parser');


/**
 * Routes for the application
 */

const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');

const app = express();
app.use(cookieParser());

app.use(express.json());



/**
 * Base route for authentication and account management
 */
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);




module.exports = app;
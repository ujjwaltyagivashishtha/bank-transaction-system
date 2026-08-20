const mongoose = require("mongoose");
const accountModel = require("../models/account.model");

async function createAccountController(req, res) {
    try {
        const user = req.user;

        const account = await accountModel.create({
            user: user._id,
            status: "ACTIVE",
            currency: "INR"
        });

        res.status(201).json({
            account
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to create account"
        });
    }
}

async function getUserAccountsController(req, res) {
    try {
        const accounts = await accountModel.find({ user: req.user._id }).sort({ createdAt: -1 });

        res.status(200).json({
            accounts
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to retrieve accounts"
        });
    }
}

async function getAccountBalanceController(req, res) {
    try {
        const { accountId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(accountId)) {
            return res.status(400).json({
                message: "Invalid account ID format"
            });
        }

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({
                message: "Account not found or does not belong to you"
            });
        }

        const balance = await account.getBalance();

        res.status(200).json({
            accountId: account._id,
            balance: balance
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to fetch account balance"
        });
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}
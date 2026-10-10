const mongoose = require("mongoose");
const crypto = require("crypto");
const ledgerModel = require("./ledger.model");

function generateSecureAccountNumber() {
    // Generate 12-digit standard bank account number starting with 10
    const randomDigits = crypto.randomInt(1000000000, 9999999999).toString();
    return `10${randomDigits}`;
}

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Account must be associated with a user" ],
        index: true
    },
    accountNumber: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    status: {
        type: String,
        enum: {
            values: [ "ACTIVE", "FROZEN", "CLOSED" ],
            message: "Status can be either ACTIVE, FROZEN or CLOSED",
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [ true, "Currency is required for creating an account" ],
        default: "INR"
    }
}, {
    timestamps: true
});

accountSchema.index({ user: 1, status: 1 });

// Ensure account has unique 12-digit public account number
accountSchema.pre("save", function () {
    if (!this.accountNumber) {
        this.accountNumber = generateSecureAccountNumber();
    }
});

accountSchema.methods.getBalanceInPaise = async function (session = null) {
    const aggregateQuery = ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebitPaise: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "DEBIT" ] },
                            { $ifNull: [ "$amountInPaise", { $round: [ { $multiply: [ "$amount", 100 ] }, 0 ] } ] },
                            0
                        ]
                    }
                },
                totalCreditPaise: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "CREDIT" ] },
                            { $ifNull: [ "$amountInPaise", { $round: [ { $multiply: [ "$amount", 100 ] }, 0 ] } ] },
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                balancePaise: { $subtract: [ "$totalCreditPaise", "$totalDebitPaise" ] }
            }
        }
    ]);

    if (session) {
        aggregateQuery.session(session);
    }

    const balanceData = await aggregateQuery;

    if (balanceData.length === 0) {
        return 0;
    }

    return Math.round(balanceData[0].balancePaise);
};

accountSchema.methods.getBalance = async function (session = null) {
    const balancePaise = await this.getBalanceInPaise(session);
    return Math.round(balancePaise) / 100;
};

accountSchema.methods.getMaskedAccountNumber = function () {
    const num = this.accountNumber || String(this._id);
    return `•••• ${num.slice(-4)}`;
};

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
const mongoose = require("mongoose");
const crypto = require("crypto");

function generateTransactionReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `TXN-${timestamp}-${random}`;
}

const transactionSchema = new mongoose.Schema({
    reference: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Transaction must be associated with a from account" ],
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Transaction must be associated with a to account" ],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: [ "PENDING", "COMPLETED", "FAILED", "REVERSED" ],
            message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED",
        },
        default: "PENDING",
        index: true
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required for creating a transaction" ],
        min: [ 0.01, "Transaction amount must be greater than zero" ],
        validate: {
            validator: function(val) {
                return Number.isFinite(val) && val > 0;
            },
            message: "Amount must be a valid finite positive number"
        }
    },
    amountInPaise: {
        type: Number,
        validate: {
            validator: function(val) {
                return val === undefined || (Number.isInteger(val) && val > 0);
            },
            message: "amountInPaise must be a positive integer"
        }
    },
    currency: {
        type: String,
        default: "INR"
    },
    description: {
        type: String,
        trim: true,
        maxlength: [ 255, "Description cannot exceed 255 characters" ],
        default: "Funds Transfer"
    },
    idempotencyKey: {
        type: String,
        required: [ true, "Idempotency Key is required for creating a transaction" ],
        index: true,
        unique: true
    },
    reversalOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        default: null
    },
    failureReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

transactionSchema.pre("validate", function () {
    if (this.amount && !this.amountInPaise) {
        this.amountInPaise = Math.round(this.amount * 100);
    }
    if (!this.reference) {
        this.reference = generateTransactionReference();
    }
});

const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;
const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Saved recipient must be associated with a user" ],
        index: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Saved recipient must reference an account" ],
        index: true
    },
    accountNumber: {
        type: String,
        required: [ true, "Account number is required" ],
        trim: true
    },
    recipientName: {
        type: String,
        required: [ true, "Recipient name is required" ],
        trim: true
    },
    nickname: {
        type: String,
        trim: true,
        maxlength: [ 50, "Nickname cannot exceed 50 characters" ],
        default: ""
    }
}, {
    timestamps: true
});

// Prevent duplicate saved beneficiary for the same user and account
recipientSchema.index({ user: 1, account: 1 }, { unique: true });
recipientSchema.index({ user: 1, createdAt: -1 });

const recipientModel = mongoose.model("recipient", recipientSchema);

module.exports = recipientModel;

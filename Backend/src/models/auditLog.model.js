const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: [ true, "Audit action type is required" ],
        enum: [
            "ACCOUNT_FREEZE",
            "ACCOUNT_UNFREEZE",
            "ACCOUNT_CLOSE",
            "TRANSACTION_REVERSAL",
            "SYSTEM_FUNDING",
            "RECONCILIATION_RUN",
            "SECURITY_EVENT"
        ]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Actor user is required" ]
    },
    targetAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        default: null
    },
    targetTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ targetAccount: 1 });

const auditLogModel = mongoose.model("auditLog", auditLogSchema);

module.exports = auditLogModel;

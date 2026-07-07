const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    requied: [ true, "Ledger must be associated with an account"],
    index: true,
    immutable: true
  },

  amount: {
    type: Number,
    required: [true, "Amount is required for creating a ledger entry"],
    immutable: true
  },

  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: [true, "Ledger must be associated with a transaction"],
    index: true,
    immutable: true
  },

  type:{
    type: String,
    enum: {
      values: [ "CREDIT", "DEBIT" ],
      message: "Ledger type can be either CREDIT or DEBIT"
    },
    required: [true, "Ledger type is required for creating a ledger entry"],
    immutable: true
  }
});


function preventLedgerUpdate(){
  throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}


ledgerSchema.pre('findOneAndDelete', preventLedgerUpdate);
ledgerSchema.pre('findOneAndRemove', preventLedgerUpdate);
ledgerSchema.pre('findOneAndUpdate', preventLedgerUpdate);
ledgereSchema.pre('findOneAndUpdate', preventLedgerUpdate);
ledgerSchema.pre('updateOne', preventLedgerUpdate);
ledgerSchema.pre('updateMany', preventLedgerUpdate);
ledgerSchema.pre('update', preventLedgerUpdate);
ledgerSchema.pre('deleteOne', preventLedgerUpdate);
ledgerSchema.pre('deleteMany', preventLedgerUpdate);
ledgerSchema.pre('remove', preventLedgerUpdate);

const ledgerModel = mongoose.model("Ledger",ledgerSchema);

module.exports = ledgerModel;
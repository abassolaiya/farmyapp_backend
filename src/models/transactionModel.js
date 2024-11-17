import mongoose from "mongoose";

const transactionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userType: {
      type: String,
      enum: ["store", "logistics", "farmer", "user", "company"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit", "withdrawal"],
      required: true,
    },
    entity: {
      type: String,
      enum: ["store", "logistics", "farm"],
      required: true,
    },
    entityID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["temporary", "final", "canceled", "pending", "completed"],
    },
    orderID: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
transactionSchema.statics.getTotalTemporaryWallet = async function (entity) {
  const transactions = await this.find({
    entity,
    status: "temporary",
  });
  const totalTemporaryWallet = transactions.reduce(
    (acc, transaction) => acc + transaction.amount,
    0
  );
  return totalTemporaryWallet;
};

transactionSchema.statics.getTotalFinalWallet = async function (entity) {
  const transactions = await this.find({
    entity,
    status: "final",
  });
  const totalFinalWallet = transactions.reduce(
    (acc, transaction) => acc + transaction.amount,
    0
  );
  return totalFinalWallet;
};

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;

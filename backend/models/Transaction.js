import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, // Kullanıcı ID
    type: {
      type: String,
      enum: ["credit", "debit", "referral_bonus", "refund", "coin_purchase", "coin_spent"],
      required: true,
    }, // İşlem türü
    amount: { type: Number, required: true }, // Para tutarı (Coin)
    currency: { type: String, enum: ["COIN"], default: "COIN" }, // Para birimi (sadece COIN)
    description: { type: String, required: false }, // İşlem açıklaması
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: false }, // Referans (user, message vb.)
    referenceType: { type: String, enum: ["user", "chat", "message", "admin", "referral"], required: false }, // Referans türü
    balanceBefore: { type: Number, required: false }, // İşlem öncesi bakiye
    balanceAfter: { type: Number, required: false }, // İşlem sonrası bakiye
    status: { type: String, enum: ["pending", "completed", "failed", "cancelled"], default: "completed" }, // İşlem durumu
    metadata: { type: mongoose.Schema.Types.Mixed, required: false }, // Ek bilgiler
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });

export default mongoose.model("Transaction", transactionSchema);

import mongoose from "mongoose";

const securityCodeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: String, enum: ["email", "sms", "recovery"], required: true },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFY", "PASSWORD_RESET", "PHONE_VERIFY", "TWO_FACTOR_LOGIN", "TWO_FACTOR_RECOVERY"],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    metadata: {
      email: { type: String, required: false },
      phone: { type: String, required: false },
    },
  },
  { timestamps: true },
);

securityCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
securityCodeSchema.index({ userId: 1, purpose: 1, usedAt: 1 });

export default mongoose.model("SecurityCode", securityCodeSchema);

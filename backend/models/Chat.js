import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    name: {
      type: String,
      required: function () {
        return this.type === "group";
      },
    }, // Group için gerekli
    avatar: { type: String },
    description: { type: String },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        addedAt: { type: Date, default: Date.now },
        role: { type: String, enum: ["admin", "member"], default: "member" },
      },
    ],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Group için admin
    lastMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      content: { type: String },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: { type: Date },
    },
    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    settings: {
      notificationsEnabled: { type: Boolean, default: true },
      mutedUntil: { type: Date },
    },
    metadata: {
      totalMessages: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessage: 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ type: 1 });

// Direct chat için unique index
chatSchema.index(
  { participants: 1, type: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { type: "direct" },
  },
);

export default mongoose.model("Chat", chatSchema);

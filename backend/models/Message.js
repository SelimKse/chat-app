import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "file", "audio", "video"], default: "text" },
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String },
        size: { type: Number },
        mimeType: { type: String },
      },
    ],
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editHistory: [
      {
        content: { type: String },
        editedAt: { type: Date, default: Date.now },
      },
    ],
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["sending", "sent", "delivered", "read", "failed"], default: "sent" },
  },
  { timestamps: true },
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model("Message", messageSchema);

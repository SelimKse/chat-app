import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["user", "admin", "system"], required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [
      {
        url: { type: String, required: true, trim: true },
        filename: { type: String, required: true, trim: true },
        mimeType: { type: String, required: false, trim: true },
        size: { type: Number, required: false },
      },
    ],
    isInternalNote: { type: Boolean, default: false },
  },
  { _id: false, timestamps: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ["technical", "billing", "account", "abuse", "other"],
      default: "other",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "waiting_user", "resolved", "closed"],
      default: "open",
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },
    messages: [supportMessageSchema],
    lastMessageAt: { type: Date, default: Date.now, index: true },
    sla: {
      firstResponseDueAt: { type: Date, required: false },
      firstResponseAt: { type: Date, required: false },
      resolutionDueAt: { type: Date, required: false },
      totalFirstResponseMinutes: { type: Number, default: 0 },
      totalResolutionMinutes: { type: Number, default: 0 },
      isFirstResponseBreached: { type: Boolean, default: false },
      isResolutionBreached: { type: Boolean, default: false },
    },
    resolvedAt: { type: Date, required: false },
    closedAt: { type: Date, required: false },
  },
  { timestamps: true },
);

supportTicketSchema.index({ createdBy: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, lastMessageAt: -1 });

supportTicketSchema.pre("validate", function () {
  if (!this.ticketNo) {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    this.ticketNo = `STK-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }
});

export default mongoose.model("SupportTicket", supportTicketSchema);

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },

    // AI-generated summary (populated on session close or on-demand)
    summary: {
      overview: { type: String, default: null },
      detectedIntent: { type: String, default: null },
      relatedProducts: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      ],
      linkedTicket: { type: String, default: null },
    },

    // Metadata
    messageCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound indexes
chatSessionSchema.index({ user: 1, createdAt: -1 });
chatSessionSchema.index({ status: 1, lastActivity: -1 });
chatSessionSchema.index({ "summary.linkedTicket": 1 });

export default mongoose.model("ChatSession", chatSessionSchema);

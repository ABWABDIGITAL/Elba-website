import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema({
  // Ticket ID
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Customer Information
  customer: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null }
  },

  // Ticket Content
  category: {
    type: String,
    enum: ["orders", "billing", "technical", "returns", "complaints", "general"],
    default: "general"
  },
  supportType: String,
  subject: String,
  description: String,
  orderNumber: String,

  // AI Resolution
  aiResolved: {
    type: Boolean,
    default: false
  },
  aiResponse: String,
  aiConfidenceLevel: {
    type: String,
    enum: ["high", "medium", "low"],
    default: "medium"
  },
  
  // If AI couldn't solve
  needsHumanReview: {
    type: Boolean,
    default: false
  },
  escalationReason: String,

  // Chat Context
  chatHistory: [{
    role: String,
    content: String,
    timestamp: Date
  }],
  chatThreadId: String,

  // Status
  status: {
    type: String,
    enum: ["ai_resolved", "open", "in_progress", "waiting_customer", "resolved", "closed"],
    default: "open",
    index: true
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },

  // Assignment (for human review)
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedAt: Date,

  // SLA
  slaDeadline: Date,

  // Human Agent Response
  agentNotes: [{
    content: String,
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
  }],
  agentResponse: String,
  respondedAt: Date,

  // Resolution
  resolvedAt: Date,
  resolvedBy: {
    type: String,
    enum: ["ai", "human"],
    default: null
  },
  resolution: String,

  // Customer Feedback
  customerConfirmedResolved: {
    type: Boolean,
    default: null
  },
  customerRating: Number,
  customerFeedback: String,

  // Tracking - Prevent Repeat
  relatedTickets: [String],
  isRepeatIssue: { type: Boolean, default: false },
  originalTicketId: String

}, { timestamps: true });

// Indexes
supportTicketSchema.index({ "customer.userId": 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1 });
supportTicketSchema.index({ chatThreadId: 1 });

export default mongoose.model("SupportTicket", supportTicketSchema);
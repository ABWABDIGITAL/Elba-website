// models/paymentLog.model.js
import mongoose from "mongoose";

const paymentLogSchema = new mongoose.Schema(
  {
    // Event identification
    eventType: {
      type: String,
      required: true,
      enum: [
        "payment_initiated",
        "webhook_received",
        "payment_success",
        "payment_failed",
        "refund_initiated",
        "refund_completed",
        "security_alert",
      ],
      index: true,
    },
    
    // Related entities
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    
    // MyFatoorah references
    invoiceId: {
      type: String,
      index: true,
    },
    
    sessionId: String,
    transactionId: String,
    
    // Status tracking
    status: {
      type: String,
      enum: [
        "pending",
        "success",
        "failed",
        "rejected",
        "duplicate",
        "security_alert",
        "amount_mismatch",
        "stock_error",
      ],
    },
    
    // Request details (sanitized)
    ip: String,
    userAgent: String,
    payload: mongoose.Schema.Types.Mixed,
    
    // Financial data
    expectedAmount: Number,
    paidAmount: Number,
    currency: String,
    
    // Error tracking
    errorMessage: String,
    errorStack: String,
    
    // Performance
    processingTimeMs: Number,
    
    // Metadata
    reason: String,
    adminNotes: String,
    
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// 📊 INDEXES FOR COMMON QUERIES
// ═══════════════════════════════════════════════════════════════

// Compound index for order payment history
paymentLogSchema.index({ orderId: 1, timestamp: -1 });

// Index for security monitoring
paymentLogSchema.index({ status: 1, timestamp: -1 });

// Index for user payment history
paymentLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// ═══════════════════════════════════════════════════════════════
// 🗑️ AUTO-DELETE OLD LOGS (Data Retention - 2 years)
// ═══════════════════════════════════════════════════════════════

paymentLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 63072000 } // 2 years in seconds
);

// ═══════════════════════════════════════════════════════════════
// 🔧 STATIC METHODS
// ═══════════════════════════════════════════════════════════════

paymentLogSchema.statics.logEvent = async function (eventData) {
  try {
    return await this.create(eventData);
  } catch (error) {
    console.error("Failed to log payment event:", error);
    // Don't throw - logging should not break payment flow
    return null;
  }
};

paymentLogSchema.statics.getOrderHistory = function (orderId) {
  return this.find({ orderId })
    .sort({ timestamp: -1 })
    .limit(50);
};

paymentLogSchema.statics.getSecurityAlerts = function (hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    status: "security_alert",
    timestamp: { $gte: since },
  }).sort({ timestamp: -1 });
};

export default mongoose.model("PaymentLog", paymentLogSchema);
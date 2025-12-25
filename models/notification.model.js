import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "new_register",
        "order_created",
        "order_confirmed",
        "order_shipped",
        "order_delivered",
        "order_cancelled",
        "discount_alert",
        "flash_sale",
        "new_product",
        "stock_alert",
        "review_reminder",
        "general",
      ],
      index: true,
    },

    // Arabic content
    ar: {
      title: { type: String, required: true },
      message: { type: String, required: true },
    },

    // English content
    en: {
      title: { type: String, required: true },
      message: { type: String, required: true },
    },
    // WhatsApp specific fields
    whatsapp: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      messageId: { type: String, default: null },
      status: {
        type: String,
        enum: ["pending", "sent", "delivered", "read", "failed"],
        default: "pending",
      },
      error: { type: String, default: null },
    },
    // In-app notification fields
    inApp: {
      read: { type: Boolean, default: false, index: true },
      readAt: { type: Date, default: null },
    },
    // Related data
    relatedModel: {
      type: String,
      enum: ["Order", "Product", "User", "Coupon", null],
      default: null,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    // Scheduling
    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, "inApp.read": 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, "whatsapp.sent": 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for related document
notificationSchema.virtual("relatedDocument", {
  refPath: "relatedModel",
  localField: "relatedId",
  foreignField: "_id",
  justOne: true,
});

// Methods
notificationSchema.methods.markAsRead = function () {
  this.inApp.read = true;
  this.inApp.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markWhatsAppAsSent = function (messageId) {
  this.whatsapp.sent = true;
  this.whatsapp.sentAt = new Date();
  this.whatsapp.messageId = messageId;
  this.whatsapp.status = "sent";
  return this.save();
};

notificationSchema.methods.markWhatsAppAsDelivered = function () {
  this.whatsapp.status = "delivered";
  return this.save();
};

notificationSchema.methods.markWhatsAppAsFailed = function (error) {
  this.whatsapp.status = "failed";
  this.whatsapp.error = error;
  return this.save();
};

// Statics
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, "inApp.read": false });
};

notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, "inApp.read": false },
    { $set: { "inApp.read": true, "inApp.readAt": new Date() } }
  );
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;

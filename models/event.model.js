import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      index: true,
      enum: [
        // Session
        "session_start",
        "session_end",
        // Page
        "page_view",
        // Product
        "product_viewed",
        "product_list_viewed",
        // Search
        "search_performed",
        // Cart
        "cart_viewed",
        "product_added_to_cart",
        "product_removed_from_cart",
        "cart_abandoned",
        // Wishlist
        "product_added_to_wishlist",
        "product_removed_from_wishlist",
        // Checkout
        "checkout_started",
        "checkout_step_completed",
        "checkout_abandoned",
        // Order
        "order_placed",
        "order_confirmed",
        "order_cancelled",
        "order_shipped",
        "order_delivered",
        "order_returned",
        // User
        "user_registered",
        "user_logged_in",
        "user_logged_out",
        // Engagement
        "review_submitted",
        "coupon_applied",
        "coupon_failed",
        // Error
        "payment_failed",
        "error_occurred",
      ],
    },
    eventCategory: {
      type: String,
      enum: [
        "session",
        "page",
        "product",
        "search",
        "cart",
        "wishlist",
        "checkout",
        "order",
        "user",
        "engagement",
        "error",
      ],
      required: true,
      index: true,
    },

    // User Identification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    anonymousId: {
      type: String,
      index: true,
      sparse: true,
    },
    isAuthenticated: {
      type: Boolean,
      default: false,
    },

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    // Page Context
    page: {
      url: String,
      path: String,
      title: String,
      referrer: String,
      type: {
        type: String,
        enum: [
          "home",
          "category",
          "product",
          "cart",
          "checkout",
          "account",
          "search",
          "other",
        ],
      },
    },

    // Product Data
    product: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      sku: String,
      name: String,
      nameAr: String,
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
      categoryName: String,
      brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
      brandName: String,
      price: Number,
      originalPrice: Number,
      discount: Number,
      quantity: Number,
      position: Number,
      listName: String,
    },

    // Cart Data
    cart: {
      cartId: String,
      itemCount: Number,
      totalValue: Number,
      items: [
        {
          productId: mongoose.Schema.Types.ObjectId,
          quantity: Number,
          price: Number,
        },
      ],
    },

    // Order Data
    order: {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
      orderNumber: String,
      totalAmount: Number,
      subtotal: Number,
      shippingCost: Number,
      taxAmount: Number,
      discountAmount: Number,
      couponCode: String,
      itemCount: Number,
      paymentMethod: String,
      shippingMethod: String,
      shippingCity: String,
    },

    // Search Data
    search: {
      query: String,
      resultsCount: Number,
      hasResults: Boolean,
      filters: mongoose.Schema.Types.Mixed,
      sortBy: String,
      page: Number,
    },

    // Attribution
    attribution: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
      referrer: String,
      landingPage: String,
    },

    // Device Info
    device: {
      type: { type: String, enum: ["desktop", "mobile", "tablet"] },
      os: String,
      browser: String,
      language: String,
    },

    // Geographic
    geo: {
      country: String,
      city: String,
      region: String,
    },

    // Custom Properties
    properties: mongoose.Schema.Types.Mixed,

    // Error Data
    error: {
      code: String,
      message: String,
      context: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
eventSchema.index({ eventName: 1, timestamp: -1 });
eventSchema.index({ userId: 1, timestamp: -1 });
eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ "product.productId": 1, eventName: 1 });
eventSchema.index({ "product.category": 1, eventName: 1 });
eventSchema.index({ "order.orderId": 1 });
eventSchema.index({ "attribution.source": 1, timestamp: -1 });
eventSchema.index({ timestamp: -1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

// Compound index for funnel analysis
eventSchema.index({ sessionId: 1, eventName: 1, timestamp: 1 });

// Statics
eventSchema.statics.trackEvent = async function (eventData) {
  return this.create(eventData);
};

eventSchema.statics.getEventsByUser = function (userId, options = {}) {
  const { limit = 100, eventNames, startDate, endDate } = options;

  const query = { userId };

  if (eventNames?.length) {
    query.eventName = { $in: eventNames };
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query).sort({ timestamp: -1 }).limit(limit).lean();
};

eventSchema.statics.getEventsBySession = function (sessionId) {
  return this.find({ sessionId }).sort({ timestamp: 1 }).lean();
};

export default mongoose.model("Event", eventSchema);
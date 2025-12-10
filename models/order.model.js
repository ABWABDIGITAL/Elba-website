import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },

    color: {
      type: String,
    },

    price: {
      type: Number,
      required: true,
      min: [0, "Price must be >= 0"],
    },

    // Snapshot of product name at time of order (for historical record)
    productName: {
      en: String,
      ar: String,
    },

    productSku: String,
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      default: "Saudi Arabia",
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Order number (auto-generated, user-friendly)
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    // Pricing
    itemsPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    taxPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "credit_card", "tabby", "tamara"],
      required: true,
      default: "cash_on_delivery",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    paymentResult: {
      id: String,
      status: String,
      update_time: Date,
      email_address: String,
    },

    paidAt: Date,

    // Coupon
    appliedCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },

    couponCode: String,

    // Order Status
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "completed",
      ],
      default: "pending",
      index: true,
    },

    // Delivery tracking
    deliveredAt: Date,
    shippedAt: Date,
    estimatedDelivery: Date,
    trackingNumber: String,
    carrier: String,

    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,

    // Notes
    customerNotes: String,
    adminNotes: String,

    // Timestamps for status changes
    statusHistory: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* -----------------------------------
   INDEXES
----------------------------------- */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

/* -----------------------------------
   GENERATE ORDER NUMBER
----------------------------------- */
orderSchema.pre("validate", async function (next) {
  try {
    // نولّد رقم الطلب قبل الـ validation
    if (this.isNew && !this.orderNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      const lastOrder = await mongoose
        .model("Order")
        .findOne({
          orderNumber: new RegExp(`^ORD-${year}${month}${day}`),
        })
        .sort({ orderNumber: -1 })
        .select("orderNumber");

      let sequence = 1;
      if (lastOrder) {
        const lastSequence = parseInt(lastOrder.orderNumber.split("-").pop());
        sequence = lastSequence + 1;
      }

      this.orderNumber = `ORD-${year}${month}${day}-${String(sequence).padStart(
        4,
        "0"
      )}`;
      console.log("🔥 pre-validate generated orderNumber:", this.orderNumber);
    }

    next();
  } catch (err) {
    next(err);
  }
});


/* -----------------------------------
   ADD STATUS TO HISTORY
----------------------------------- */
orderSchema.pre("save", function (next) {
  if (this.isModified("orderStatus")) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
    });
  }
  next();
});

/* -----------------------------------
   VIRTUALS
----------------------------------- */
// Check if order can be cancelled
orderSchema.virtual("canBeCancelled").get(function () {
  return (
    this.orderStatus === "pending" ||
    this.orderStatus === "confirmed"
  );
});

// Check if order is in progress
orderSchema.virtual("isInProgress").get(function () {
  return (
    this.orderStatus === "processing" ||
    this.orderStatus === "shipped"
  );
});

// Check if order is completed
orderSchema.virtual("isCompleted").get(function () {
  return (
    this.orderStatus === "delivered" ||
    this.orderStatus === "cancelled" ||
    this.orderStatus === "returned"
  );
});

const Order = mongoose.model("Order", orderSchema);
export default Order;

import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },

    color: {
      type: String,
    },

    price: {
      type: Number,
      required: true,
      min: [0, "Price must be >= 0"],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    cartItems: [cartItemSchema],

    totalCartPrice: {
      type: Number,
      default: 0,
    },

    totalPriceAfterDiscount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;

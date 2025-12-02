// models/support.model.js
export const SUPPORT_TYPES = [
  "installation_request",
  "maintenance_request",
  "technical_issue",
  "warranty_claim",
  "product_inquiry",
  "return_or_exchange"
];

import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    supportType: {
      type: String,
      required: true,
      enum:SUPPORT_TYPES
    },

    fixDate: {
      type: Date,
      default: null,
    },

    description: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 2000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Support", supportSchema);

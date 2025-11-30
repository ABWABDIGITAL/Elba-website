import mongoose from "mongoose";

const catalogSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      unique: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    image: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["Large", "Small"],
      default: "Large",
    },

    productCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Catalog", catalogSchema);

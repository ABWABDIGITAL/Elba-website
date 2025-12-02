// models/contactUs.model.js
import mongoose from "mongoose";

const contactUsSchema = new mongoose.Schema(
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
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    }
  },
  { timestamps: true }
);

export default mongoose.model("ContactUs", contactUsSchema);

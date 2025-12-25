import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Optional phone field, but if provided, must be valid
          if (!v) return true;
          return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(v);
        },
        message: "Please enter a valid phone number",
      },
    },

    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    preferences: {
      receiveEmail: { type: Boolean, default: true },
      receiveWhatsApp: { type: Boolean, default: false },
      language: { type: String, enum: ["en", "ar"], default: "ar" },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastSentAt: {
      type: Date,
      default: null,
    },

    totalSent: {
      type: Number,
      default: 0,
    },

    source: {
      type: String,
      enum: ["website", "mobile_app", "admin", "landing_page"],
      default: "website",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for quick lookups (email already indexed via unique: true)
newsletterSchema.index({ isActive: 1 });
newsletterSchema.index({ "preferences.receiveEmail": 1 });
newsletterSchema.index({ "preferences.receiveWhatsApp": 1 });

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;

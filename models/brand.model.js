import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    en: {
      name: {
        type: String,
        required: [true, "English name is required"],
        trim: true,
        minlength: 2,
        maxlength: 50,
      },
      slug: {
        type: String,
        required: [true, "English slug is required"],
        trim: true,
        lowercase: true,
      },
    },

    ar: {
      name: {
        type: String,
        required: [true, "Arabic name is required"],
        trim: true,
        minlength: 2,
        maxlength: 50,
      },
      slug: {
        type: String,
        required: [true, "Arabic slug is required"],
        trim: true,
        lowercase: true,
      },
    },

    logo: {
      type: String,
    },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-append BASE_URL for logo (if stored as file path)
const setImageUrl = (doc) => {
  if (doc.logo && !doc.logo.startsWith("http")) {
    doc.logo = `${process.env.BASE_URL}/${doc.logo}`;
  }
};

brandSchema.post("save", setImageUrl);
brandSchema.post("init", setImageUrl);

export default mongoose.model("Brand", brandSchema);

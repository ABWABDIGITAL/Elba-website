import mongoose from "mongoose";
import slugify from "slugify";

const tagSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: [true, "Arabic name is required"], trim: true },
      en: { type: String, required: [true, "English name is required"], trim: true },
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["manual", "automatic", "both"],
      default: "manual",
    },

    icon: { type: String, default: null },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    isSystem: {
      type: Boolean,
      default: false,
    },

    // Links to old enum key (e.g. "best_seller", "on_sale") for automation
    automationKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-generate slug from en.name before save
tagSchema.pre("save", function (next) {
  if (this.isModified("name.en") && this.name?.en) {
    this.slug = slugify(this.name.en, { lower: true, strict: true });
  }
  next();
});

// Prevent deletion of system tags
tagSchema.pre("findOneAndDelete", async function (next) {
  const tag = await this.model.findOne(this.getQuery());
  if (tag?.isSystem) {
    throw new Error("Cannot delete system tags");
  }
  next();
});

export default mongoose.model("Tag", tagSchema);

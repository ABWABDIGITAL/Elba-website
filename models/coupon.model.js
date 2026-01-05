import mongoose from "mongoose";
import slugify from "slugify";

const couponSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    code: { type: String, required: true, trim: true, unique: true },
    discount: { type: Number, required: true, min: 0, max: 100 },
    expiredAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

couponSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Indexes - slug and code already have unique: true in schema, so no need to duplicate

export default mongoose.model("Coupon", couponSchema);

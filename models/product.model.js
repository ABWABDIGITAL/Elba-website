import mongoose from "mongoose";
import slugify from "slugify";
import seoSchema from "./seo.model.js";

async function safeUpdateCategoryCount(categoryId, inc) {
  if (!categoryId) return;

  if (typeof categoryId === "object" && categoryId._id) {
    categoryId = categoryId._id;
  }

  if (!mongoose.isValidObjectId(categoryId)) {
    console.warn("Invalid categoryId:", categoryId);
    return;
  }

  const Category = mongoose.model("Category");

  const cat = await Category.findByIdAndUpdate(
    categoryId,
    { $inc: { productCount: inc } },
    { new: true }
  );

  // never allow negative count
  if (cat && cat.productCount < 0) {
    cat.productCount = 0;
    await cat.save();
  }
}

/* =========================================================================
   PRODUCT SCHEMA
=========================================================================== */
const productSchema = new mongoose.Schema(
  {
    /* ------------------------ MULTILANG -------------------------- */
    ar: {
      title: { type: String, required: true },
      subTitle: { type: String, required: true },
      description: [{ title: String, content: String }],
      specifications: [{ key: String, value: String, unit: String, group: String }],
      features: [String],
      warranty: String,
      details: [{ key: String, value: String }],
      seo: seoSchema,
      catalog:{ pdfUrl: { type: String }}
    },

    en: {
      title: { type: String, required: true },
      subTitle: { type: String, required: true },
      description: [{ title: String, content: String }],
      specifications: [{ key: String, value: String, unit: String, group: String }],
      features: [String],
      warranty: String,
      details: [{ key: String, value: String }],
      seo: seoSchema,
      catalog:{ pdfUrl: { type: String }}
    },

    /* ------------------------ MEDIA ------------------------------- */
    images: [{ url: { type: String, required: true } }],

    /* ------------------------ IDENTIFIERS -------------------------- */
    slug: { type: String, unique: true, index: true },

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    modelNumber: String,

    /* ------------------------ PRICING ------------------------------ */
    price: { type: Number, required: true, min: 0 },
    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountPercentage: { type: Number, default: 0, min: 0, max: 100, index: true },

    currencyCode: { type: String, enum: ["SAR", "USD", "AED"], default: "SAR" },

    /* ------------------------ STOCK ------------------------------- */
    stock: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "coming_soon"],
      default: "active",
    },

    /* ------------------------ RELATIONS ---------------------------- */
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },

    /* ------------------------ NEW TYPE FIELD ------------------------ */
    sizeType: {
      type: String,
      enum: ["large", "small", "accessories", "electronics", "other"],
      default: "large",
      index: true,
    },

    /* ------------------------ ANALYTICS ----------------------------- */
    salesCount: { type: Number, default: 0, min: 0 },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsQuantity: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    tags: {
      type: [String],
      enum: [
        "best_seller",
        "hot",
        "new_arrival",
        "trending",
        "featured",
        "limited_edition",
        "on_sale",
        "clearance",
        "top_rated",
        "eco_friendly",
        "exclusive",
        "recommended",
      ],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =========================================================================
   SLUG
=========================================================================== */
productSchema.pre("save", function (next) {
  if (this.isModified("sku") && this.sku) {
    this.slug = slugify(this.sku, { lower: true, strict: true });
  }
  next();
});

/* =========================================================================
   AUTO DISCOUNT CALC
=========================================================================== */
productSchema.pre("save", function (next) {
  if (this.price > 0 && this.discountPrice > 0 && this.discountPrice < this.price) {
    this.discountPercentage = Number(((this.discountPrice / this.price) * 100).toFixed(2));
  } else {
    this.discountPrice = this.discountPrice || 0;
    this.discountPercentage = 0;
  }
  next();
});

/* =========================================================================
   HOOKS: ADD / REMOVE PRODUCT COUNT
=========================================================================== */
productSchema.post("save", async function (doc) {
  if (!this.isNew) return;
  await safeUpdateCategoryCount(doc.category, +1);
});

productSchema.pre("findOneAndUpdate", async function (next) {
  const existing = await this.model.findOne(this.getQuery()).select("category");
  this._oldCategory = existing?.category;
  next();
});

productSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const oldCat = this._oldCategory;
  const newCat = doc.category;

  if (!oldCat || !newCat || oldCat.toString() === newCat.toString()) return;

  await safeUpdateCategoryCount(oldCat, -1);
  await safeUpdateCategoryCount(newCat, +1);
});

productSchema.post("findOneAndDelete", async function (doc) {
  if (!doc?.category) return;
  await safeUpdateCategoryCount(doc.category, -1);
});

/* =========================================================================
   VIRTUALS
=========================================================================== */
productSchema.virtual("finalPrice").get(function () {
  if (this.discountPrice > 0 && this.discountPrice < this.price) {
    return Number((this.price - this.discountPrice).toFixed(2));
  }
  return this.price;
});

productSchema.virtual("installments").get(function () {
  const finalPrice =
    this.finalPrice ||
    (this.discountPrice > 0 && this.discountPrice < this.price
      ? this.price - this.discountPrice
      : this.price);

  const providers = [];
// SAFE helper
  const safeToFixed = (value, digits = 2) =>
    typeof value === "number" ? Number(value.toFixed(digits)) : 0;

  // If finalPrice is missing, fallback to price
  const basePrice = typeof finalPrice === "number" ? finalPrice : this.price || 0;


  // ----- Tabby -----
  providers.push({
    provider: "tabby",
    months: 4,
    monthlyAmount: safeToFixed(basePrice / 4),
    total: safeToFixed(basePrice),
    fee: 0,
  });

  // ----- Tamara -----
  const tamaraFee = 25;
  providers.push({
    provider: "tamara",
    months: 3,
    monthlyAmount: safeToFixed((basePrice + tamaraFee) / 3),
    total: safeToFixed(basePrice + tamaraFee),
    fee: tamaraFee,
  });

  // ----- PayLater -----
  const payLaterPercent = 10;
  const payLaterExtra = (basePrice * payLaterPercent) / 100;
  providers.push({
    provider: "paylater",
    months: 6,
    monthlyAmount: safeToFixed((basePrice + payLaterExtra) / 6),
    total: safeToFixed(basePrice + payLaterExtra),
    fee: safeToFixed(payLaterExtra),
  });


  return providers;
});


export default mongoose.model("Product", productSchema);

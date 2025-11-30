// models/product.model.js
import mongoose from "mongoose";
import slugify from "slugify";
import seoSchema from "./seo.model.js";

const productSchema = new mongoose.Schema(
  {
    // ----------------- AR -----------------
    ar: {
      title: { type: String, required: true, trim: true },
      subTitle: { type: String, required: true, trim: true },
      description: [
        {
          title: { type: String, trim: true },
          content: { type: String, trim: true },
        },
      ],
      specifications: [
        {
          key: { type: String, trim: true },
          value: { type: String, trim: true },
          unit: { type: String, trim: true },
          group: { type: String, trim: true },
        },
      ],
      features: [{ type: String, trim: true }],
      warranty: { type: String, trim: true },
      details: [
        { key: { type: String, trim: true }, value: { type: String, trim: true } },
      ],
      reference: {
        file: {
          url: String,
          filename: String,
          fileType: String,
          size: Number,
        },
      },
      seo: seoSchema,
    },

    // ----------------- EN -----------------
    en: {
      title: { type: String, required: true, trim: true },
      subTitle: { type: String, required: true, trim: true },
      description: [
        {
          title: { type: String, trim: true },
          content: { type: String, trim: true },
        },
      ],
      specifications: [
        {
          key: { type: String, trim: true },
          value: { type: String, trim: true },
          unit: { type: String, trim: true },
          group: { type: String, trim: true },
        },
      ],
      features: [{ type: String, trim: true }],
      warranty: { type: String, trim: true },
      details: [
        { key: { type: String, trim: true }, value: { type: String, trim: true } },
      ],
      reference: {
        file: {
          url: String,
          filename: String,
          fileType: String,
          size: Number,
        },
      },
      seo: seoSchema,
    },

    // ----------------- GLOBAL -----------------
    images: [
      {
        url: { type: String, required: true },
      },
    ],

    slug: { type: String, unique: true, index: true },

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    modelNumber: { type: String, trim: true },

    price: { type: Number, required: true, min: 0 },

    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (val) {
          return val <= this.price;
        },
        message: "discountPrice cannot be greater than price",
      },
    },

    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    currencyCode: {
      type: String,
      enum: ["SAR", "USD", "AED"],
      default: "SAR",
    },

    stock: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "coming_soon"],
      default: "active",
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    erpIntegration: {
      onyxProductId: String,
      syncStatus: {
        type: String,
        enum: ["pending", "synced", "failed"],
        default: "pending",
      },
      lastSyncedAt: Date,
    },

    salesCount: { type: Number, default: 0, min: 0, index: true },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsQuantity: { type: Number, default: 0 },

    isFav: { type: Boolean, default: false },
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

/* -----------------------------------
   SLUG LOGIC
----------------------------------- */
productSchema.pre("save", function (next) {
  if (this.isModified("sku") && this.sku) {
    this.slug = slugify(this.sku, { lower: true, strict: true });
  }
  next();
});

/* -----------------------------------
   DISCOUNT LOGIC
----------------------------------- */
productSchema.pre("save", function (next) {
  if (this.price > 0 && this.discountPrice > 0 && this.discountPrice < this.price) {
    this.discountPercentage = Number(
      ((this.discountPrice / this.price) * 100).toFixed(2)
    );
  } else {
    if (!this.discountPrice) this.discountPrice = 0;
    this.discountPercentage = 0;
  }
  next();
});

/* -----------------------------------
   DETECT NEW PRODUCT
----------------------------------- */
productSchema.post("save", async function (doc) {
  if (!this._wasNew) return;
  await safeUpdateCategoryCount(doc.category, +1);
});

/* -----------------------------------
   SAFE COUNTER UPDATER
----------------------------------- */
async function safeUpdateCategoryCount(categoryId, inc) {
  if (!categoryId) return;

  const Category = mongoose.model("Category");
  const cat = await Category.findByIdAndUpdate(
    categoryId,
    { $inc: { productCount: inc } },
    { new: true }
  );

  if (cat && cat.productCount < 0) {
    cat.productCount = 0;
    await cat.save();
  }
}


/* -----------------------------------
   CREATE HOOK
----------------------------------- */
productSchema.post("save", async function (doc) {
  if (!this._wasNew) return;

  await safeUpdateCategoryCount(doc.category, +1);

  const Category = mongoose.model("Category");
  const Catalog = mongoose.model("Catalog");

  const category = await Category.findById(doc.category);
  if (category?.catalog) {
    await safeUpdateCategoryCount(category.catalog, +1);
  }
});

/* -----------------------------------
   UPDATE HOOK
----------------------------------- */
productSchema.pre("findOneAndUpdate", async function (next) {
  const existing = await this.model.findOne(this.getQuery()).select("category");
  this._oldCategory = existing?.category?.toString();
  next();
});

productSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const oldCat = this._oldCategory;
  const newCat = doc.category?.toString();

  if (!oldCat || !newCat || oldCat === newCat) return;

  await safeUpdateCategoryCount(oldCat, -1);
  await safeUpdateCategoryCount(newCat, +1);
});


productSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const oldCat = this._oldCategory;
  const newCat = doc.category?.toString();

  if (!oldCat || !newCat || oldCat === newCat) return;

  await safeUpdateCategoryCount(oldCat, -1);
  await safeUpdateCategoryCount(newCat, +1);

  const Category = mongoose.model("Category");

  const oldCategory = await Category.findById(oldCat);
  if (oldCategory?.catalog) {
    await safeUpdateCategoryCount(oldCategory.catalog, -1);
  }

  const newCategory = await Category.findById(newCat);
  if (newCategory?.catalog) {
    await safeUpdateCategoryCount(newCategory.catalog, +1);
  }
});

/* -----------------------------------
   DELETE HOOK
----------------------------------- */
productSchema.post("findOneAndDelete", async function (doc) {
  if (!doc?.category) return;

  await safeUpdateCategoryCount(doc.category, -1);

  const Category = mongoose.model("Category");

  const category = await Category.findById(doc.category);
  if (category?.catalog) {
    await safeUpdateCategoryCount(category.catalog, -1);
  }
});

/* -----------------------------------
   VIRTUALS
----------------------------------- */
productSchema.virtual("finalPrice").get(function () {
  if (this.discountPrice > 0 && this.discountPrice < this.price) {
    return Number((this.price - this.discountPrice).toFixed(2));
  }
  return this.price;
});

productSchema.virtual("installments").get(function () {
  const price = this.finalPrice;
  return {
    tabby: { payLaterDays: 14, plans: { 4: Number((price / 4).toFixed(2)) } },
    tamara: {
      payLaterDays: 30,
      plans: {
        3: Number((price / 3).toFixed(2)),
        6: Number((price / 6).toFixed(2)),
      },
    },
  };
});

/* -----------------------------------
   EXPORT (ONLY ONCE)
----------------------------------- */
export default mongoose.model("Product", productSchema);

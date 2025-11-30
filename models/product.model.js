import mongoose from "mongoose";
import slugify from "slugify";
import seoSchema from "./seo.model.js";

const localizedString = {
  en: { type: String, required: true, trim: true },
  ar: { type: String, required: true, trim: true },
};

const productSchema = new mongoose.Schema(
  {
    name: localizedString,
    title: localizedString,

    slug: {
      en: { type: String, unique: true, index: true },
      ar: { type: String, unique: true, index: true },
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    modelNumber: { type: String, trim: true },

    description: [
      {
        title: localizedString,
        subtitle: localizedString,
        content: localizedString,
      },
    ],

    specifications: [
      {
        key: localizedString,
        value: localizedString,
        unit: localizedString,
        group: localizedString,
      },
    ],

    features: [localizedString],

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

    warranty: localizedString,

    stock: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock", "coming_soon"],
      default: "active",
    },

    seo: seoSchema,

    images: [
      {
        url: String,
        alt: localizedString,
        isPrimary: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
    ],

    details: [
      {
        key: localizedString,
        value: localizedString,
      },
    ],

    reference: {
      title: localizedString,
      subtitle: localizedString,
      content: {
        text: {
          en: { type: String, trim: true },
          ar: { type: String, trim: true },
        },
        file: {
          url: String,
          filename: String,
          fileType: String,
          size: Number,
        },
      },
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

    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsQuantity: { type: Number, default: 0 },

    isFav: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
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
  if (this.isModified("name")) {
    if (this.name?.en) {
      this.slug.en = slugify(this.name.en, { lower: true, strict: true });
    }

    if (this.name?.ar) {
      this.slug.ar = this.name.ar
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\u0600-\u06FF0-9\-]/g, "")
        .toLowerCase();
    }
  }
  next();
});

/* -----------------------------------
   DISCOUNT LOGIC
----------------------------------- */
productSchema.pre("save", function (next) {
  if (this.discountPrice > 0 && this.discountPrice < this.price) {
    const discountValue = this.price - this.discountPrice;
    this.discountPercentage = Number(
      ((discountValue / this.price) * 100).toFixed(2)
    );
  } else {
    this.discountPercentage = 0;
  }
  next();
});

/* -----------------------------------
   FIXED: PROPER NEW DOCUMENT DETECTION
----------------------------------- */
productSchema.pre("save", function (next) {
  this._wasNew = this.isNew;
  next();
});

/* -----------------------------------
   CREATE: UPDATE CATEGORY + CATALOG COUNTS
----------------------------------- */
productSchema.post("save", async function (doc) {
  if (!this._wasNew) return; // ONLY when creating a new product

  const Category = mongoose.model("Category");
  const Catalog = mongoose.model("Catalog");

  // Increment category
  const category = await Category.findByIdAndUpdate(
    doc.category,
    { $inc: { productCount: 1 } },
    { new: true }
  );

  // Increment catalog
  if (category?.catalog) {
    await Catalog.findByIdAndUpdate(category.catalog, {
      $inc: { productCount: 1 },
    });
  }
});

/* -----------------------------------
   CAPTURE OLD CATEGORY BEFORE UPDATE
----------------------------------- */
productSchema.pre("findOneAndUpdate", async function (next) {
  const existing = await this.model.findOne(this.getQuery()).select("category");
  this._oldCategory = existing?.category?.toString();
  next();
});

/* -----------------------------------
   UPDATE: MOVE COUNTS BETWEEN CATEGORIES+CATALOGS
----------------------------------- */
productSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const Category = mongoose.model("Category");
  const Catalog = mongoose.model("Catalog");

  const oldCat = this._oldCategory;
  const newCat = doc.category?.toString();

  if (!oldCat || !newCat || oldCat === newCat) return;

  // Decrement old category
  const oldCategory = await Category.findByIdAndUpdate(
    oldCat,
    { $inc: { productCount: -1 } },
    { new: true }
  );

  if (oldCategory?.catalog) {
    await Catalog.findByIdAndUpdate(oldCategory.catalog, {
      $inc: { productCount: -1 },
    });
  }

  // Increment new category
  const newCategory = await Category.findByIdAndUpdate(
    newCat,
    { $inc: { productCount: 1 } },
    { new: true }
  );

  if (newCategory?.catalog) {
    await Catalog.findByIdAndUpdate(newCategory.catalog, {
      $inc: { productCount: 1 },
    });
  }
});

/* -----------------------------------
   DELETE: DECREMENT COUNTS
----------------------------------- */
productSchema.post("findOneAndDelete", async function (doc) {
  if (!doc?.category) return;

  const Category = mongoose.model("Category");
  const Catalog = mongoose.model("Catalog");

  const category = await Category.findByIdAndUpdate(
    doc.category,
    { $inc: { productCount: -1 } },
    { new: true }
  );

  if (category?.catalog) {
    await Catalog.findByIdAndUpdate(category.catalog, {
      $inc: { productCount: -1 },
    });
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
    tabby: {
      payLaterDays: 14,
      plans: { 4: Number((price / 4).toFixed(2)) },
    },
    tamara: {
      payLaterDays: 30,
      plans: {
        3: Number((price / 3).toFixed(2)),
        6: Number((price / 6).toFixed(2)),
      },
    },
  };
});

export default mongoose.model("Product", productSchema);

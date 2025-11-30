import mongoose from "mongoose";
import slugify from "slugify";
import seoSchema from "./seo.model.js";

const productSchema = new mongoose.Schema(
  {
    // Language-specific data
    ar: {
      name: { type: String, required: true, trim: true },
      title: { type: String, required: true, trim: true },
      slug: { type: String, unique: true, index: true },

      description: [
        {
          title: { type: String, trim: true },
          subtitle: { type: String, trim: true },
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

      images: [
        {
          url: String,
          alt: { type: String, trim: true },
          isPrimary: { type: Boolean, default: false },
          order: { type: Number, default: 0 },
        },
      ],

      details: [
        {
          key: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],

      reference: {
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        content: {
          text: { type: String, trim: true },
          file: {
            url: String,
            filename: String,
            fileType: String,
            size: Number,
          },
        },
      },

      seo: seoSchema,
    },

    en: {
      name: { type: String, required: true, trim: true },
      title: { type: String, required: true, trim: true },
      slug: { type: String, unique: true, index: true },

      description: [
        {
          title: { type: String, trim: true },
          subtitle: { type: String, trim: true },
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

      images: [
        {
          url: String,
          alt: { type: String, trim: true },
          isPrimary: { type: Boolean, default: false },
          order: { type: Number, default: 0 },
        },
      ],

      details: [
        {
          key: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],

      reference: {
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        content: {
          text: { type: String, trim: true },
          file: {
            url: String,
            filename: String,
            fileType: String,
            size: Number,
          },
        },
      },

      seo: seoSchema,
    },

    // Language-independent data
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
  if (this.isModified("en.name") || this.isModified("ar.name")) {
    if (this.en?.name) {
      this.en.slug = slugify(this.en.name, { lower: true, strict: true });
    }

    if (this.ar?.name) {
      this.ar.slug = this.ar.name
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

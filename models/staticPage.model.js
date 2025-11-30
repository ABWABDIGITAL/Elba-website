import mongoose from "mongoose";
import slugify from "slugify";

const staticPageSchema = new mongoose.Schema(
  {
    // Page identifier
    pageType: {
      type: String,
      required: true,
      index: true,
      enum: [
        "privacy_policy",
        "terms_conditions",
        "about_us",
        "return_exchange",
        "shipping_delivery",
        "warranty_policy",
        "contact_us",
        "faq",
      ],
    },

    // Language (ar or en) - each page is separate
    language: {
      type: String,
      required: true,
      enum: ["ar", "en"],
      index: true,
    },

    // Content
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },

    // SEO fields
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      metaKeywords: [{ type: String }],
      canonicalUrl: { type: String },
      noindex: { type: Boolean, default: false },
      nofollow: { type: Boolean, default: false },
    },

    // Sections for structured content
    sections: [
      {
        heading: { type: String },
        content: { type: String },
        order: { type: Number, default: 0 },
      },
    ],

    // Additional metadata
    lastReviewedDate: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
    },

    // Publishing
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },

    // Last updated by
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Visibility
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for pageType + language
staticPageSchema.index({ pageType: 1, language: 1 }, { unique: true });
staticPageSchema.index({ pageType: 1, language: 1, isActive: 1 });
staticPageSchema.index({ status: 1, publishedAt: -1 });

// Pre-save middleware
staticPageSchema.pre("save", function (next) {
  // Generate slug if not provided
  if (!this.slug && this.pageType) {
    this.slug = slugify(this.pageType.replace(/_/g, "-"), {
      lower: true,
      strict: true,
    });
  }

  // Auto-fill SEO meta title from title if not provided
  if (!this.seo.metaTitle && this.title) {
    this.seo.metaTitle = this.title.substring(0, 60);
  }

  // Increment version on content update
  if (this.isModified("content") && !this.isNew) {
    this.version += 1;
    this.lastReviewedDate = new Date();
  }

  next();
});

// Statics
staticPageSchema.statics.getByType = function (pageType, language = "ar") {
  return this.findOne({
    pageType,
    language,
    status: "published",
    isActive: true,
  }).lean();
};

staticPageSchema.statics.getAllPublished = function (language = "ar") {
  return this.find({
    language,
    status: "published",
    isActive: true,
  })
    .sort({ pageType: 1 })
    .lean();
};

const StaticPage = mongoose.model("StaticPage", staticPageSchema);

export default StaticPage;

import mongoose from "mongoose";
import slugify from "slugify";

const blogSchema = new mongoose.Schema(
  {
    // Arabic content - complete object
    ar: {
      title: { type: String, required: true, trim: true },
      subtitle: { type: String, required: true, trim: true },
      slug: { type: String, unique: true, sparse: true },
      excerpt: { type: String, required: true, maxlength: 300 },
      content: { type: String, required: true },
      imageAlt: { type: String },
      authorName: { type: String },
      questions: [{ type: String, trim: true }],
      answers: [{ type: String, trim: true }],
      tags: [{ type: String, trim: true }],
      seo: {
        metaTitle: { type: String, maxlength: 160 },
        metaDescription: { type: String, maxlength: 160 },
        metaKeywords: [{ type: String }],
      },
    },

    // English content - complete object
    en: {
      title: { type: String, required: true, trim: true },
      subtitle: { type: String, required: true, trim: true },
      slug: { type: String, unique: true, sparse: true},
      excerpt: { type: String, required: true, maxlength: 300 },
      content: { type: String, required: true },
      imageAlt: { type: String },
      authorName: { type: String },
      questions: [{ type: String, trim: true }],
      answers: [{ type: String, trim: true }],
      tags: [{ type: String, trim: true }],
      seo: {
        metaTitle: { type: String, maxlength: 160 },
        metaDescription: { type: String, maxlength: 160 },
        metaKeywords: [{ type: String }],
      },
    },

    // Shared fields (language-independent)
    featuredImage: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "news",
        "tips",
        "guides",
        "reviews",
        "maintenance",
        "buying_guide",
        "energy_saving",
        "seasonal",
        "company_news",
      ],
      index: true,
    },

    // Related products
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Author
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Publishing
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },

    // Engagement
    views: {
      type: Number,
      default: 0,
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },

    // Reading time (auto-calculated per language)
    readingTime: {
      ar: { type: Number, default: 0 },
      en: { type: Number, default: 0 },
    },

    // SEO shared fields
    seo: {
      canonicalUrl: { type: String },
      ogImage: { type: String },
      structuredData: { type: mongoose.Schema.Types.Mixed },
    },

    // Featured and trending
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredOrder: {
      type: Number,
      default: 0,
    },

    // Comments enabled
    allowComments: {
      type: Boolean,
      default: true,
    },

    // Soft delete
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

// Indexes for performance
blogSchema.index({ "ar.slug": 1, isActive: 1 });
blogSchema.index({ "en.slug": 1, isActive: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1, publishedAt: -1 });
blogSchema.index({ isFeatured: 1, featuredOrder: 1 });
blogSchema.index({ views: -1 });
blogSchema.index({ createdAt: -1 });

// Text search index for both languages
blogSchema.index({
  "ar.title": "text",
  "ar.excerpt": "text",
  "ar.content": "text",
  "en.title": "text",
  "en.excerpt": "text",
  "en.content": "text",
});

// Pre-save middleware
blogSchema.pre("save", function (next) {
  // Generate Arabic slug if not provided
  if (!this.ar.slug && this.ar.title) {
    this.ar.slug = slugify(this.ar.title, { lower: true, strict: true });
  }

  // Generate English slug if not provided
  if (!this.en.slug && this.en.title) {
    this.en.slug = slugify(this.en.title, { lower: true, strict: true });
  }

  // Calculate reading time for Arabic (approx 200 words per minute)
  if (this.ar.content) {
    const wordsAr = this.ar.content.split(/\s+/).length;
    this.readingTime.ar = Math.ceil(wordsAr / 200);
  }

  // Calculate reading time for English
  if (this.en.content) {
    const wordsEn = this.en.content.split(/\s+/).length;
    this.readingTime.en = Math.ceil(wordsEn / 200);
  }

  // Auto-set published date when status changes to published
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto-fill SEO meta title from title if not provided
  if (!this.ar.seo?.metaTitle && this.ar.title) {
    this.ar.seo = this.ar.seo || {};
    this.ar.seo.metaTitle = this.ar.title.substring(0, 60);
  }
  if (!this.en.seo?.metaTitle && this.en.title) {
    this.en.seo = this.en.seo || {};
    this.en.seo.metaTitle = this.en.title.substring(0, 60);
  }

  // Auto-fill SEO meta description from excerpt if not provided
  if (!this.ar.seo?.metaDescription && this.ar.excerpt) {
    this.ar.seo = this.ar.seo || {};
    this.ar.seo.metaDescription = this.ar.excerpt.substring(0, 160);
  }
  if (!this.en.seo?.metaDescription && this.en.excerpt) {
    this.en.seo = this.en.seo || {};
    this.en.seo.metaDescription = this.en.excerpt.substring(0, 160);
  }

  next();
});

// Methods
blogSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

blogSchema.methods.incrementLikes = function () {
  this.likes += 1;
  return this.save();
};

blogSchema.methods.incrementShares = function () {
  this.shares += 1;
  return this.save();
};

// Statics
blogSchema.statics.getFeatured = function (limit = 5) {
  return this.find({
    status: "published",
    isFeatured: true,
    isActive: true,
  })
    .sort({ featuredOrder: 1, publishedAt: -1 })
    .limit(limit)
    .populate("author", "name")
    .populate("relatedProducts", "en.name ar.name en.slug ar.slug images")
    .lean();
};

blogSchema.statics.getTrending = function (limit = 5) {
  return this.find({
    status: "published",
    isActive: true,
  })
    .sort({ views: -1, publishedAt: -1 })
    .limit(limit)
    .populate("author", "name")
    .lean();
};

blogSchema.statics.getRecent = function (limit = 10) {
  return this.find({
    status: "published",
    isActive: true,
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate("author", "name")
    .lean();
};

blogSchema.statics.getByCategory = function (category, limit = 10) {
  return this.find({
    status: "published",
    category,
    isActive: true,
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate("author", "name")
    .lean();
};

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;

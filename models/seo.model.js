import mongoose from "mongoose";
// Reusable constraints
const SEO_CONSTRAINTS = {
  META_TITLE_MAX: 70,
  META_DESC_MAX: 160,
  URL_PATTERN: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/
};

// Social media sub-schema (OpenGraph / Twitter)
const SocialMediaSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 200 },
  image: { type: String, trim: true, match: [SEO_CONSTRAINTS.URL_PATTERN, "Invalid image URL"] },
  type: { type: String, trim: true, default: "website" },
  card: { type: String, trim: true, default: "summary_large_image" } // used for twitter
}, { _id: false });

// Main SEO schema
const seoSchema = new mongoose.Schema({
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [SEO_CONSTRAINTS.META_TITLE_MAX, `Meta title can't exceed ${SEO_CONSTRAINTS.META_TITLE_MAX} chars`],
    default: ""
  },

  metaDescription: {
    type: String,
    trim: true,
    maxlength: [SEO_CONSTRAINTS.META_DESC_MAX, `Meta description can't exceed ${SEO_CONSTRAINTS.META_DESC_MAX} chars`],
    default: ""
  },

  canonicalUrl: {
    type: String,
    trim: true,
    match: [SEO_CONSTRAINTS.URL_PATTERN, "Please provide a valid URL"],
    default: ""
  },

  openGraph: {
    type: SocialMediaSchema,
    default: () => ({})
  },

  twitter: {
    type: SocialMediaSchema,
    default: () => ({})
  },

  robots: {
    noindex: { type: Boolean, default: false },
    nofollow: { type: Boolean, default: false },
    noimageindex: { type: Boolean, default: false }
  },

  keywords: {
    type: [String],
    default: []
  },

  structuredData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🧹 Pre-save: clean keywords array
seoSchema.pre("save", function(next) {
  if (Array.isArray(this.keywords)) {
    this.keywords = [...new Set(this.keywords.map(k => k.trim()).filter(Boolean))];
  } else {
    this.keywords = [];
  }
  next();
});

// 🧠 Virtual robots meta string
seoSchema.virtual("robotsMeta").get(function() {
  const r = this.robots || {};
  const directives = [];
  if (r.noindex) directives.push("noindex");
  if (r.nofollow) directives.push("nofollow");
  if (r.noimageindex) directives.push("noimageindex");
  return directives.length ? directives.join(", ") : "index, follow";
});

export default seoSchema;
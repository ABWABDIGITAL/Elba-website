// models/home.model.js
import mongoose from "mongoose";
import Category from "./category.model.js";
import Product from "./product.model.js";
import seoSchema from "./seo.model.js";
const bannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  redirectUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { _id: false });

const homeConfigSchema = new mongoose.Schema({
  hero: { type: [bannerSchema], default: [] },

  categories: {
    enabled: { type: Boolean, default: true },
    limit: { type: Number, default: 10 },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  },

  bestOffers: {
    enabled: { type: Boolean, default: true },
    limit: { type: Number, default: 50 },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },

  gif: { type: [bannerSchema], default: [] },
  promovideo: { type: [bannerSchema], default: [] },
  popupVideo: { type: [bannerSchema], default: [] },

  offerBanner: [
    {
      url: { type: String, required: true },
      discount: { type: Number, required: true, min: 0, max: 100 },
      discountTitle: { type: String, required: true },
    }
  ],

  Products: {
    enabled: { type: Boolean, default: true },
    limit: { type: Number, default: 100 },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },

  branches: {
    enabled: { type: Boolean, default: true },
    limit: { type: Number, default: 10 },
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
  },

  large: { type: Number, default: 0 },
  small: { type: Number, default: 0 },
  seo: { type: seoSchema, default: () => ({}) }

}, { timestamps: true });
homeConfigSchema.statics.updateCategoryTotals = async function () {
  const result = await Category.aggregate([
    { $group: { _id: "$type", total: { $sum: "$productCount" } } }
  ]);

  let large = 0;
  let small = 0;

  for (const item of result) {
    if (item._id === "Large") large = item.total;
    if (item._id === "Small") small = item.total;
  }

  await this.updateOne({}, { $set: { large, small } }, { upsert: true });

  return { large, small };
};



export default mongoose.model("Home", homeConfigSchema);

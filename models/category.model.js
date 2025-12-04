import mongoose from "mongoose";
import seoSchema from "./seo.model.js";

const localizedCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // SEO for each language
    seo: {
      type: seoSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    ar: { type: localizedCategorySchema, required: true },
    en: { type: localizedCategorySchema, required: true },

    image: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["Large", "Small"],
      default: "Large",
    },

    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);
categorySchema.post("save", async function () {
  const Home = mongoose.model("Home");
  await Home.updateCategoryTotals();
});

categorySchema.post("findOneAndUpdate", async function () {
  const Home = mongoose.model("Home");
  await Home.updateCategoryTotals();
});


export default mongoose.model("Category", categorySchema);

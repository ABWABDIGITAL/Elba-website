import mongoose from "mongoose";
import seoSchema from "./seo.model.js";

const multiLangText = {
  en: { type: String, required: true },
  ar: { type: String, required: true },
};

const bannerSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
  },
  { _id: false }
);

const productRefSchema = new mongoose.Schema(
  {
    title : multiLangText,
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const categoryRef = {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
};

const productSectionSchema =new mongoose.Schema(
  {
    products: [productRefSchema],
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: multiLangText,
  },
  { _id: false }
);

const homeSchema = new mongoose.Schema(
  {
    heroSlider: [bannerSchema],
    categoryShortcuts: [categoryRef],
    bestOffers: productSectionSchema,
    promoBanner1: bannerSchema,
    bestSelling1: productSectionSchema,
    promotionalVideo: videoSchema,
    bestSelling2: productSectionSchema,
    promoBanner2: bannerSchema,
    bestSelling3: productSectionSchema,
    bestSelling4: productSectionSchema,
    bestSelling5: productSectionSchema,
    storeLocator: {
      title: multiLangText,
      locations: [
        {
          name: multiLangText,
          address: multiLangText,
          phone: String,
          coordinates: {
            lat: Number,
            lng: Number,
          },
        },
      ],
    },

    /* 13) FOOTER */
    footer: {
      about: multiLangText,
      socialMedia: [
        {
          platform: String,
          url: String,
          icon: String,
        },
      ],
      paymentMethods: [
        {
          name: String,
          icon: String,
        },
      ],
      qrCode: String,
    },

    /* 14) SEO */
    seo:seoSchema,

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


const Home = mongoose.model("Home", homeSchema);
export default Home;

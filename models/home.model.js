import mongoose from "mongoose";
import seoSchema from "./seo.model.js";
import brancheSchema from "./branches.model.js";

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
const bannerSellerSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    discount:{type:Number,default:0 , required:true},
    discountCollection:{type:String ,default:""},
    
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
  },
  { _id: false }
);

const homeSchema = new mongoose.Schema(
  {
    heroSlider: [bannerSchema],
    categories: [categoryRef],
    bestOffer:[productRefSchema],
    promoVideo:[videoSchema],
    popVideo:[videoSchema],
    gif:[videoSchema],
    products:[productRefSchema],
    banner1:[bannerSchema],
    bannerseller:[bannerSellerSchema],
    braches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    }],
    seo:[seoSchema],
    largeNum:{type:Number , default:0},
    smallNum:{type:Number , default:0},
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


const Home = mongoose.model("Home", homeSchema);
export default Home;

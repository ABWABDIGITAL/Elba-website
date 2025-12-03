// services/home.services.js
import Home from "../models/home.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Branch from "../models/branches.model.js";
import { redis } from "../config/redis.js";
import { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";

const HOME_CACHE_KEY = "home:page";
const HOME_CACHE_TTL = 3600;

function safeParse(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
export const createHomeService = async (payload) => {
  try {
    const existing = await Home.findOne();
    if (existing) throw BadRequest("Home page already exists");

    const created = await Home.create(payload);

    await redis.del(HOME_CACHE_KEY);
    return created;
  } catch (err) {
    throw ServerError("Failed to create home page", err);
  }
};

/* ---------------------------------------
   UPDATE HOME CONFIG
---------------------------------------- */
export const updateHomeService = async (payload) => {
  try {
    const config = await Home.findOne();
    if (!config) throw NotFound("Home config not found");

    Object.assign(config, payload);
    const updated = await config.save();

    await redis.del(HOME_CACHE_KEY);
    return updated;
  } catch (err) {
    throw ServerError("Failed to update home page", err);
  }
};

export const getHomeService = async () => {
  try {
    /* -----------------------------------------------------
       1) TRY TO READ FROM CACHE
    ------------------------------------------------------ */
    const cached = await redis.get(HOME_CACHE_KEY);

    if (cached) {
      const parsed = safeParse(cached);

      if (parsed) {
        return { fromCache: true, data: parsed };
      } else {
        console.warn("CORRUPTED HOME CACHE — RESETTING...");
        await redis.del(HOME_CACHE_KEY);
      }
    }

    /* -----------------------------------------------------
       2) LOAD HOME CONFIG
    ------------------------------------------------------ */
    const config = await Home.findOne()
      .populate("braches", "en.name ar.name en.address ar.address latitude longitude images")
      .populate("categories", "en.name ar.name image productCount type")
      .lean();

    if (!config) throw NotFound("Home not created yet");

    /* -----------------------------------------------------
       3) LOAD PRODUCTS FOR SECTIONS
    ------------------------------------------------------ */

    // --- products[] section
    const productIds = (config.products || []).map(p => p.product);

    const products = await Product.find({ _id: { $in: productIds } })
      .select("en.title ar.title images price finalPrice brand category tags")
      .lean();

    // --- bestOffer[] section
    const bestOfferIds = (config.bestOffer || []).map(p => p.product);

    const bestOfferProducts = await Product.find({
      _id: { $in: bestOfferIds }
    })
      .select("ratingsAverage en.title ar.title en.subTitle ar.subTitle images price finalPrice brand category")
      .lean();

    /* -----------------------------------------------------
       4) bannerseller → fetch products by discount rule
    ------------------------------------------------------ */
    const sellerCollections = {};

    for (const item of config.bannerseller || []) {
      const discount = Number(item.discount) || 0;
      const collectionName = item.discountCollection || "default";

      const matchedProducts = await Product.find({
        discountPercentage: { $gte: discount }
      })
        .select("en.title ar.title images price finalPrice brand category")
        .limit(10)
        .lean();

      sellerCollections[collectionName] = matchedProducts;
    }

    /* -----------------------------------------------------
       5) PREPARE FINAL RESULT
    ------------------------------------------------------ */
    const result = {
      heroSlider: config.heroSlider || [],
      banner1: config.banner1 || [],
      bannerseller: sellerCollections,

      promoVideo: config.promoVideo || [],
      popVideo: config.popVideo || [],
      gif: config.gif || [],

      categories: config.categories || [],
      products: products || [],
      bestOffer: bestOfferProducts || [],
      braches: config.braches || [],
      seo: config.seo || [],

      largeNum: config.largeNum ?? 0,
      smallNum: config.smallNum ?? 0
    };

    /* -----------------------------------------------------
       6) SAVE INTO CACHE (SAFE)
    ------------------------------------------------------ */
    await redis.set(HOME_CACHE_KEY, JSON.stringify(result), { ex: TTL });

    return { fromCache: false, data: result };
  } catch (err) {
    console.error("HOME SERVICE ERROR:", err);
    throw ServerError("Failed to fetch home", err);
  }
};

// services/home.services.js

export const uploadHomeMediaService = async (files) => {
  const config = await Home.findOne();
  if (!config) throw NotFound("Home page not created yet");

  const updatedFields = {};

  const mapFiles = (field) => {
    if (!files[field]) return;
    updatedFields[field] = files[field].map((file) => ({
      url: file.location || file.path,
    }));
  };

  // Apply mapping for each section
  mapFiles("heroSlider");
  mapFiles("promoVideo");
  mapFiles("popVideo");
  mapFiles("gif");
  mapFiles("banner1");

  // bannerseller has extra fields from body? (discount, discountCollection)
  if (files["bannerseller"]) {
    updatedFields["bannerseller"] = files["bannerseller"].map((file, i) => ({
      url: file.location || file.path,
      discount: Number(files?.discount?.[i] ?? 0),
      discountCollection: files?.discountCollection?.[i] ?? "",
    }));
  }

  Object.assign(config, updatedFields);
  await config.save();

  return { OK: true, updated: updatedFields };
};


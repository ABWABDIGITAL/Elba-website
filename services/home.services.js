// services/home.services.js
import Home from "../models/home.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Branch from "../models/branches.model.js";
import { redis } from "../config/redis.js";
import { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";

const HOME_CACHE_KEY = "home:page";
const HOME_CACHE_TTL = 3600;

/* ---------------------------------------
   CREATE HOME (Once)
---------------------------------------- */
export const createHomeService = async (payload) => {
  try {
    const existing = await Home.findOne();
    if (existing) throw BadRequest("Home page already exists");

    // compute totals BEFORE create
    const totals = await Home.updateCategoryTotals();
    payload.large = totals.large;
    payload.small = totals.small;

    const created = await Home.create(payload);

    await redis.del(HOME_CACHE_KEY);
    return created;
  } catch (err) {
    throw ServerError("Failed to create home page", err);
  }
};

export const updateHomeService = async (payload) => {
  try {
    const config = await Home.findOne();
    if (!config) throw NotFound("Home config not found");

    // Only update allowed fields
    const allowedFields = [
      "hero",
      "categories",
      "bestOffers",
      "gif",
      "promovideo",
      "popupVideo",
      "offerBanner",
      "Products",
      "branches",
      "seo"
    ];

    for (const key of allowedFields) {
      if (payload[key] !== undefined) {
        config[key] = payload[key];
      }
    }

    // Update product category totals
    const totals = await Home.updateCategoryTotals();
    config.large = totals.large;
    config.small = totals.small;

    const updated = await config.save();
    await redis.del(HOME_CACHE_KEY);

    return updated;
  } catch (err) {
    throw ServerError("Failed to update home page", err);
  }
};

export const getHomeService = async () => {
  try {
    const cached = await redis.get(HOME_CACHE_KEY);
    if (cached) return { fromCache: true, data: JSON.parse(cached) };
  } catch (err) {
    console.error("Redis GET error:", err);
  }

  const config = await Home.findOne().lean();
  if (!config) throw NotFound("Home page not created yet");

  let result = {
    hero: config.hero,
    gif: config.gif,
    promovideo: config.promovideo,
    popupVideo: config.popupVideo,
    offerBanner: config.offerBanner,
    large: config.large,
    small: config.small,
    seo: config.seo,
  };

  /* ---------------- CATEGORIES ---------------- */
  if (config.categories?.enabled) {
    const { limit, categoryIds } = config.categories;

    result.categories =
      categoryIds?.length > 0
        ? await Category.find({ _id: { $in: categoryIds } })
            .limit(limit)
            .select("ar.name en.name slug image productCount")
            .lean()
        : await Category.find({})
            .limit(limit)
            .select("ar.name en.name slug image productCount")
            .lean();
  } else result.categories = [];

  /* ---------------- BEST OFFERS ---------------- */
  if (config.bestOffers?.enabled) {
    const { limit, productIds } = config.bestOffers;

    result.bestOffers =
      productIds?.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .limit(limit)
            .select(
              "ar.title en.title  ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo") 
        : await Product.find({})
            .sort({ discountPercentage: -1 })
            .limit(limit)
            .select(
              "ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo") 
  } else result.bestOffers = [];

  /* ---------------- PRODUCTS SECTION ---------------- */
  if (config.Products?.enabled) {
    const { limit, productIds } = config.Products;

    result.products =
      productIds?.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .limit(limit)
            .select(
              "ar.title en.title slug price  finalPrice images brand category ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo") 
            .populate("category", "en.name ar.name type")
        : await Product.find({})
            .sort("-salesCount -ratingsQuantity -views")
            .limit(limit)
            .select(
              "ar.title en.title slug price finalPrice images brand category ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo") 
            .populate("category", "en.name ar.name type")
  } else result.products = [];

  /* ---------------- BRANCHES ---------------- */
if (config.branches?.enabled) {
  const { limit, branchIds } = config.branches;

  // Build query without executing it
  const branchQuery =
    branchIds?.length > 0
      ? Branch.find({ _id: { $in: branchIds } })
      : Branch.find({});

  // Execute with select + limit
  result.branches = await branchQuery
    .limit(limit)
    .select("ar.name en.name ar.address en.address images longitude latitude")
    .lean();
} else {
  result.branches = [];
}


  /* ---------------- SAVE CACHE ---------------- */
  try {
    await redis.set(HOME_CACHE_KEY, JSON.stringify(result), {
      ex: HOME_CACHE_TTL,
    });
  } catch (err) {
    console.error("Redis SET error:", err);
  }

  return { fromCache: false, data: result };
};

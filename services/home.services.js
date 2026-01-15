// src/services/home.services.js
import Home from "../models/home.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Branch from "../models/branches.model.js";
import { RedisHelper } from "../config/redis.js";
import { BadRequest, NotFound } from "../utlis/apiError.js";

const HOME_CACHE_KEY = "home:page";
const HOME_CACHE_TTL = 3600;
const dedupeById = (arr = []) =>
  Array.from(
    new Map(arr.map(item => [item._id.toString(), item])).values()
  );
export const createHomeService = async (payload) => {
  try {
    const existing = await Home.findOne();
    if (existing) throw BadRequest("Home page already exists");

    // compute totals BEFORE create
    const totals = await Home.updateCategoryTotals();
    payload.large = totals.large;
    payload.small = totals.small;
    payload.offerProducts = totals.offerProducts;

    const created = await Home.create(payload);

    await RedisHelper.del(HOME_CACHE_KEY);
    return created;
  } catch (err) {
    throw new Error("Failed to create home page: " + err.message);
  }
};


/* ---------------------------------------
   UPDATE HOME
---------------------------------------- */
export const updateHomeService = async (payload) => {
  try {
    const config = await Home.findOne();
    if (!config) throw NotFound("Home config not found");

    // Allowed fields ONLY
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

    // Apply payload updates
    for (const key of allowedFields) {
      if (payload[key] !== undefined) {
        config[key] = payload[key];
      }
    }

    // Recompute category/product totals
    const totals = await Home.updateCategoryTotals();
    config.large = totals.large;
    config.small = totals.small;
    config.offerProducts = totals.offerProducts;

    // Save updated config
    const updated = await config.save();

    await RedisHelper.del(HOME_CACHE_KEY);
    return updated;

  } catch (err) {
    throw new Error("Failed to update home page: " + err.message);
  }
};


export const getHomeService = async () => {
  /* ---------------- GET CACHE ---------------- */
  try {
    const cached = await RedisHelper.get(HOME_CACHE_KEY);
    if (cached) {
      return {
        fromCache: true,
        data: typeof cached === "string" ? JSON.parse(cached) : cached,
      };
    }
  } catch (err) {
    console.error("Redis GET error:", err);
  }

  /* ---------------- DB QUERY ---------------- */
  const config = await Home.findOne().lean();
  if (!config) throw NotFound("Home page not created yet");

  const result = {
    seo: config.seo,
    hero: config.hero,
    gif: config.gif,
    promovideo: config.promovideo,
    popupVideo: config.popupVideo,
    offerBanner: config.offerBanner,
    large: config.large,
    small: config.small,
    offerProducts: config.offerProducts,
  };

  /* ---------------- CATEGORIES ---------------- */
  if (config.categories?.enabled) {
    const { limit, categoryIds } = config.categories;

    result.categories =
      categoryIds?.length > 0
        ? await Category.find({ _id: { $in: categoryIds } })
            .limit(limit)
            .select("ar.name en.name en.slug image productCount")
        : await Category.find({})
            .limit(limit)
            .select("ar.name en.name en.slug image productCount");
  } else {
    result.categories = [];
  }

  /* ---------------- BEST OFFERS ---------------- */
  if (config.bestOffers?.enabled) {
    const { limit, productIds } = config.bestOffers;

    result.bestOffers =
      productIds?.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .limit(limit)
            .select(
              "ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
        : await Product.find({})
            .sort({ discountPercentage: -1 })
            .limit(limit)
            .select(
              "ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
  } else {
    result.bestOffers = [];
  }

  /* ---------------- PRODUCTS ---------------- */
  if (config.Products?.enabled) {
    const { limit, productIds } = config.Products;

    result.products =
      productIds?.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .limit(limit)
            .select(
              "ar.title en.title slug price discountPrice discountPercentage finalPrice images brand category ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
            .populate("category", "en.name ar.name type")
        : await Product.find({})
            .sort("-salesCount -ratingsQuantity -views")
            .limit(limit)
            .select(
              "ar.title en.title slug price discountPrice discountPercentage finalPrice images brand category ratingsAverage tags"
            )
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
            .populate("category", "en.name ar.name type")
  } else {
    result.products = [];
  }

  /* ---------------- BRANCHES ---------------- */
  if (config.branches?.enabled) {
    const { limit, branchIds } = config.branches;

    const branchQuery =
      branchIds?.length > 0
        ? Branch.find({ _id: { $in: branchIds } })
        : Branch.find({});

    result.branches = await branchQuery
      .limit(limit)
      .select("ar.name en.name ar.address en.address images longitude latitude")
  } else {
    result.branches = [];
  }

  /* ---------------- DEDUPE (🔥 IMPORTANT) ---------------- */
  result.products = dedupeById(result.products);
  result.bestOffers = dedupeById(result.bestOffers);

  /* ---------------- SAVE CACHE ---------------- */
  try {
    await RedisHelper.set(HOME_CACHE_KEY, JSON.stringify(result), {
      ex: HOME_CACHE_TTL || 60,
    });
  } catch (err) {
    console.error("Redis SET error:", err);
  }

  return { fromCache: false, data: result };
};
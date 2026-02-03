// src/services/home.services.js
import mongoose from "mongoose";
import Home from "../models/home.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Branch from "../models/branches.model.js";
import { RedisHelper } from "../config/redis.js";
import { BadRequest, NotFound } from "../utlis/apiError.js";

const HOME_CACHE_KEY = "home:page";
const HOME_CACHE_TTL = 3600;

/* ---------- URL PREFIX HELPER ---------- */
const prefixUrl = (filePath) => {
  if (!filePath) return filePath;
  if (filePath.startsWith("http")) return filePath;
  const base = process.env.BASE_URL || "";
  return `${base}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
};
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

    await refreshHomeCache();
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

    await refreshHomeCache();
    return updated;

  } catch (err) {
    throw new Error("Failed to update home page: " + err.message);
  }
};


/* ---------------------------------------
   GET HOME FOR EDIT (RAW CONFIG — NO CACHE)
---------------------------------------- */
export const getHomeForEditService = async () => {
  // Load raw DB data to check which banners are missing _id in MongoDB
  const rawDoc = await Home.findOne().select("-seo -__v").lean();
  if (!rawDoc) throw NotFound("Home page not created yet");

  const BANNER_FIELDS = ["hero", "gif", "promovideo", "popupVideo"];
  const hasMissingIds = BANNER_FIELDS.some(field =>
    (rawDoc[field] || []).some(b => !b._id)
  );

  // If any banners lack a persisted _id, force-save so Mongoose writes the auto-generated ones
  let config;
  if (hasMissingIds) {
    config = await Home.findOne().select("-seo -__v");
    for (const field of BANNER_FIELDS) {
      config.markModified(field);
    }
    await config.save();
    await refreshHomeCache();
  } else {
    config = await Home.findOne().select("-seo -__v");
  }

  const raw = config.toObject();

  const prefixBanners = (arr) =>
    (arr || []).map(b => ({ ...b, imageUrl: prefixUrl(b.imageUrl) }));

  const result = {
    id: raw._id,
    hero: prefixBanners(raw.hero),
    gif: prefixBanners(raw.gif),
    promovideo: prefixBanners(raw.promovideo),
    popupVideo: prefixBanners(raw.popupVideo),
    offerBanner: (raw.offerBanner || []).map(b => ({ ...b, url: prefixUrl(b.url) })),
    large: raw.large,
    small: raw.small,
    offerProducts: raw.offerProducts,
  };

  /* ---------- CATEGORIES ---------- */
  result.categories = {
    enabled: raw.categories?.enabled,
    limit: raw.categories?.limit,
    categoryIds: raw.categories?.categoryIds,
    data: raw.categories?.categoryIds?.length > 0
      ? await Category.find({ _id: { $in: raw.categories.categoryIds } })
          .limit(raw.categories.limit)
          .select("ar.name en.name en.slug image productCount")
          .lean()
      : await Category.find({})
          .limit(raw.categories?.limit || 10)
          .select("ar.name en.name en.slug image productCount")
          .lean(),
  };

  /* ---------- BEST OFFERS ---------- */
  result.bestOffers = {
    enabled: raw.bestOffers?.enabled,
    limit: raw.bestOffers?.limit,
    productIds: raw.bestOffers?.productIds,
    data: raw.bestOffers?.productIds?.length > 0
      ? await Product.find({ _id: { $in: raw.bestOffers.productIds } })
          .limit(raw.bestOffers.limit)
          .select("ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags")
          .populate("brand", "en.name en.slug ar.name ar.slug logo")
          .lean()
      : await Product.find({})
          .sort({ discountPercentage: -1 })
          .limit(raw.bestOffers?.limit || 50)
          .select("ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags")
          .populate("brand", "en.name en.slug ar.name ar.slug logo")
          .lean(),
  };

  /* ---------- PRODUCTS ---------- */
  result.products = {
    enabled: raw.Products?.enabled,
    limit: raw.Products?.limit,
    productIds: raw.Products?.productIds,
    data: raw.Products?.productIds?.length > 0
      ? await Product.find({ _id: { $in: raw.Products.productIds } })
          .limit(raw.Products.limit)
          .select("ar.title en.title slug price discountPrice discountPercentage finalPrice images brand category ratingsAverage tags")
          .populate("brand", "en.name en.slug ar.name ar.slug logo")
          .populate("category", "en.name ar.name type")
          .lean()
      : await Product.find({})
          .sort("-salesCount -ratingsQuantity -views")
          .limit(raw.Products?.limit || 100)
          .select("ar.title en.title slug price discountPrice discountPercentage finalPrice images brand category ratingsAverage tags")
          .populate("brand", "en.name en.slug ar.name ar.slug logo")
          .populate("category", "en.name ar.name type")
          .lean(),
  };

  /* ---------- BRANCHES ---------- */
  result.branches = {
    enabled: raw.branches?.enabled,
    limit: raw.branches?.limit,
    branchIds: raw.branches?.branchIds,
    data: raw.branches?.branchIds?.length > 0
      ? await Branch.find({ _id: { $in: raw.branches.branchIds } })
          .limit(raw.branches.limit)
          .select("ar.name en.name ar.address en.address images longitude latitude")
          .lean()
      : await Branch.find({})
          .limit(raw.branches?.limit || 10)
          .select("ar.name en.name ar.address en.address images longitude latitude")
          .lean(),
  };

  /* ---------- PREFIX IMAGE URLs IN POPULATED DATA ---------- */
  result.categories.data = (result.categories.data || []).map(c => ({
    ...c,
    image: prefixUrl(c.image),
  }));

  const prefixProductImgs = (arr) =>
    (arr || []).map(p => ({
      ...p,
      images: (p.images || []).map(img => ({ ...img, url: prefixUrl(img.url) })),
      ...(p.brand && { brand: { ...p.brand, logo: prefixUrl(p.brand.logo) } }),
    }));

  result.bestOffers.data = prefixProductImgs(result.bestOffers.data);
  result.products.data = prefixProductImgs(result.products.data);

  result.branches.data = (result.branches.data || []).map(b => ({
    ...b,
    images: (b.images || []).map(img => ({ ...img, url: prefixUrl(img.url) })),
  }));

  return result;
};

/* ---------------------------------------
   BUILD HOME DATA FROM DB (shared logic)
---------------------------------------- */
const buildHomeData = async () => {
  const config = await Home.findOne().lean();
  if (!config) return null;

  const activeBanners = (arr = []) => arr.filter(b => b.isActive !== false);

  const result = {
    seo: config.seo,
    hero: activeBanners(config.hero),
    gif: activeBanners(config.gif),
    promovideo: activeBanners(config.promovideo),
    popupVideo: activeBanners(config.popupVideo),
    offerBanner: config.offerBanner,
    large: config.large,
    small: config.small,
    offerProducts: config.offerProducts,
  };

  /* ---------- CATEGORIES ---------- */
  if (config.categories?.enabled) {
    const { limit, categoryIds } = config.categories;
    result.categories =
      categoryIds?.length > 0
        ? await Category.find({ _id: { $in: categoryIds } })
            .limit(limit)
            .select("ar.name en.name en.slug image productCount")
            .lean()
        : await Category.find({})
            .limit(limit)
            .select("ar.name en.name en.slug image productCount")
            .lean();
  } else {
    result.categories = [];
  }

  /* ---------- BEST OFFERS ---------- */
  if (config.bestOffers?.enabled) {
    const { limit, productIds } = config.bestOffers;
    result.bestOffers =
      productIds?.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .limit(limit)
            .select("ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags")
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
            .lean()
        : await Product.find({})
            .sort({ discountPercentage: -1 })
            .limit(limit)
            .select("ar.title en.title ar.subTitle en.subTitle slug price discountPrice discountPercentage finalPrice images brand ratingsAverage tags")
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
            .lean();
  } else {
    result.bestOffers = [];
  }

  /* ---------- PRODUCTS ---------- */
  if (config.Products?.enabled) {
    const { limit, productIds } = config.Products;
    result.products =
      productIds?.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .limit(limit)
            .select("ar.title en.title slug price discountPrice discountPercentage finalPrice images brand category ratingsAverage tags")
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
            .populate("category", "en.name ar.name type")
            .lean()
        : await Product.find({})
            .sort("-salesCount -ratingsQuantity -views")
            .limit(limit)
            .select("ar.title en.title slug price discountPrice discountPercentage finalPrice images brand category ratingsAverage tags")
            .populate("brand", "en.name en.slug ar.name ar.slug logo")
            .populate("category", "en.name ar.name type")
            .lean();
  } else {
    result.products = [];
  }

  /* ---------- BRANCHES ---------- */
  if (config.branches?.enabled) {
    const { limit, branchIds } = config.branches;
    const branchQuery =
      branchIds?.length > 0
        ? Branch.find({ _id: { $in: branchIds } })
        : Branch.find({});
    result.branches = await branchQuery
      .limit(limit)
      .select("ar.name en.name ar.address en.address images longitude latitude")
      .lean();
  } else {
    result.branches = [];
  }

  /* ---------- DEDUPE ---------- */
  result.products = dedupeById(result.products);
  result.bestOffers = dedupeById(result.bestOffers);

  /* ---------- PREFIX ALL URLs WITH BASE_URL ---------- */
  const prefixBanners = (arr) =>
    arr.map(b => ({ ...b, imageUrl: prefixUrl(b.imageUrl) }));

  result.hero = prefixBanners(result.hero);
  result.gif = prefixBanners(result.gif);
  result.promovideo = prefixBanners(result.promovideo);
  result.popupVideo = prefixBanners(result.popupVideo);

  if (result.offerBanner) {
    result.offerBanner = result.offerBanner.map(b => ({ ...b, url: prefixUrl(b.url) }));
  }

  result.categories = result.categories.map(c => ({
    ...c,
    image: prefixUrl(c.image),
  }));

  const prefixProductImages = (products) =>
    products.map(p => ({
      ...p,
      images: (p.images || []).map(img => ({ ...img, url: prefixUrl(img.url) })),
      ...(p.brand && { brand: { ...p.brand, logo: prefixUrl(p.brand.logo) } }),
    }));

  result.products = prefixProductImages(result.products);
  result.bestOffers = prefixProductImages(result.bestOffers);

  result.branches = result.branches.map(b => ({
    ...b,
    images: (b.images || []).map(img => ({ ...img, url: prefixUrl(img.url) })),
  }));

  return result;
};

/* ---------------------------------------
   REFRESH HOME CACHE (rebuild & set)
---------------------------------------- */
const refreshHomeCache = async () => {
  try {
    const data = await buildHomeData();
    if (data) {
      await RedisHelper.set(HOME_CACHE_KEY, JSON.stringify(data), {
        ex: HOME_CACHE_TTL || 60,
      });
    }
  } catch (err) {
    console.error("Redis refresh error:", err);
  }
};

/* ---------------------------------------
   CLEAR + REFRESH HOME CACHE (admin)
---------------------------------------- */
export const clearHomeCacheService = async () => {
  await refreshHomeCache();
  return { refreshed: true };
};

/* ---------------------------------------
   UPDATE SINGLE BANNER
---------------------------------------- */
export const updateBannerService = async (field, bannerId, updates) => {
  const BANNER_FIELDS = ["hero", "gif", "promovideo", "popupVideo"];
  if (!BANNER_FIELDS.includes(field)) {
    throw BadRequest(`Invalid banner field: ${field}`);
  }

  const config = await Home.findOne();
  if (!config) throw NotFound("Home config not found");

  const banner = config[field].id(bannerId);
  if (!banner) throw NotFound("Banner not found");

  if (updates.imageUrl !== undefined) banner.imageUrl = updates.imageUrl;
  if (updates.redirectUrl !== undefined) banner.redirectUrl = updates.redirectUrl;
  if (updates.sortOrder !== undefined) banner.sortOrder = updates.sortOrder;
  if (updates.isActive !== undefined) banner.isActive = updates.isActive;

  await config.save();
  await refreshHomeCache();

  const obj = banner.toObject();
  obj.imageUrl = prefixUrl(obj.imageUrl);
  return obj;
};

/* ---------------------------------------
   ADD SINGLE BANNER
---------------------------------------- */
export const addBannerService = async (field, bannerData) => {
  const BANNER_FIELDS = ["hero", "gif", "promovideo", "popupVideo","offerBanner"];
  if (!BANNER_FIELDS.includes(field)) {
    throw BadRequest(`Invalid banner field: ${field}`);
  }

  const config = await Home.findOne();
  if (!config) throw NotFound("Home config not found");

  config[field].push(bannerData);
  await config.save();
  await refreshHomeCache();

  const added = config[field][config[field].length - 1];
  const obj = added.toObject();
  obj.imageUrl = prefixUrl(obj.imageUrl);
  return obj;
};

/* ---------------------------------------
   DELETE SINGLE BANNER
---------------------------------------- */
export const deleteBannerService = async (field, bannerId) => {
  const BANNER_FIELDS = ["hero", "gif", "promovideo", "popupVideo", "offerBanner"];
  if (!BANNER_FIELDS.includes(field)) {
    throw BadRequest(`Invalid banner field: ${field}`);
  }

  const config = await Home.findOne();
  if (!config) throw NotFound("Home config not found");

  const banner = config[field].id(bannerId);
  if (!banner) throw NotFound("Banner not found");

  banner.deleteOne();
  await config.save();
  await refreshHomeCache();

  return { deleted: true };
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

  /* ---------------- BUILD FROM DB & CACHE ---------------- */
  const result = await buildHomeData();
  if (!result) throw NotFound("Home page not created yet");

  try {
    await RedisHelper.set(HOME_CACHE_KEY, JSON.stringify(result), {
      ex: HOME_CACHE_TTL || 60,
    });
  } catch (err) {
    console.error("Redis SET error:", err);
  }

  return { fromCache: false, data: result };
};
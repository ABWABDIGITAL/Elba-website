import Home from "../models/home.model.js";
import { redis } from "../config/redis.js";
import { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";

const HOME_CACHE_KEY = "home:page";

export const createHomeService = async (payload) => {
  try {
    const existing = await Home.findOne();
    if (existing) throw BadRequest("Home page already exists");

    const created = await Home.create(payload);

    // invalidate cache
    await redis.del(HOME_CACHE_KEY);

    return created;
  } catch (err) {
    throw ServerError("Failed to create home page", err);
  }
};

export const getHomeService = async () => {
  // try {
  //   const cached = await redis.get(HOME_CACHE_KEY);
  //   if (cached) {
  //     return {
  //       fromCache: true,
  //       data: JSON.parse(cached),
  //     };
  //   }
  // } catch (err) {
  //   console.error("Redis GET error:", err);
  // }

  const home = await Home.findOne()
    .populate({
      path: "categoryShortcuts",
      select: "name slug image",
    })
    .populate({
      path: "bestOffers.products.product",
      select: "name slug price discountPrice finalPrice images brand rating",
    })
    .populate({
      path: "bestSelling1.products.product",
      select: "name slug price discountPrice finalPrice images brand rating",
    })
    .populate({
      path: "bestSelling2.products.product",
      select: "name slug price discountPrice finalPrice images brand rating",
    })
    .populate({
      path: "bestSelling3.products.product",
      select: "name slug price discountPrice finalPrice images brand rating",
    })
    .populate({
      path: "bestSelling4.products.product",
      select: "name slug price discountPrice finalPrice images brand rating",
    })
    .populate({
      path: "bestSelling5.products.product",
      select: "name slug price discountPrice finalPrice images brand rating",
    })

    .lean();

  if (!home) throw NotFound("Home page not created yet");

  try {
    await redis.set(HOME_CACHE_KEY, JSON.stringify(home));
  } catch (err) {
    console.error("Redis SET error:", err);
  }

  return {
    fromCache: false,
    data: home,
  };
};

export const updateHomeService = async (id, payload) => {
  try {
    const updated = await Home.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!updated) throw NotFound("Home page not found");

    // clear cache
    await redis.del(HOME_CACHE_KEY);

    return updated;
  } catch (err) {
    throw ServerError("Failed to update home page", err);
  }
};

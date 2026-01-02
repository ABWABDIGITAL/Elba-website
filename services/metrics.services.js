// services/metrics.service.js

import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { redis } from "../config/redis.js";

const METRICS_CACHE_PREFIX = "metrics:";
const CACHE_TTL = 300; // 5 minutes

// ============================================
// DATE HELPERS
// ============================================

const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return { start: today, end: now };
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    case "7d":
    case "week":
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: now };
    case "30d":
    case "month":
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start: monthAgo, end: now };
    case "90d":
    case "quarter":
      const quarterAgo = new Date(today);
      quarterAgo.setDate(quarterAgo.getDate() - 90);
      return { start: quarterAgo, end: now };
    case "365d":
    case "year":
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { start: yearAgo, end: now };
    case "this_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: now };
    case "last_month":
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfLastMonth, end: endOfLastMonth };
    default:
      return { start: today, end: now };
  }
};

// ============================================
// REVENUE METRICS
// ============================================

export const getRevenueMetrics = async (period = "30d") => {
  const cacheKey = `${METRICS_CACHE_PREFIX}revenue:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { start, end } = getDateRange(period);

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: { $nin: ["cancelled", "refunded"] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: "$totalAmount" },
        totalItems: { $sum: { $size: { $ifNull: ["$items", []] } } },
        totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
      },
    },
  ]);

  const metrics = result[0] || {
    totalRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
    totalItems: 0,
    totalDiscount: 0,
  };

  await redis.set(cacheKey, JSON.stringify(metrics), { ex: CACHE_TTL });
  return metrics;
};

export const getRevenueTrend = async (period = "30d", granularity = "daily") => {
  const cacheKey = `${METRICS_CACHE_PREFIX}revenue_trend:${period}:${granularity}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { start, end } = getDateRange(period);

  const groupBy =
    granularity === "hourly"
      ? {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          hour: { $hour: "$createdAt" },
        }
      : granularity === "weekly"
      ? {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        }
      : {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: { $nin: ["cancelled", "refunded"] },
      },
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: "$totalAmount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
  ]);

  await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
  return result;
};

export const getRevenueBySource = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  // Get orders with their attribution from events
  const result = await Event.aggregate([
    {
      $match: {
        eventName: "order_placed",
        timestamp: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$attribution.source",
        revenue: { $sum: "$order.totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return result;
};

// ============================================
// CONVERSION METRICS
// ============================================

export const getConversionMetrics = async (period = "30d") => {
  const cacheKey = `${METRICS_CACHE_PREFIX}conversion:${period}`;
  
  try {
    // Try to get cached data
    const cached = await redis.get(cacheKey);
    if (cached) {
      // If cached data exists and is a string, parse it
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      }
      // If it's already an object, return it directly
      return cached;
    }

    const { start, end } = getDateRange(period);

    const [sessions, productViews, cartAdds, checkouts, orders] = await Promise.all([
      Event.distinct("sessionId", {
        eventName: "session_start",
        timestamp: { $gte: start, $lte: end },
      }),
      Event.distinct("sessionId", {
        eventName: "product_viewed",
        timestamp: { $gte: start, $lte: end },
      }),
      Event.distinct("sessionId", {
        eventName: "product_added_to_cart",
        timestamp: { $gte: start, $lte: end },
      }),
      Event.distinct("sessionId", {
        eventName: "checkout_started",
        timestamp: { $gte: start, $lte: end },
      }),
      Event.distinct("sessionId", {
        eventName: "order_placed",
        timestamp: { $gte: start, $lte: end },
      }),
    ]);

    const metrics = {
      sessions: sessions.length,
      productViews: productViews.length,
      cartAdds: cartAdds.length,
      checkouts: checkouts.length,
      orders: orders.length,
      productViewRate: sessions.length > 0 ? parseFloat(((productViews.length / sessions.length) * 100).toFixed(2)) : 0,
      addToCartRate: productViews.length > 0 ? parseFloat(((cartAdds.length / productViews.length) * 100).toFixed(2)) : 0,
      checkoutRate: cartAdds.length > 0 ? parseFloat(((checkouts.length / cartAdds.length) * 100).toFixed(2)) : 0,
      purchaseRate: checkouts.length > 0 ? parseFloat(((orders.length / checkouts.length) * 100).toFixed(2)) : 0,
      overallConversionRate: sessions.length > 0 ? parseFloat(((orders.length / sessions.length) * 100).toFixed(2)) : 0,
    };

    // Cache the result with proper error handling
    try {
      await redis.set(cacheKey, JSON.stringify(metrics), { ex: CACHE_TTL });
    } catch (cacheError) {
      console.error('Error caching conversion metrics:', cacheError);
    }

    return metrics;
  } catch (error) {
    console.error('Error in getConversionMetrics:', error);
    // Return default values in case of error
    return {
      sessions: 0,
      productViews: 0,
      cartAdds: 0,
      checkouts: 0,
      orders: 0,
      productViewRate: 0,
      addToCartRate: 0,
      checkoutRate: 0,
      purchaseRate: 0,
      overallConversionRate: 0,
    };
  }
};

export const getFunnelData = async (period = "30d") => {
  const cacheKey = `${METRICS_CACHE_PREFIX}funnel:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { start, end } = getDateRange(period);

  const stages = [
    { name: "Sessions", event: "session_start" },
    { name: "Product Views", event: "product_viewed" },
    { name: "Add to Cart", event: "product_added_to_cart" },
    { name: "Checkout Started", event: "checkout_started" },
    { name: "Order Placed", event: "order_placed" },
  ];

  const results = await Promise.all(
    stages.map((stage) =>
      Event.distinct("sessionId", {
        eventName: stage.event,
        timestamp: { $gte: start, $lte: end },
      }).then((sessions) => ({
        stage: stage.name,
        count: sessions.length,
      }))
    )
  );

  // Calculate conversion rates
  const funnel = results.map((stage, index) => {
    const prevCount = index > 0 ? results[index - 1].count : stage.count;
    return {
      ...stage,
      conversionFromPrevious:
        prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(2) : 0,
      overallConversion:
        results[0].count > 0 ? ((stage.count / results[0].count) * 100).toFixed(2) : 0,
      dropOff: index > 0 ? prevCount - stage.count : 0,
    };
  });

  await redis.set(cacheKey, JSON.stringify(funnel), { ex: CACHE_TTL });
  return funnel;
};

// ============================================
// CART ABANDONMENT
// ============================================

export const getCartAbandonmentRate = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const [cartsCreated, ordersPlaced] = await Promise.all([
    Event.distinct("sessionId", {
      eventName: "product_added_to_cart",
      timestamp: { $gte: start, $lte: end },
    }),
    Event.distinct("sessionId", {
      eventName: "order_placed",
      timestamp: { $gte: start, $lte: end },
    }),
  ]);

  const abandoned = cartsCreated.filter((s) => !ordersPlaced.includes(s)).length;
  const rate = cartsCreated.length > 0 ? (abandoned / cartsCreated.length) * 100 : 0;

  return {
    cartsCreated: cartsCreated.length,
    ordersPlaced: ordersPlaced.length,
    abandoned,
    abandonmentRate: rate.toFixed(2),
  };
};

export const getAbandonedCarts = async (limit = 50, minValue = 0) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get sessions with cart activity but no purchase
  const cartSessions = await Event.aggregate([
    {
      $match: {
        eventName: "product_added_to_cart",
        timestamp: { $gte: oneDayAgo, $lte: oneHourAgo },
      },
    },
    {
      $group: {
        _id: "$sessionId",
        userId: { $first: "$userId" },
        lastActivity: { $max: "$timestamp" },
        cartValue: { $max: "$cart.totalValue" },
        itemCount: { $max: "$cart.itemCount" },
      },
    },
    {
      $match: {
        cartValue: { $gte: minValue },
      },
    },
    {
      $lookup: {
        from: "events",
        let: { sessionId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$sessionId", "$$sessionId"] },
                  { $eq: ["$eventName", "order_placed"] },
                ],
              },
            },
          },
        ],
        as: "orders",
      },
    },
    {
      $match: {
        orders: { $size: 0 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        sessionId: "$_id",
        userId: 1,
        email: "$user.email",
        phone: "$user.phone",
        firstName: "$user.firstName",
        lastActivity: 1,
        cartValue: 1,
        itemCount: 1,
        hoursSinceActivity: {
          $divide: [{ $subtract: [new Date(), "$lastActivity"] }, 3600000],
        },
      },
    },
    { $sort: { cartValue: -1 } },
    { $limit: limit },
  ]);

  return cartSessions;
};

// ============================================
// USER METRICS
// ============================================

export const getActiveUsers = async (period = "DAU") => {
  const periods = {
    DAU: 1,
    WAU: 7,
    MAU: 30,
  };

  const days = periods[period] || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const meaningfulActions = [
    "product_viewed",
    "product_added_to_cart",
    "search_performed",
    "order_placed",
    "checkout_started",
  ];

  const result = await Event.distinct("userId", {
    timestamp: { $gte: startDate },
    eventName: { $in: meaningfulActions },
    userId: { $ne: null },
  });

  return result.length;
};

export const getUserGrowth = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const result = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  return result;
};

export const getUserRetention = async (cohortPeriod = "week", periods = 8) => {
  const cacheKey = `${METRICS_CACHE_PREFIX}retention:${cohortPeriod}:${periods}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Get cohorts (users grouped by registration week/month)
  const periodDays = cohortPeriod === "week" ? 7 : 30;
  const now = new Date();
  const cohortStart = new Date();
  cohortStart.setDate(cohortStart.getDate() - periodDays * periods);

  const cohorts = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: cohortStart },
      },
    },
    {
      $addFields: {
        cohortPeriod: {
          $floor: {
            $divide: [{ $subtract: ["$createdAt", cohortStart] }, periodDays * 24 * 60 * 60 * 1000],
          },
        },
      },
    },
    {
      $group: {
        _id: "$cohortPeriod",
        users: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // For each cohort, calculate retention at each period
  const retentionData = await Promise.all(
    cohorts.map(async (cohort) => {
      const cohortUsers = cohort.users;
      const retentionRates = [];

      for (let p = 0; p <= periods - cohort._id; p++) {
        const periodStart = new Date(cohortStart);
        periodStart.setDate(periodStart.getDate() + (cohort._id + p) * periodDays);
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + periodDays);

        const activeInPeriod = await Event.distinct("userId", {
          userId: { $in: cohortUsers },
          timestamp: { $gte: periodStart, $lt: periodEnd },
          eventName: { $in: ["product_viewed", "order_placed", "product_added_to_cart"] },
        });

        retentionRates.push({
          period: p,
          retained: activeInPeriod.length,
          rate: ((activeInPeriod.length / cohort.count) * 100).toFixed(2),
        });
      }

      return {
        cohort: cohort._id,
        totalUsers: cohort.count,
        retention: retentionRates,
      };
    })
  );

  await redis.set(cacheKey, JSON.stringify(retentionData), { ex: CACHE_TTL * 12 }); // Cache for 1 hour
  return retentionData;
};

// ============================================
// PRODUCT METRICS
// ============================================

export const getTopProducts = async (period = "30d", metric = "revenue", limit = 10) => {
  const { start, end } = getDateRange(period);

  if (metric === "views") {
    const result = await Event.aggregate([
      {
        $match: {
          eventName: "product_viewed",
          timestamp: { $gte: start, $lte: end },
          "product.productId": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$product.productId",
          name: { $first: "$product.name" },
          views: { $sum: 1 },
          uniqueViewers: { $addToSet: "$userId" },
        },
      },
      {
        $addFields: {
          uniqueViews: { $size: "$uniqueViewers" },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
      {
        $project: {
          productId: "$_id",
          name: 1,
          views: 1,
          uniqueViews: 1,
        },
      },
    ]);

    return result;
  }

  if (metric === "cartAdds") {
    const result = await Event.aggregate([
      {
        $match: {
          eventName: "product_added_to_cart",
          timestamp: { $gte: start, $lte: end },
          "product.productId": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$product.productId",
          name: { $first: "$product.name" },
          cartAdds: { $sum: 1 },
          totalQuantity: { $sum: "$product.quantity" },
        },
      },
      { $sort: { cartAdds: -1 } },
      { $limit: limit },
    ]);

    return result;
  }

  // Default: revenue
  const result = await Product.aggregate([
    {
      $lookup: {
        from: "orders",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              status: { $nin: ["cancelled", "refunded"] },
            },
          },
          { $unwind: "$items" },
          {
            $match: {
              $expr: { $eq: ["$items.product", "$$productId"] },
            },
          },
        ],
        as: "orderItems",
      },
    },
    {
      $addFields: {
        revenue: {
          $sum: {
            $map: {
              input: "$orderItems",
              as: "item",
              in: { $multiply: ["$$item.items.price", "$$item.items.quantity"] },
            },
          },
        },
        unitsSold: {
          $sum: {
            $map: {
              input: "$orderItems",
              as: "item",
              in: "$$item.items.quantity",
            },
          },
        },
      },
    },
    { $match: { revenue: { $gt: 0 } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        productId: "$_id",
        name: "$en.name",
        nameAr: "$ar.name",
        price: 1,
        revenue: 1,
        unitsSold: 1,
        stock: 1,
      },
    },
  ]);

  return result;
};

export const getProductConversionRates = async (period = "30d", limit = 20) => {
  const { start, end } = getDateRange(period);

  const result = await Event.aggregate([
    {
      $match: {
        eventName: { $in: ["product_viewed", "product_added_to_cart", "order_placed"] },
        timestamp: { $gte: start, $lte: end },
        "product.productId": { $ne: null },
      },
    },
    {
      $group: {
        _id: {
          productId: "$product.productId",
          eventName: "$eventName",
        },
        count: { $sum: 1 },
        productName: { $first: "$product.name" },
      },
    },
    {
      $group: {
        _id: "$_id.productId",
        name: { $first: "$productName" },
        events: {
          $push: {
            event: "$_id.eventName",
            count: "$count",
          },
        },
      },
    },
    {
      $project: {
        productId: "$_id",
        name: 1,
        views: {
          $let: {
            vars: {
              viewEvent: {
                $arrayElemAt: [
                  { $filter: { input: "$events", as: "e", cond: { $eq: ["$$e.event", "product_viewed"] } } },
                  0,
                ],
              },
            },
            in: { $ifNull: ["$$viewEvent.count", 0] },
          },
        },
        cartAdds: {
          $let: {
            vars: {
              cartEvent: {
                $arrayElemAt: [
                  { $filter: { input: "$events", as: "e", cond: { $eq: ["$$e.event", "product_added_to_cart"] } } },
                  0,
                ],
              },
            },
            in: { $ifNull: ["$$cartEvent.count", 0] },
          },
        },
        purchases: {
          $let: {
            vars: {
              orderEvent: {
                $arrayElemAt: [
                  { $filter: { input: "$events", as: "e", cond: { $eq: ["$$e.event", "order_placed"] } } },
                  0,
                ],
              },
            },
            in: { $ifNull: ["$$orderEvent.count", 0] },
          },
        },
      },
    },
    {
      $addFields: {
        viewToCartRate: {
          $cond: [{ $gt: ["$views", 0] }, { $multiply: [{ $divide: ["$cartAdds", "$views"] }, 100] }, 0],
        },
        cartToPurchaseRate: {
          $cond: [{ $gt: ["$cartAdds", 0] }, { $multiply: [{ $divide: ["$purchases", "$cartAdds"] }, 100] }, 0],
        },
        overallConversion: {
          $cond: [{ $gt: ["$views", 0] }, { $multiply: [{ $divide: ["$purchases", "$views"] }, 100] }, 0],
        },
      },
    },
    { $match: { views: { $gte: 10 } } }, // Only products with meaningful traffic
    { $sort: { overallConversion: -1 } },
    { $limit: limit },
  ]);

  return result;
};

// ============================================
// SEARCH ANALYTICS
// ============================================

export const getSearchAnalytics = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const [topSearches, zeroResultSearches, searchStats] = await Promise.all([
    // Top search terms
    Event.aggregate([
      {
        $match: {
          eventName: "search_performed",
          timestamp: { $gte: start, $lte: end },
          "search.query": { $ne: null },
        },
      },
      {
        $group: {
          _id: { $toLower: "$search.query" },
          count: { $sum: 1 },
          avgResults: { $avg: "$search.resultsCount" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),

    // Zero result searches
    Event.aggregate([
      {
        $match: {
          eventName: "search_performed",
          timestamp: { $gte: start, $lte: end },
          "search.hasResults": false,
        },
      },
      {
        $group: {
          _id: { $toLower: "$search.query" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),

    // Overall search stats
    Event.aggregate([
      {
        $match: {
          eventName: "search_performed",
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          searchesWithResults: { $sum: { $cond: ["$search.hasResults", 1, 0] } },
          avgResultsCount: { $avg: "$search.resultsCount" },
          uniqueSearchers: { $addToSet: "$userId" },
        },
      },
      {
        $addFields: {
          uniqueSearchersCount: { $size: { $ifNull: ["$uniqueSearchers", []] } },
          successRate: {
            $multiply: [{ $divide: ["$searchesWithResults", "$totalSearches"] }, 100],
          },
        },
      },
    ]),
  ]);

  return {
    topSearches,
    zeroResultSearches,
    stats: searchStats[0] || {
      totalSearches: 0,
      searchesWithResults: 0,
      avgResultsCount: 0,
      uniqueSearchersCount: 0,
      successRate: 0,
    },
  };
};

// ============================================
// TRAFFIC & ATTRIBUTION
// ============================================

export const getTrafficBySource = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const result = await Event.aggregate([
    {
      $match: {
        eventName: "session_start",
        timestamp: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          source: { $ifNull: ["$attribution.source", "direct"] },
          medium: { $ifNull: ["$attribution.medium", "none"] },
        },
        sessions: { $sum: 1 },
        users: { $addToSet: "$userId" },
      },
    },
    {
      $addFields: {
        uniqueUsers: { $size: { $ifNull: ["$users", []] } },
      },
    },
    { $sort: { sessions: -1 } },
    {
      $project: {
        source: "$_id.source",
        medium: "$_id.medium",
        sessions: 1,
        uniqueUsers: 1,
      },
    },
  ]);

  return result;
};

export const getCampaignPerformance = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const result = await Event.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
        "attribution.campaign": { $ne: null },
      },
    },
    {
      $group: {
        _id: "$attribution.campaign",
        sessions: {
          $sum: { $cond: [{ $eq: ["$eventName", "session_start"] }, 1, 0] },
        },
        productViews: {
          $sum: { $cond: [{ $eq: ["$eventName", "product_viewed"] }, 1, 0] },
        },
        cartAdds: {
          $sum: { $cond: [{ $eq: ["$eventName", "product_added_to_cart"] }, 1, 0] },
        },
        orders: {
          $sum: { $cond: [{ $eq: ["$eventName", "order_placed"] }, 1, 0] },
        },
        revenue: {
          $sum: {
            $cond: [{ $eq: ["$eventName", "order_placed"] }, { $ifNull: ["$order.totalAmount", 0] }, 0],
          },
        },
      },
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [{ $gt: ["$sessions", 0] }, { $multiply: [{ $divide: ["$orders", "$sessions"] }, 100] }, 0],
        },
        revenuePerSession: {
          $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$revenue", "$sessions"] }, 0],
        },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return result;
};

// ============================================
// DASHBOARD AGGREGATED DATA
// ============================================

export const getDashboardOverview = async () => {
  const cacheKey = `${METRICS_CACHE_PREFIX}dashboard:overview`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    todayRevenue,
    yesterdayRevenue,
    monthRevenue,
    lastMonthRevenue,
    todayOrders,
    yesterdayOrders,
    todayUsers,
    totalUsers,
    conversionToday,
    activeUsersNow,
    cartAbandonmentRate,
    topProducts,
  ] = await Promise.all([
    // Today's revenue
    Order.aggregate([
      { $match: { createdAt: { $gte: today }, status: { $nin: ["cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),

    // Yesterday's revenue
    Order.aggregate([
      { $match: { createdAt: { $gte: yesterday, $lt: today }, status: { $nin: ["cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),

    // This month's revenue
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $nin: ["cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),

    // Last month's revenue
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          status: { $nin: ["cancelled"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),

    // Today's orders
    Order.countDocuments({ createdAt: { $gte: today } }),

    // Yesterday's orders
    Order.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),

    // New users today
    User.countDocuments({ createdAt: { $gte: today } }),

    // Total users
    User.countDocuments(),

    // Conversion rate today
    getConversionMetrics("today"),

    // Active users in last 15 minutes
    Event.distinct("userId", {
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      userId: { $ne: null },
    }),

    // Cart abandonment rate (7 days)
    getCartAbandonmentRate("7d"),

    // Top products
    getTopProducts("7d", "revenue", 5),
  ]);

  const overview = {
    revenue: {
      today: todayRevenue[0]?.total || 0,
      yesterday: yesterdayRevenue[0]?.total || 0,
      thisMonth: monthRevenue[0]?.total || 0,
      lastMonth: lastMonthRevenue[0]?.total || 0,
      todayChange:
        yesterdayRevenue[0]?.total > 0
          ? (((todayRevenue[0]?.total || 0) - yesterdayRevenue[0].total) / yesterdayRevenue[0].total) * 100
          : 0,
      monthChange:
        lastMonthRevenue[0]?.total > 0
          ? (((monthRevenue[0]?.total || 0) - lastMonthRevenue[0].total) / lastMonthRevenue[0].total) * 100
          : 0,
    },
    orders: {
      today: todayOrders,
      yesterday: yesterdayOrders,
      thisMonth: monthRevenue[0]?.count || 0,
      todayChange: yesterdayOrders > 0 ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 : 0,
    },
    users: {
      newToday: todayUsers,
      total: totalUsers,
      activeNow: activeUsersNow.length,
    },
    conversion: {
      rate: conversionToday.overallConversionRate,
      cartAbandonmentRate: cartAbandonmentRate.abandonmentRate,
    },
    topProducts,
    updatedAt: new Date(),
  };

  await redis.set(cacheKey, JSON.stringify(overview), { ex: 60 }); // Cache for 1 minute
  return overview;
};
// ============================================
// REALTIME STATS (Last 15-60 mins)
// ============================================

export const getRealtimeStats = async (minutes = 15) => {
  const cacheKey = `${METRICS_CACHE_PREFIX}realtime:${minutes}`;
  
  // Return cached data if available (Cache for 30 seconds to prevent DB hammering)
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const start = new Date(now.getTime() - minutes * 60 * 1000);

  const [
    activeUsers,
    recentOrders,
    revenueData,
    trendingCategories,
    recentSignups
  ] = await Promise.all([
    // 1. Active Users (Unique users with events in last X mins)
    Event.distinct("userId", { 
      timestamp: { $gte: start },
      userId: { $ne: null } 
    }),

    // 2. Recent Orders Count
    Order.countDocuments({ 
      createdAt: { $gte: start },
      status: { $nin: ["cancelled", "refunded"] } 
    }),

    // 3. Revenue in last X mins
    Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: start },
          status: { $nin: ["cancelled", "refunded"] }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$totalAmount" } 
        } 
      }
    ]),

    // 4. Trending Categories (Based on views)
    Event.aggregate([
      { 
        $match: { 
          eventName: "product_viewed",
          timestamp: { $gte: start },
          "product.category": { $ne: null }
        } 
      },
      { 
        $group: { 
          _id: "$product.category", 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),

    // 5. New Signups
    User.countDocuments({ createdAt: { $gte: start } })
  ]);

  const stats = {
    activeUsers: activeUsers.length,
    recentOrders,
    recentRevenue: revenueData[0]?.total || 0,
    trendingCategories: trendingCategories.map(t => ({ 
      category: t._id, 
      views: t.count 
    })),
    recentSignups,
    period: `${minutes}m`,
    updatedAt: now,
  };

  // Cache for 30 seconds only (Realtime data shouldn't be cached long)
  await redis.set(cacheKey, JSON.stringify(stats), { ex: 30 });
  
  return stats;
};
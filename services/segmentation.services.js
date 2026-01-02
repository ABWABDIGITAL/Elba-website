// services/segments.service.js

import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Event from "../models/event.model.js";
import { redis } from "../config/redis.js";

const SEGMENTS_CACHE_PREFIX = "segments:";
const CACHE_TTL = 3600; // 1 hour

// ============================================
// VIP TIERS CONFIGURATION
// ============================================

export const VIP_TIERS = {
  platinum: {
    id: "platinum",
    name: "Platinum",
    nameAr: "بلاتينيوم",
    color: "#E5E4E2",
    minSpent: 10000,
    minOrders: 15,
    benefits: {
      discountPercentage: 20,
      freeShipping: true,
      freeShippingThreshold: 0,
      earlyAccess: true,
      dedicatedSupport: true,
      birthdayBonus: 500,
    },
  },
  gold: {
    id: "gold",
    name: "Gold",
    nameAr: "ذهبي",
    color: "#FFD700",
    minSpent: 5000,
    minOrders: 8,
    benefits: {
      discountPercentage: 15,
      freeShipping: true,
      freeShippingThreshold: 100,
      earlyAccess: true,
      prioritySupport: true,
      birthdayBonus: 200,
    },
  },
  silver: {
    id: "silver",
    name: "Silver",
    nameAr: "فضي",
    color: "#C0C0C0",
    minSpent: 2000,
    minOrders: 4,
    benefits: {
      discountPercentage: 10,
      freeShipping: true,
      freeShippingThreshold: 200,
      birthdayBonus: 100,
    },
  },
  bronze: {
    id: "bronze",
    name: "Bronze",
    nameAr: "برونزي",
    color: "#CD7F32",
    minSpent: 500,
    minOrders: 2,
    benefits: {
      discountPercentage: 5,
      freeShippingThreshold: 300,
      birthdayBonus: 50,
    },
  },
};

// ============================================
// SEGMENT DEFINITIONS
// ============================================

export const SEGMENTS = {
  // VIP Segments
  vip_platinum: {
    id: "vip_platinum",
    name: "VIP Platinum",
    nameAr: "عملاء بلاتينيوم",
    description: "Top 1% customers by value",
    priority: 1,
  },
  vip_gold: {
    id: "vip_gold",
    name: "VIP Gold",
    nameAr: "عملاء ذهبيون",
    description: "Top 5% customers by value",
    priority: 2,
  },
  vip_silver: {
    id: "vip_silver",
    name: "VIP Silver",
    nameAr: "عملاء فضيون",
    description: "Top 15% customers by value",
    priority: 3,
  },

  // Lifecycle Segments
  new_customer: {
    id: "new_customer",
    name: "New Customer",
    nameAr: "عميل جديد",
    description: "First order within last 30 days",
    priority: 10,
  },
  returning_customer: {
    id: "returning_customer",
    name: "Returning Customer",
    nameAr: "عميل عائد",
    description: "2-3 orders",
    priority: 11,
  },
  loyal_customer: {
    id: "loyal_customer",
    name: "Loyal Customer",
    nameAr: "عميل وفي",
    description: "4+ orders",
    priority: 12,
  },

  // Risk Segments
  at_risk: {
    id: "at_risk",
    name: "At Risk",
    nameAr: "معرض للخسارة",
    description: "Was active, now disengaging (60-180 days)",
    priority: 5,
  },
  churned: {
    id: "churned",
    name: "Churned",
    nameAr: "مفقود",
    description: "No activity for 180+ days",
    priority: 6,
  },

  // Behavioral Segments
  high_intent_non_buyer: {
    id: "high_intent_non_buyer",
    name: "High Intent Non-Buyer",
    nameAr: "مهتم لم يشترِ",
    description: "Strong purchase signals, no conversion",
    priority: 7,
  },
  cart_abandoner: {
    id: "cart_abandoner",
    name: "Cart Abandoner",
    nameAr: "تارك السلة",
    description: "Frequently abandons cart",
    priority: 8,
  },
  browser: {
    id: "browser",
    name: "Browser",
    nameAr: "متصفح",
    description: "Visits but rarely adds to cart",
    priority: 20,
  },
  prospect: {
    id: "prospect",
    name: "Prospect",
    nameAr: "محتمل",
    description: "Registered but no order",
    priority: 21,
  },
};

// ============================================
// CALCULATE USER SEGMENT
// ============================================

export const calculateUserSegment = async (userId) => {
  const cacheKey = `${SEGMENTS_CACHE_PREFIX}user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Get user stats
  const [orderStats, activityStats] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          user: userId,
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" },
          firstOrderDate: { $min: "$createdAt" },
          lastOrderDate: { $max: "$createdAt" },
          ordersWithDiscount: {
            $sum: { $cond: [{ $gt: ["$discountAmount", 0] }, 1, 0] },
          },
        },
      },
    ]),

    Event.aggregate([
      {
        $match: {
          userId: userId,
          timestamp: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: "$userId",
          lastActivity: { $max: "$timestamp" },
          cartAdds: {
            $sum: { $cond: [{ $eq: ["$eventName", "product_added_to_cart"] }, 1, 0] },
          },
          productViews: {
            $sum: { $cond: [{ $eq: ["$eventName", "product_viewed"] }, 1, 0] },
          },
          sessions: {
            $sum: { $cond: [{ $eq: ["$eventName", "session_start"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const stats = orderStats[0] || {
    totalSpent: 0,
    orderCount: 0,
    avgOrderValue: 0,
    firstOrderDate: null,
    lastOrderDate: null,
  };

  const activity = activityStats[0] || {
    lastActivity: null,
    cartAdds: 0,
    productViews: 0,
    sessions: 0,
  };

  const now = new Date();
  const daysSinceLastOrder = stats.lastOrderDate
    ? Math.floor((now - new Date(stats.lastOrderDate)) / (1000 * 60 * 60 * 24))
    : null;
  const daysSinceLastActivity = activity.lastActivity
    ? Math.floor((now - new Date(activity.lastActivity)) / (1000 * 60 * 60 * 24))
    : null;

  // Determine segment
  let segment = "prospect";
  let vipTier = null;

  // Check VIP status first
  if (stats.totalSpent >= VIP_TIERS.platinum.minSpent || stats.orderCount >= VIP_TIERS.platinum.minOrders) {
    segment = "vip_platinum";
    vipTier = VIP_TIERS.platinum;
  } else if (stats.totalSpent >= VIP_TIERS.gold.minSpent || stats.orderCount >= VIP_TIERS.gold.minOrders) {
    segment = "vip_gold";
    vipTier = VIP_TIERS.gold;
  } else if (stats.totalSpent >= VIP_TIERS.silver.minSpent || stats.orderCount >= VIP_TIERS.silver.minOrders) {
    segment = "vip_silver";
    vipTier = VIP_TIERS.silver;
  } else if (stats.orderCount >= 4) {
    segment = "loyal_customer";
  } else if (stats.orderCount >= 2) {
    segment = "returning_customer";
  } else if (stats.orderCount === 1) {
    const thirtyDaysAgo = 30;
    if (daysSinceLastOrder <= thirtyDaysAgo) {
      segment = "new_customer";
    } else {
      segment = "returning_customer";
    }
  } else {
    // No orders
    if (activity.cartAdds >= 2) {
      segment = "high_intent_non_buyer";
    } else if (activity.productViews >= 10) {
      segment = "browser";
    } else {
      segment = "prospect";
    }
  }

  // Check for at-risk / churned (override for customers)
  if (stats.orderCount >= 2) {
    if (daysSinceLastOrder >= 180) {
      segment = "churned";
    } else if (daysSinceLastOrder >= 60) {
      segment = "at_risk";
    }
  }

  const result = {
    userId,
    segment: SEGMENTS[segment],
    vipTier,
    stats: {
      totalSpent: stats.totalSpent,
      orderCount: stats.orderCount,
      avgOrderValue: Math.round(stats.avgOrderValue || 0),
      firstOrderDate: stats.firstOrderDate,
      lastOrderDate: stats.lastOrderDate,
      daysSinceLastOrder,
      daysSinceLastActivity,
    },
    activity: {
      cartAdds: activity.cartAdds,
      productViews: activity.productViews,
      sessions: activity.sessions,
    },
    benefits: vipTier?.benefits || {},
    calculatedAt: new Date(),
  };

  await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
  return result;
};

export const getSegmentDistribution = async () => {
  const cacheKey = `${SEGMENTS_CACHE_PREFIX}distribution`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      await redis.del(cacheKey);
    }
  }

  const now = new Date();

  const distribution = await User.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders"
      }
    },
    {
      $addFields: {
        orderCount: { $size: "$orders" },
        totalSpent: { $sum: "$orders.totalAmount" },
        lastOrderDate: { $max: "$orders.createdAt" }
      }
    },
    {
      $addFields: {
        daysSinceLastOrder: {
          $cond: [
            { $ne: ["$lastOrderDate", null] },
            {
              $divide: [
                { $subtract: [now, "$lastOrderDate"] },
                24 * 60 * 60 * 1000
              ]
            },
            null
          ]
        }
      }
    },
    {
      $addFields: {
        segment: {
          $switch: {
            branches: [
              {
                case: {
                  $or: [
                    { $gte: ["$totalSpent", 10000] },
                    { $gte: ["$orderCount", 15] }
                  ]
                },
                then: "vip"
              },
              {
                case: {
                  $and: [
                    { $gte: ["$orderCount", 3] },
                    { $lte: ["$daysSinceLastOrder", 30] }
                  ]
                },
                then: "loyal"
              },
              {
                case: {
                  $and: [
                    { $gte: ["$orderCount", 2] },
                    { $gt: ["$daysSinceLastOrder", 30] },
                    { $lte: ["$daysSinceLastOrder", 90] }
                  ]
                },
                then: "at_risk"
              },
              {
                case: {
                  $and: [
                    { $gte: ["$orderCount", 1] },
                    { $gt: ["$daysSinceLastOrder", 90] }
                  ]
                },
                then: "churned"
              }
            ],
            default: "new"
          }
        }
      }
    },
    {
      $group: {
        _id: "$segment",
        count: { $sum: 1 },
        totalSpent: { $sum: "$totalSpent" },
        avgOrderValue: {
          $avg: {
            $cond: [
              { $gt: ["$orderCount", 0] },
              { $divide: ["$totalSpent", "$orderCount"] },
              0
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        segments: { $push: "$$ROOT" },
        totalRevenue: { $sum: "$totalSpent" }
      }
    },
    { $unwind: "$segments" },
    {
      $addFields: {
        "segments.revenueShare": {
          $cond: [
            { $gt: ["$totalRevenue", 0] },
            {
              $multiply: [
                { $divide: ["$segments.totalSpent", "$totalRevenue"] },
                100
              ]
            },
            0
          ]
        }
      }
    },
    { $replaceRoot: { newRoot: "$segments" } },
    { $sort: { totalSpent: -1 } }
  ]);

  await redis.set(cacheKey, JSON.stringify(distribution), { ex: CACHE_TTL });
  return distribution;
};


export const getAtRiskUsers = async (limit = 50) => {
  const cacheKey = `${SEGMENTS_CACHE_PREFIX}at_risk`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, Math.min(limit, parsed.length));
      }
      await redis.del(cacheKey);
    } catch {
      await redis.del(cacheKey);
    }
  }

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const oneEightyDaysAgo = new Date();
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  const atRiskUsers = await User.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders"
      }
    },
    {
      $match: {
        "orders.0": { $exists: true }
      }
    },
    {
      $addFields: {
        lastOrderDate: { $max: "$orders.createdAt" },
        orderCount: { $size: "$orders" },
        totalSpent: { $sum: "$orders.totalAmount" }
      }
    },
    {
      $match: {
        lastOrderDate: { $lt: sixtyDaysAgo, $gte: oneEightyDaysAgo },
        orderCount: { $gte: 2 }
      }
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        lastOrderDate: 1,
        orderCount: 1,
        totalSpent: 1,
        daysSinceLastOrder: {
          $divide: [
            { $subtract: [new Date(), "$lastOrderDate"] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    { $sort: { daysSinceLastOrder: -1 } },
    { $limit: limit }
  ]);

  await redis.set(cacheKey, JSON.stringify(atRiskUsers), { ex: CACHE_TTL });
  return atRiskUsers;
};

// ============================================
// GET VIP USERS
// ============================================

export const getVIPUsers = async (tier = null, limit = 50) => {
  const cacheKey = `${SEGMENTS_CACHE_PREFIX}vip:${tier || 'all'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const matchStage = {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "user",
      as: "orders"
    }
  };

  const filterStage = {
    $match: {
      "orders.0": { $exists: true }
    }
  };

  const addFieldsStage = {
    $addFields: {
      totalSpent: { $sum: "$orders.totalAmount" },
      orderCount: { $size: "$orders" },
      lastOrderDate: { $max: "$orders.createdAt" }
    }
  };

  const tierFilters = {
    platinum: { $or: [{ $gte: ["$totalSpent", 10000] }, { $gte: ["$orderCount", 15] }] },
    gold: { $or: [{ $gte: ["$totalSpent", 5000] }, { $gte: ["$orderCount", 8] }] },
    silver: { $or: [{ $gte: ["$totalSpent", 2000] }, { $gte: ["$orderCount", 4] }] },
    bronze: { $or: [{ $gte: ["$totalSpent", 500] }, { $gte: ["$orderCount", 2] }] }
  };

  const pipeline = [
    matchStage,
    filterStage,
    addFieldsStage
  ];

  if (tier && tierFilters[tier]) {
    pipeline.push({
      $match: tierFilters[tier]
    });
  }

  pipeline.push(
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        totalSpent: 1,
        orderCount: 1,
        lastOrderDate: 1,
        tier: tier || {
          $switch: {
            branches: [
              {
                case: { $or: [{ $gte: ["$totalSpent", 10000] }, { $gte: ["$orderCount", 15] }] },
                then: "platinum"
              },
              {
                case: { $or: [{ $gte: ["$totalSpent", 5000] }, { $gte: ["$orderCount", 8] }] },
                then: "gold"
              },
              {
                case: { $or: [{ $gte: ["$totalSpent", 2000] }, { $gte: ["$orderCount", 4] }] },
                then: "silver"
              },
              {
                case: { $or: [{ $gte: ["$totalSpent", 500] }, { $gte: ["$orderCount", 2] }] },
                then: "bronze"
              }
            ],
            default: "none"
          }
        }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: limit }
  );

  const vipUsers = await User.aggregate(pipeline);
  await redis.set(cacheKey, JSON.stringify(vipUsers), { ex: CACHE_TTL });
  return vipUsers;
};

// ============================================
// GET HIGH INTENT NON-BUYERS
// ============================================

export const getHighIntentNonBuyers = async (limit = 50) => {
  const cacheKey = `${SEGMENTS_CACHE_PREFIX}high_intent`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const highIntentUsers = await User.aggregate([
    {
      $lookup: {
        from: "events",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
              timestamp: { $gte: sevenDaysAgo }
            }
          },
          {
            $group: {
              _id: "$userId",
              cartAdds: {
                $sum: { $cond: [{ $eq: ["$eventName", "product_added_to_cart"] }, 1, 0] }
              },
              productViews: {
                $sum: { $cond: [{ $eq: ["$eventName", "product_viewed"] }, 1, 0] }
              },
              sessions: {
                $sum: { $cond: [{ $eq: ["$eventName", "session_start"] }, 1, 0] }
              }
            }
          }
        ],
        as: "activity"
      }
    },
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders"
      }
    },
    {
      $match: {
        "orders.0": { $exists: false },
        "activity.0": { $exists: true }
      }
    },
    {
      $addFields: {
        cartAdds: { $arrayElemAt: ["$activity.cartAdds", 0] },
        productViews: { $arrayElemAt: ["$activity.productViews", 0] },
        sessions: { $arrayElemAt: ["$activity.sessions", 0] }
      }
    },
    {
      $match: {
        $or: [
          { cartAdds: { $gte: 2 } },
          { productViews: { $gte: 10 } },
          { sessions: { $gte: 5 } }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        cartAdds: 1,
        productViews: 1,
        sessions: 1
      }
    },
    { $sort: { cartAdds: -1, productViews: -1 } },
    { $limit: limit }
  ]);

  await redis.set(cacheKey, JSON.stringify(highIntentUsers), { ex: CACHE_TTL });
  return highIntentUsers;
};
// services/metricsCalculation.service.js

import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Event from "../models/event.model.js";
import { redis } from "../config/redis.js";

const METRICS_CACHE_PREFIX = "metrics:";
const CACHE_TTL = 300; // 5 minutes

/**
 * Calculate Active Users (DAU, WAU, MAU)
 */
export const calculateActiveUsers = async (timeframe = 'DAU') => {
  const cacheKey = `${METRICS_CACHE_PREFIX}active_users:${timeframe}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const timeframeDays = {
    'DAU': 1,
    'WAU': 7,
    'MAU': 30
  };

  const days = timeframeDays[timeframe] || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const meaningfulActions = [
    'product_viewed',
    'product_added_to_cart',
    'search_performed',
    'order_placed',
    'checkout_started'
  ];

  const result = await Event.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        eventName: { $in: meaningfulActions },
        userId: { $ne: null }
      }
    },
    {
      $group: {
        _id: "$userId"
      }
    },
    {
      $count: "activeUsers"
    }
  ]);

  const count = result[0]?.activeUsers || 0;
  await redis.set(cacheKey, JSON.stringify(count), { ex: CACHE_TTL });
  
  return count;
};

/**
 * Calculate Cart Abandonment Rate
 */
export const calculateCartAbandonmentRate = async (startDate, endDate) => {
  const [cartsCreated, ordersPlaced] = await Promise.all([
    Event.countDocuments({
      eventName: 'product_added_to_cart',
      timestamp: { $gte: startDate, $lte: endDate }
    }),
    Event.countDocuments({
      eventName: 'order_placed',
      timestamp: { $gte: startDate, $lte: endDate }
    })
  ]);

  if (cartsCreated === 0) return 0;
  
  return ((cartsCreated - ordersPlaced) / cartsCreated * 100).toFixed(2);
};

/**
 * Calculate Customer LTV
 */
export const calculateCustomerLTV = async (userId) => {
  const result = await Order.aggregate([
    {
      $match: {
        user: userId,
        status: { $nin: ['cancelled', 'refunded'] }
      }
    },
    {
      $group: {
        _id: "$user",
        totalRevenue: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: "$totalAmount" },
        firstOrder: { $min: "$createdAt" },
        lastOrder: { $max: "$createdAt" }
      }
    }
  ]);

  if (!result[0]) return { ltv: 0, tier: 'none' };

  const { totalRevenue, orderCount, avgOrderValue, firstOrder, lastOrder } = result[0];
  
  // Calculate customer lifespan in months
  const lifespanMonths = Math.max(1, 
    (new Date(lastOrder) - new Date(firstOrder)) / (1000 * 60 * 60 * 24 * 30)
  );
  
  // Purchase frequency (orders per month)
  const frequency = orderCount / lifespanMonths;
  
  // Predicted 24-month LTV
  const predictedLTV = avgOrderValue * frequency * 24;

  // Determine VIP tier
  let tier = 'none';
  if (totalRevenue > 10000 || orderCount >= 15) tier = 'platinum';
  else if (totalRevenue > 5000 || orderCount >= 8) tier = 'gold';
  else if (totalRevenue > 2000 || orderCount >= 4) tier = 'silver';
  else if (totalRevenue > 500 || orderCount >= 2) tier = 'bronze';

  return {
    ltv: Math.round(predictedLTV),
    historicalValue: totalRevenue,
    orderCount,
    avgOrderValue: Math.round(avgOrderValue),
    frequency: frequency.toFixed(2),
    tier
  };
};

/**
 * Identify At-Risk Users
 */
export const identifyAtRiskUsers = async () => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Users who ordered before but not recently
  const atRiskUsers = await User.aggregate([
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'orders'
      }
    },
    {
      $match: {
        'orders.0': { $exists: true }, // Has at least one order
      }
    },
    {
      $addFields: {
        lastOrderDate: { $max: '$orders.createdAt' },
        orderCount: { $size: '$orders' }
      }
    },
    {
      $match: {
        lastOrderDate: { $lt: sixtyDaysAgo },
        orderCount: { $gte: 2 } // Was a repeat customer
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
        daysSinceLastOrder: {
          $divide: [
            { $subtract: [new Date(), '$lastOrderDate'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $sort: { daysSinceLastOrder: -1 }
    },
    {
      $limit: 100
    }
  ]);

  return atRiskUsers;
};

/**
 * Calculate Funnel Conversion
 */
export const calculateFunnelConversion = async (startDate, endDate) => {
  const funnelStages = [
    { name: 'Sessions', event: 'session_start' },
    { name: 'Product Views', event: 'product_viewed' },
    { name: 'Add to Cart', event: 'product_added_to_cart' },
    { name: 'Checkout Started', event: 'checkout_started' },
    { name: 'Order Placed', event: 'order_placed' }
  ];

  const results = await Promise.all(
    funnelStages.map(stage => 
      Event.distinct('sessionId', {
        eventName: stage.event,
        timestamp: { $gte: startDate, $lte: endDate }
      }).then(sessions => ({
        stage: stage.name,
        count: sessions.length
      }))
    )
  );

  // Calculate conversion rates between stages
  const funnel = results.map((stage, index) => {
    const prevCount = index > 0 ? results[index - 1].count : stage.count;
    const conversionRate = prevCount > 0 
      ? ((stage.count / prevCount) * 100).toFixed(2)
      : 0;
    const overallRate = results[0].count > 0
      ? ((stage.count / results[0].count) * 100).toFixed(2)
      : 0;

    return {
      ...stage,
      conversionFromPrevious: parseFloat(conversionRate),
      overallConversion: parseFloat(overallRate),
      dropOff: index > 0 ? prevCount - stage.count : 0
    };
  });

  return funnel;
};
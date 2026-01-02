// services/dashboard.service.js

import { redis } from "../config/redis.js";
import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import {
  getRevenueMetrics,
  getConversionMetrics,
  getFunnelData,
  getCartAbandonmentRate,
  getAbandonedCarts,
  getActiveUsers,
  getUserGrowth,
  getUserRetention,
  getTopProducts,
  getProductConversionRates,
  getSearchAnalytics,
  getTrafficBySource,
  getCampaignPerformance,
} from "../services/metrics.services.js";
import {
  getSegmentDistribution,
  getAtRiskUsers,
  getVIPUsers,
  getHighIntentNonBuyers,
  calculateUserSegment,
  VIP_TIERS,
} from "../services/segmentation.services.js";
import { ALERT_RULES } from "../services/alerts.services.js";

const DASHBOARD_CACHE_PREFIX = "dashboard:";
const CACHE_TTL = 300; // 5 minutes

/**
 * Get CEO Dashboard Data
 */
export const getCEODashboard = async () => {
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}ceo`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get all metrics in parallel
  const [
    revenueMetrics,
    conversionMetrics,
    funnelData,
    cartAbandonment,
    activeUsersNow,
    userGrowth,
    topProducts,
    segmentDistribution,
    atRiskUsers,
    vipUsers,
    recentOrders,
    inventoryAlerts,
    activeAlerts,
  ] = await Promise.all([
    getRevenueMetrics("today"),
    getConversionMetrics("today"),
    getFunnelData("7d"),
    getCartAbandonmentRate("7d"),
    getActiveUsers("DAU"),
    getUserGrowth("30d"),
    getTopProducts("7d", "revenue", 5),
    getSegmentDistribution(),
    getAtRiskUsers(5),
    getVIPUsers("platinum", 5),
    getRecentOrders(10),
    getInventoryAlerts(),
    getActiveAlerts(10),
  ]);

  // Calculate growth percentages
  const [todayRevenue, yesterdayRevenueData] = await Promise.all([
    getRevenueMetrics("today"),
    getRevenueMetrics("yesterday"),
  ]);

  const revenueGrowth =
    yesterdayRevenueData.totalRevenue > 0
      ? ((todayRevenue.totalRevenue - yesterdayRevenueData.totalRevenue) /
          yesterdayRevenueData.totalRevenue) *
        100
      : 0;

  const [monthRevenue, lastMonthRevenue] = await Promise.all([
    getRevenueMetrics("this_month"),
    getRevenueMetrics("last_month"),
  ]);

  const monthRevenueGrowth =
    lastMonthRevenue.totalRevenue > 0
      ? ((monthRevenue.totalRevenue - lastMonthRevenue.totalRevenue) /
          lastMonthRevenue.totalRevenue) *
        100
      : 0;

  // Format data for dashboard
  const dashboardData = {
    kpiCards: [
      {
        title: "Today's Revenue",
        value: revenueMetrics.totalRevenue.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        comparison: revenueGrowth.toFixed(1),
        trend: revenueGrowth >= 0 ? "up" : "down",
        icon: "💰",
      },
      {
        title: "Monthly Revenue",
        value: monthRevenue.totalRevenue.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        comparison: monthRevenueGrowth.toFixed(1),
        trend: monthRevenueGrowth >= 0 ? "up" : "down",
        icon: "📈",
      },
      {
        title: "Conversion Rate",
        value: `${conversionMetrics.overallConversionRate}%`,
        comparison: "0", // Would calculate from previous period in real implementation
        trend: "neutral",
        icon: "🎯",
      },
      {
        title: "Active Users",
        value: activeUsersNow.toLocaleString(),
        comparison: "0", // Would calculate from previous period
        trend: "neutral",
        icon: "👥",
      },
    ],

    revenueChart: {
      title: "Revenue Trend (Last 30 Days)",
      data: await getRevenueTrend("30d", "daily"),
      type: "line",
    },

    businessHealth: {
      title: "Business Health Indicators",
      indicators: [
        {
          title: "Cart Abandonment",
          value: `${cartAbandonment.abandonmentRate}%`,
          threshold: 70,
          status:
            cartAbandonment.abandonmentRate > 80
              ? "critical"
              : cartAbandonment.abandonmentRate > 70
              ? "warning"
              : "good",
        },
        {
          title: "Repeat Purchase Rate",
          value: "32%", // Would calculate from data
          threshold: 25,
          status: "good",
        },
        {
          title: "Customer Satisfaction",
          value: "85%", // Would come from surveys
          threshold: 70,
          status: "good",
        },
      ],
    },

    topProducts: {
      title: "Top Selling Products (Last 7 Days)",
      columns: ["Product", "Revenue", "Units Sold", "Conversion Rate"],
      data: topProducts.map((p) => ({
        id: p.productId,
        name: p.name,
        revenue: p.revenue.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        unitsSold: p.unitsSold,
        conversionRate: "35%", // Would calculate from product conversion data
      })),
    },

    revenueByCategory: {
      title: "Revenue by Category",
      data: await getRevenueByCategory(),
      type: "pie",
    },

    segmentOverview: {
      title: "Customer Segments Overview",
      data: segmentDistribution.map((seg) => ({
        segment: seg._id,
        count: seg.count,
        revenueShare: seg.revenueShare.toFixed(1),
        avgOrderValue: seg.avgOrderValue.toFixed(2),
      })),
    },

    atRiskCustomers: {
      title: "At-Risk VIP Customers",
      columns: ["Name", "Email", "Last Order", "Days Inactive", "Tier"],
      data: atRiskUsers.map((user) => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        lastOrder: new Date(user.lastOrderDate).toLocaleDateString(),
        daysInactive: user.daysSinceLastOrder,
        tier: user.vipTier || "Unknown",
      })),
    },

    vipCustomers: {
      title: "Top VIP Customers (Platinum)",
      columns: ["Name", "Email", "Total Spent", "Orders", "Last Order"],
      data: vipUsers.map((user) => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalSpent: user.totalSpent.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        orders: user.orderCount,
        lastOrder: user.lastOrderDate
          ? new Date(user.lastOrderDate).toLocaleDateString()
          : "Never",
      })),
    },

    recentOrders: {
      title: "Recent Orders",
      columns: [
        "Order #",
        "Customer",
        "Amount",
        "Items",
        "Status",
        "Date",
      ],
      data: recentOrders.map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customer: `${order.user.firstName} ${order.user.lastName}`,
        amount: order.totalAmount.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        items: order.items.length,
        status: order.status,
        date: new Date(order.createdAt).toLocaleString(),
      })),
    },

    inventoryAlerts: {
      title: "Inventory Alerts",
      data: inventoryAlerts,
    },

    activeAlerts: {
      title: "Active Alerts",
      data: activeAlerts.map((alert) => ({
        ...alert,
        createdAt: new Date(alert.createdAt).toLocaleString(),
      })),
    },

    funnelData: {
      title: "Conversion Funnel (Last 7 Days)",
      data: funnelData,
    },

    userGrowth: {
      title: "User Growth (Last 30 Days)",
      data: userGrowth,
      type: "line",
    },

    metadata: {
      generatedAt: new Date().toISOString(),
      cacheTTL: CACHE_TTL,
    },
  };

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(dashboardData), { ex: CACHE_TTL });

  return dashboardData;
};

/**
 * Get Marketing Dashboard Data
 */
export const getMarketingDashboard = async () => {
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}marketing`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all metrics in parallel
  const [
    trafficSources,
    campaignPerformance,
    conversionFunnel,
    searchAnalytics,
    userAcquisition,
    marketingROI,
    topLandingPages,
    emailPerformance,
  ] = await Promise.all([
    getTrafficBySource("30d"),
    getCampaignPerformance("30d"),
    getFunnelData("7d"),
    getSearchAnalytics("30d"),
    getUserAcquisition("30d"),
    getMarketingROI("30d"),
    getTopLandingPages("30d"),
    getEmailPerformance("30d"),
  ]);

  // Calculate CPA and ROI
  const totalSpent = campaignPerformance.reduce(
    (sum, campaign) => sum + (campaign.spend || 0),
    0
  );
  const totalRevenue = campaignPerformance.reduce(
    (sum, campaign) => sum + (campaign.revenue || 0),
    0
  );
  const cpa = totalSpent / (userAcquisition.newUsers || 1);
  const roi = totalRevenue / (totalSpent || 1);

  const dashboardData = {
    kpiCards: [
      {
        title: "New Users (30 Days)",
        value: userAcquisition.newUsers.toLocaleString(),
        comparison: userAcquisition.growthPercentage.toFixed(1),
        trend: userAcquisition.growthPercentage >= 0 ? "up" : "down",
        icon: "🆕",
      },
      {
        title: "Cost Per Acquisition",
        value: cpa.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        comparison: "0", // Would compare to previous period
        trend: "neutral",
        icon: "💰",
      },
      {
        title: "Marketing ROI",
        value: roi.toFixed(2),
        comparison: "0", // Would compare to previous period
        trend: "neutral",
        icon: "📈",
      },
      {
        title: "Email Open Rate",
        value: `${emailPerformance.openRate}%`,
        comparison: emailPerformance.growth.toFixed(1),
        trend: emailPerformance.growth >= 0 ? "up" : "down",
        icon: "📧",
      },
    ],

    trafficSources: {
      title: "Traffic Sources (Last 30 Days)",
      data: {
        chartData: trafficSources.map((source) => ({
          source: `${source._id.source} (${source._id.medium})`,
          sessions: source.sessions,
          users: source.uniqueUsers,
        })),
        totalSessions: trafficSources.reduce((sum, s) => sum + s.sessions, 0),
        totalUsers: trafficSources.reduce((sum, s) => sum + s.uniqueUsers, 0),
      },
      type: "bar",
    },

    campaignPerformance: {
      title: "Campaign Performance (Last 30 Days)",
      columns: [
        "Campaign",
        "Sessions",
        "Conversions",
        "Revenue",
        "Spend",
        "ROAS",
        "CPA",
      ],
      data: campaignPerformance.map((campaign) => ({
        name: campaign._id,
        sessions: campaign.sessions,
        conversions: campaign.orders,
        revenue: campaign.revenue.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        spend: campaign.spend.toLocaleString("en-US", {
          style: "currency",
          currency: "SAR",
        }),
        roas: campaign.revenue / (campaign.spend || 1),
        cpa: campaign.spend / (campaign.orders || 1),
      })),
    },

    conversionFunnel: {
      title: "Conversion Funnel (Last 7 Days)",
      data: conversionFunnel,
      type: "funnel",
    },

    searchAnalytics: {
      title: "Search Analytics (Last 30 Days)",
      topSearches: {
        columns: ["Query", "Searches", "Results", "Conversion Rate"],
        data: searchAnalytics.topSearches.map((search) => ({
          query: search._id,
          searches: search.count,
          results: search.avgResults.toFixed(1),
          conversionRate: "12%", // Would calculate from data
        })),
      },
      zeroResults: {
        columns: ["Query", "Searches", "Last Searched"],
        data: searchAnalytics.zeroResultSearches.map((search) => ({
          query: search._id,
          searches: search.count,
          lastSearched: "2023-06-20", // Would get from data
        })),
      },
      stats: {
        totalSearches: searchAnalytics.stats.totalSearches,
        successRate: `${searchAnalytics.stats.successRate.toFixed(1)}%`,
        avgResults: searchAnalytics.stats.avgResultsCount.toFixed(1),
      },
    },

    userAcquisition: {
      title: "User Acquisition (Last 30 Days)",
      data: userAcquisition.data,
      totalNewUsers: userAcquisition.newUsers,
      growthPercentage: userAcquisition.growthPercentage.toFixed(1),
      type: "line",
    },

    topLandingPages: {
      title: "Top Landing Pages (Last 30 Days)",
      columns: ["Page", "Sessions", "Bounce Rate", "Conversion Rate"],
      data: topLandingPages.map((page) => ({
        url: page._id,
        sessions: page.sessions,
        bounceRate: `${page.bounceRate.toFixed(1)}%`,
        conversionRate: `${page.conversionRate.toFixed(1)}%`,
      })),
    },

    emailPerformance: {
      title: "Email Campaign Performance (Last 30 Days)",
      metrics: [
        {
          name: "Open Rate",
          value: `${emailPerformance.openRate}%`,
          comparison: `${emailPerformance.growth.toFixed(1)}%`,
        },
        {
          name: "Click Rate",
          value: `${emailPerformance.clickRate}%`,
          comparison: `${emailPerformance.clickGrowth.toFixed(1)}%`,
        },
        {
          name: "Conversion Rate",
          value: `${emailPerformance.conversionRate}%`,
          comparison: `${emailPerformance.conversionGrowth.toFixed(1)}%`,
        },
      ],
      campaigns: emailPerformance.campaigns.map((campaign) => ({
        name: campaign.name,
        sent: campaign.sent,
        opened: campaign.opened,
        clicked: campaign.clicked,
        converted: campaign.converted,
        openRate: `${campaign.openRate}%`,
        clickRate: `${campaign.clickRate}%`,
        conversionRate: `${campaign.conversionRate}%`,
      })),
    },

    metadata: {
      generatedAt: new Date().toISOString(),
      cacheTTL: CACHE_TTL,
    },
  };

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(dashboardData), { ex: CACHE_TTL });

  return dashboardData;
};

/**
 * Get Operations Dashboard Data
 */
export const getOperationsDashboard = async () => {
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}operations`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get all metrics in parallel
  const [
    orderStatus,
    pendingOrders,
    deliveryPerformance,
    inventoryStatus,
    returnRate,
    fulfillmentTime,
    supplierPerformance,
    customerIssues,
  ] = await Promise.all([
    getOrderStatusDistribution(),
    getPendingOrders(),
    getDeliveryPerformance(),
    getInventoryStatus(),
    getReturnRate(),
    getFulfillmentTime(),
    getSupplierPerformance(),
    getCustomerIssues(),
  ]);

  const dashboardData = {
    statusCards: [
      {
        title: "Pending Orders",
        value: pendingOrders.count,
        status:
          pendingOrders.count > 50
            ? "critical"
            : pendingOrders.count > 20
            ? "warning"
            : "good",
        icon: "⏳",
      },
      {
        title: "On-Time Delivery",
        value: `${deliveryPerformance.onTimeRate.toFixed(1)}%`,
        status: deliveryPerformance.onTimeRate < 90 ? "warning" : "good",
        icon: "🚚",
      },
      {
        title: "Return Rate",
        value: `${returnRate.rate.toFixed(1)}%`,
        status: returnRate.rate > 10 ? "warning" : "good",
        icon: "↩️",
      },
      {
        title: "Avg Fulfillment Time",
        value: `${fulfillmentTime.avgHours.toFixed(1)} hours`,
        status: fulfillmentTime.avgHours > 24 ? "warning" : "good",
        icon: "⏱️",
      },
    ],

    orderQueue: {
      title: "Order Processing Queue",
      data: pendingOrders.orders.map((order) => ({
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        amount: order.amount,
        status: order.status,
        age: order.age,
        priority: order.priority,
      })),
      columns: [
        "Order #",
        "Customer",
        "Items",
        "Amount",
        "Status",
        "Age",
        "Priority",
      ],
    },

    orderStatusDistribution: {
      title: "Order Status Distribution",
      data: orderStatus.map((status) => ({
        status: status._id,
        count: status.count,
        value: status.totalValue,
      })),
      type: "pie",
    },

    deliveryPerformance: {
      title: "Delivery Performance by Carrier",
      data: deliveryPerformance.carriers.map((carrier) => ({
        carrier: carrier._id,
        orders: carrier.orders,
        onTimeRate: carrier.onTimeRate,
        avgDeliveryDays: carrier.avgDeliveryDays,
        issues: carrier.issues,
      })),
      columns: ["Carrier", "Orders", "On-Time %", "Avg Delivery Days", "Issues"],
    },

    inventoryStatus: {
      title: "Inventory Status",
      lowStock: {
        columns: ["Product", "SKU", "Current Stock", "Days Until OOS"],
        data: inventoryStatus.lowStock.map((item) => ({
          product: item.name,
          sku: item.sku,
          stock: item.stock,
          daysUntilOOS: item.daysUntilOOS.toFixed(1),
        })),
      },
      outOfStock: {
        columns: ["Product", "SKU", "Last Sale", "Days OOS"],
        data: inventoryStatus.outOfStock.map((item) => ({
          product: item.name,
          sku: item.sku,
          lastSale: item.lastSale,
          daysOOS: item.daysOOS,
        })),
      },
      overstock: {
        columns: ["Product", "SKU", "Stock", "Days of Inventory"],
        data: inventoryStatus.overstock.map((item) => ({
          product: item.name,
          sku: item.sku,
          stock: item.stock,
          daysOfInventory: item.daysOfInventory.toFixed(1),
        })),
      },
    },

    returnAnalysis: {
      title: "Return Analysis",
      reasons: returnRate.reasons.map((reason) => ({
        reason: reason._id,
        count: reason.count,
        rate: `${(reason.count / returnRate.totalReturns * 100).toFixed(1)}%`,
      })),
      products: returnRate.products.map((product) => ({
        product: product._id,
        returns: product.count,
        returnRate: `${product.returnRate.toFixed(1)}%`,
      })),
    },

    supplierPerformance: {
      title: "Supplier Performance",
      data: supplierPerformance.map((supplier) => ({
        supplier: supplier._id,
        onTimeRate: `${supplier.onTimeRate.toFixed(1)}%`,
        qualityRate: `${supplier.qualityRate.toFixed(1)}%`,
        leadTime: `${supplier.avgLeadTime.toFixed(1)} days`,
        orders: supplier.orderCount,
      })),
      columns: [
        "Supplier",
        "On-Time %",
        "Quality %",
        "Lead Time",
        "Orders",
      ],
    },

    customerIssues: {
      title: "Customer Issues",
      data: customerIssues.map((issue) => ({
        type: issue._id,
        count: issue.count,
        open: issue.open,
        resolved: issue.resolved,
        avgResolutionTime: `${issue.avgResolutionTime.toFixed(1)} hours`,
      })),
      columns: [
        "Issue Type",
        "Total",
        "Open",
        "Resolved",
        "Avg Resolution Time",
      ],
    },

    hourlyOrderTrend: {
      title: "Orders by Hour (Today vs Yesterday)",
      data: await getHourlyOrderTrend(),
      type: "area",
    },

    metadata: {
      generatedAt: new Date().toISOString(),
      cacheTTL: CACHE_TTL,
    },
  };

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(dashboardData), { ex: CACHE_TTL });

  return dashboardData;
};

/**
 * Get Real-time Metrics
 */
export const getRealtimeMetrics = async () => {
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}realtime`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get real-time metrics
  const [
    activeUsers,
    currentRevenue,
    currentOrders,
    cartAbandonment,
    topProducts,
    trafficSources,
  ] = await Promise.all([
    getActiveUsers("now"),
    getRevenueMetrics("hour"),
    getOrderCount("hour"),
    getCartAbandonmentRate("hour"),
    getTopProducts("hour", "views", 5),
    getTrafficBySource("hour"),
  ]);

  const realtimeData = {
    activeUsers: {
      current: activeUsers,
      trend: "stable", // Would calculate from previous hour
    },
    revenue: {
      current: currentRevenue.totalRevenue,
      hourlyTrend: await getRevenueTrend("24h", "hourly"),
    },
    orders: {
      current: currentOrders,
      hourly: await getOrderTrend("24h", "hourly"),
    },
    conversion: {
      current: await getConversionRate("hour"),
      funnel: await getFunnelData("hour"),
    },
    cartAbandonment: {
      rate: cartAbandonment.abandonmentRate,
      abandonedCarts: await getAbandonedCarts(5, 0, "hour"),
    },
    topProducts: {
      viewed: topProducts,
    },
    trafficSources: {
      current: trafficSources.slice(0, 5),
    },
    alerts: await getActiveAlerts(5, "critical"),
    timestamp: new Date().toISOString(),
  };

  // Cache for very short time (30 seconds)
  await redis.set(cacheKey, JSON.stringify(realtimeData), { ex: 30 });

  return realtimeData;
};

/**
 * Get Dashboard Alerts
 */
export const getDashboardAlerts = async (limit = 10) => {
  const alerts = await redis.zrange(ALERTS_CACHE_KEY, 0, limit - 1, "WITHSCORES");

  return alerts
    .reverse() // Newest first
    .map((alert) => {
      try {
        return JSON.parse(alert);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
};

/**
 * Helper: Get Revenue by Category
 */
const getRevenueByCategory = async () => {
  const result = await Order.aggregate([
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "categories",
        localField: "product.category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category._id",
        name: { $first: "$category.en.name" },
        nameAr: { $first: "$category.ar.name" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  return result;
};

/**
 * Helper: Get User Acquisition
 */
const getUserAcquisition = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const newUsers = await User.countDocuments({
    createdAt: { $gte: start, $lte: end },
  });

  const prevPeriodStart = new Date(start);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - 30);
  const prevPeriodEnd = new Date(start);
  prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);

  const prevNewUsers = await User.countDocuments({
    createdAt: { $gte: prevPeriodStart, $lte: prevPeriodEnd },
  });

  const growthPercentage =
    prevNewUsers > 0
      ? ((newUsers - prevNewUsers) / prevNewUsers) * 100
      : newUsers > 0
      ? 100
      : 0;

  const dailyData = await User.aggregate([
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

  return {
    newUsers,
    growthPercentage,
    data: dailyData.map((day) => ({
      date: new Date(day._id.year, day._id.month - 1, day._id.day),
      users: day.count,
    })),
  };
};

/**
 * Helper: Get Marketing ROI
 */
const getMarketingROI = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const result = await Event.aggregate([
    {
      $match: {
        eventName: "order_placed",
        timestamp: { $gte: start, $lte: end },
        "attribution.campaign": { $exists: true },
      },
    },
    {
      $group: {
        _id: "$attribution.campaign",
        revenue: { $sum: "$order.totalAmount" },
        orders: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "events",
        let: { campaign: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$attribution.campaign", "$$campaign"] },
              eventName: "session_start",
              timestamp: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              sessions: { $sum: 1 },
              users: { $addToSet: "$userId" },
            },
          },
          {
            $project: {
              sessions: 1,
              uniqueUsers: { $size: "$users" },
            },
          },
        ],
        as: "sessions",
      },
    },
    {
      $unwind: {
        path: "$sessions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        sessions: { $ifNull: ["$sessions.sessions", 0] },
        uniqueUsers: { $ifNull: ["$sessions.uniqueUsers", 0] },
        cpa: {
          $cond: [
            { $gt: ["$sessions.uniqueUsers", 0] },
            { $divide: ["$revenue", "$sessions.uniqueUsers"] },
            0,
          ],
        },
        roi: {
          $cond: [
            { $gt: ["$sessions.sessions", 0] },
            { $divide: ["$revenue", "$sessions.sessions"] },
            0,
          ],
        },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return result;
};

/**
 * Helper: Get Top Landing Pages
 */
const getTopLandingPages = async (period = "30d") => {
  const { start, end } = getDateRange(period);

  const result = await Event.aggregate([
    {
      $match: {
        eventName: "session_start",
        timestamp: { $gte: start, $lte: end },
        "page.url": { $exists: true },
      },
    },
    {
      $group: {
        _id: "$page.url",
        sessions: { $sum: 1 },
        users: { $addToSet: "$userId" },
        orders: {
          $sum: {
            $cond: [
              { $eq: ["$eventName", "order_placed"] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        uniqueUsers: { $size: "$users" },
        bounceRate: {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$sessions", "$uniqueUsers"] },
                "$sessions",
              ],
            },
            100,
          ],
        },
        conversionRate: {
          $cond: [
            { $gt: ["$sessions", 0] },
            { $multiply: [{ $divide: ["$orders", "$sessions"] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { sessions: -1 } },
    { $limit: 10 },
  ]);

  return result;
};

/**
 * Helper: Get Email Performance
 */
const getEmailPerformance = async (period = "30d") => {
  // In a real implementation, this would come from your email service provider API
  // This is mock data for demonstration
  return {
    openRate: 28.5,
    clickRate: 12.3,
    conversionRate: 4.2,
    growth: 5.2,
    clickGrowth: 3.1,
    conversionGrowth: 2.8,
    campaigns: [
      {
        name: "Summer Sale",
        sent: 15000,
        opened: 4200,
        clicked: 1800,
        converted: 630,
        openRate: 28.0,
        clickRate: 12.0,
        conversionRate: 4.2,
      },
      {
        name: "New Arrivals",
        sent: 12000,
        opened: 3500,
        clicked: 1500,
        converted: 500,
        openRate: 29.2,
        clickRate: 12.5,
        conversionRate: 4.2,
      },
    ],
  };
};

/**
 * Helper: Get Order Status Distribution
 */
const getOrderStatusDistribution = async () => {
  const result = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalValue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return result;
};

/**
 * Helper: Get Pending Orders
 */
const getPendingOrders = async () => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const orders = await Order.find({
    status: { $in: ["pending", "processing"] },
    createdAt: { $gte: twentyFourHoursAgo },
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .populate("user", "firstName lastName email phone")
    .lean();

  return {
    count: orders.length,
    orders: orders.map((order) => ({
      orderNumber: order.orderNumber,
      customer: `${order.user.firstName} ${order.user.lastName}`,
      email: order.user.email,
      phone: order.user.phone,
      items: order.items.length,
      amount: order.totalAmount,
      status: order.status,
      age: Math.floor((now - order.createdAt) / (1000 * 60 * 60)), // hours
      priority:
        order.status === "pending" && order.createdAt < twentyFourHoursAgo
          ? "high"
          : "normal",
    })),
  };
};

/**
 * Helper: Get Delivery Performance
 */
const getDeliveryPerformance = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await Order.aggregate([
    {
      $match: {
        status: { $in: ["delivered", "shipped"] },
        shippingCarrier: { $exists: true },
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $addFields: {
        deliveryTime: {
          $divide: [
            { $subtract: ["$deliveredAt", "$shippedAt"] },
            1000 * 60 * 60 * 24,
          ],
        },
        isOnTime: {
          $cond: [
            { $lte: ["$deliveryTime", "$estimatedDeliveryDays"] },
            1,
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$shippingCarrier",
        orders: { $sum: 1 },
        onTimeDeliveries: { $sum: "$isOnTime" },
        avgDeliveryDays: { $avg: "$deliveryTime" },
        issues: { $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } },
      },
    },
    {
      $addFields: {
        onTimeRate: {
          $multiply: [{ $divide: ["$onTimeDeliveries", "$orders"] }, 100],
        },
      },
    },
    { $sort: { orders: -1 } },
  ]);

  return {
    onTimeRate: result.reduce(
      (sum, carrier) => sum + (carrier.onTimeRate * carrier.orders) / 100,
      0
    ),
    carriers: result,
  };
};

/**
 * Helper: Get Inventory Status
 */
const getInventoryStatus = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [lowStock, outOfStock, overstock] = await Promise.all([
    // Low stock items (less than 10, more than 0)
    Product.aggregate([
      {
        $match: {
          stock: { $lte: 10, $gt: 0 },
          status: "active",
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
                createdAt: { $gte: thirtyDaysAgo },
              },
            },
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
              },
            },
            {
              $group: {
                _id: null,
                dailySales: {
                  $avg: {
                    $divide: [
                      { $sum: "$items.quantity" },
                      {
                        $divide: [
                          { $subtract: [new Date(), thirtyDaysAgo] },
                          1000 * 60 * 60 * 24,
                        ],
                      },
                    ],
                  },
                },
              },
            },
          ],
          as: "salesData",
        },
      },
      {
        $addFields: {
          daysUntilOOS: {
            $cond: [
              { $gt: [{ $size: "$salesData" }, 0] },
              {
                $divide: [
                  "$stock",
                  { $arrayElemAt: ["$salesData.dailySales", 0] },
                ],
              },
              999, // If no sales data, assume not urgent
            ],
          },
        },
      },
      { $sort: { daysUntilOOS: 1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$en.name",
          sku: "$sku",
          stock: 1,
          daysUntilOOS: 1,
        },
      },
    ]),

    // Out of stock items
    Product.aggregate([
      {
        $match: {
          stock: 0,
          status: "active",
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "lastOrder",
        },
      },
      {
        $addFields: {
          lastSale: {
            $cond: [
              { $gt: [{ $size: "$lastOrder" }, 0] },
              { $arrayElemAt: ["$lastOrder.createdAt", 0] },
              null,
            ],
          },
          daysOOS: {
            $cond: [
              { $gt: [{ $size: "$lastOrder" }, 0] },
              {
                $divide: [
                  { $subtract: [new Date(), { $arrayElemAt: ["$lastOrder.createdAt", 0] }] },
                  1000 * 60 * 60 * 24,
                ],
              },
              999,
            ],
          },
        },
      },
      { $sort: { daysOOS: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$en.name",
          sku: "$sku",
          lastSale: {
            $cond: [
              "$lastSale",
              { $dateToString: { format: "%Y-%m-%d", date: "$lastSale" } },
              "Never",
            ],
          },
          daysOOS: 1,
        },
      },
    ]),

    // Overstock items (more than 90 days of inventory)
    Product.aggregate([
      {
        $match: {
          stock: { $gt: 0 },
          status: "active",
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
                createdAt: { $gte: thirtyDaysAgo },
              },
            },
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
              },
            },
            {
              $group: {
                _id: null,
                dailySales: {
                  $avg: {
                    $divide: [
                      { $sum: "$items.quantity" },
                      {
                        $divide: [
                          { $subtract: [new Date(), thirtyDaysAgo] },
                          1000 * 60 * 60 * 24,
                        ],
                      },
                    ],
                  },
                },
              },
            },
          ],
          as: "salesData",
        },
      },
      {
        $addFields: {
          daysOfInventory: {
            $cond: [
              { $gt: [{ $size: "$salesData" }, 0] },
              {
                $divide: [
                  "$stock",
                  { $arrayElemAt: ["$salesData.dailySales", 0] },
                ],
              },
              999, // If no sales data, assume not overstock
            ],
          },
        },
      },
      {
        $match: {
          daysOfInventory: { $gt: 90 },
        },
      },
      { $sort: { daysOfInventory: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$en.name",
          sku: "$sku",
          stock: 1,
          daysOfInventory: 1,
        },
      },
    ]),
  ]);

  return {
    lowStock: lowStock,
    outOfStock: outOfStock,
    overstock: overstock,
  };
};

/**
 * Helper: Get Return Rate
 */
const getReturnRate = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalReturns, returnReasons, returnProducts] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: "returned",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalValue: { $sum: "$totalAmount" },
        },
      },
    ]),

    Order.aggregate([
      {
        $match: {
          status: "returned",
          createdAt: { $gte: thirtyDaysAgo },
          returnReason: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$returnReason",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),

    Order.aggregate([
      {
        $match: {
          status: "returned",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
                createdAt: { $gte: thirtyDaysAgo },
              },
            },
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
              },
            },
            { $count: "totalSales" },
          ],
          as: "sales",
        },
      },
      {
        $addFields: {
          returnRate: {
            $multiply: [
              {
                $divide: [
                  "$count",
                  { $ifNull: [{ $arrayElemAt: ["$sales.totalSales", 0] }, 1] },
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { returnRate: -1 } },
      { $limit: 10 },
      {
        $project: {
          product: "$product.en.name",
          returns: "$count",
          returnRate: 1,
        },
      },
    ]),
  ]);

  const totalOrders = await Order.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  return {
    rate:
      totalReturns[0]?.count > 0
        ? (totalReturns[0].count / totalOrders) * 100
        : 0,
    totalReturns: totalReturns[0]?.count || 0,
    totalValue: totalReturns[0]?.totalValue || 0,
    reasons: returnReasons,
    products: returnProducts,
  };
};

/**
 * Helper: Get Fulfillment Time
 */
const getFulfillmentTime = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await Order.aggregate([
    {
      $match: {
        status: { $in: ["delivered", "shipped"] },
        createdAt: { $gte: thirtyDaysAgo },
        shippedAt: { $exists: true },
      },
    },
    {
      $addFields: {
        fulfillmentTime: {
          $divide: [
            { $subtract: ["$shippedAt", "$createdAt"] },
            1000 * 60 * 60, // Convert to hours
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgHours: { $avg: "$fulfillmentTime" },
        maxHours: { $max: "$fulfillmentTime" },
        minHours: { $min: "$fulfillmentTime" },
      },
    },
  ]);

  return {
    avgHours: result[0]?.avgHours || 0,
    maxHours: result[0]?.maxHours || 0,
    minHours: result[0]?.minHours || 0,
  };
};

/**
 * Helper: Get Supplier Performance
 */
const getSupplierPerformance = async () => {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: ninetyDaysAgo },
        supplier: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "products",
      },
    },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$supplier",
        orderCount: { $sum: 1 },
        onTimeDeliveries: {
          $sum: {
            $cond: [
              {
                $lte: [
                  {
                    $divide: [
                      { $subtract: ["$deliveredAt", "$shippedAt"] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  "$products.estimatedDeliveryDays",
                ],
              },
              1,
              0,
            ],
          },
        },
        qualityIssues: {
          $sum: {
            $cond: [
              { $eq: ["$status", "returned"] },
              1,
              0,
            ],
          },
        },
        leadTime: {
          $avg: {
            $divide: [
              { $subtract: ["$shippedAt", "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        onTimeRate: {
          $multiply: [
            { $divide: ["$onTimeDeliveries", "$orderCount"] },
            100,
          ],
        },
        qualityRate: {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$orderCount", "$qualityIssues"] },
                "$orderCount",
              ],
            },
            100,
          ],
        },
      },
    },
    { $sort: { onTimeRate: -1 } },
  ]);

  return result;
};

/**
 * Helper: Get Customer Issues
 */
const getCustomerIssues = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await Order.aggregate([
    {
      $match: {
        $or: [
          { status: "cancelled" },
          { status: "returned" },
          { customerIssues: { $exists: true, $ne: [] } },
        ],
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    { $unwind: "$customerIssues" },
    {
      $group: {
        _id: "$customerIssues.type",
        count: { $sum: 1 },
        open: {
          $sum: {
            $cond: [
              { $eq: ["$customerIssues.status", "open"] },
              1,
              0,
            ],
          },
        },
        resolved: {
          $sum: {
            $cond: [
              { $eq: ["$customerIssues.status", "resolved"] },
              1,
              0,
            ],
          },
        },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $eq: ["$customerIssues.status", "resolved"] },
              {
                $divide: [
                  {
                    $subtract: [
                      "$customerIssues.resolvedAt",
                      "$customerIssues.createdAt",
                    ],
                  },
                  1000 * 60 * 60, // Convert to hours
                ],
              },
              null,
            ],
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return result;
};

/**
 * Helper: Get Hourly Order Trend
 */
const getHourlyOrderTrend = async () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [todayOrders, yesterdayOrders] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
        },
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
      { $project: { hour: "$_id", count: 1, _id: 0 } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday, $lt: today },
        },
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
      { $project: { hour: "$_id", count: 1, _id: 0 } },
    ]),
  ]);

  // Format data for 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const todayData = hours.map((hour) => {
    const found = todayOrders.find((h) => h.hour === hour);
    return found ? found.count : 0;
  });
  const yesterdayData = hours.map((hour) => {
    const found = yesterdayOrders.find((h) => h.hour === hour);
    return found ? found.count : 0;
  });

  return {
    labels: hours.map((h) => `${h}:00`),
    today: todayData,
    yesterday: yesterdayData,
  };
};

/**
 * Helper: Get Order Count for Period
 */
const getOrderCount = async (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "hour":
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
  }

  return await Order.countDocuments({
    createdAt: { $gte: startDate },
  });
};

/**
 * Helper: Get Order Trend
 */
const getOrderTrend = async (period, granularity) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const groupBy =
    granularity === "hourly"
      ? {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          hour: { $hour: "$createdAt" },
        }
      : {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id": 1 } },
  ]);

  return result;
};

/**
 * Helper: Get Date Range
 */
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
    case "hour":
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      return { start: oneHourAgo, end: now };
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
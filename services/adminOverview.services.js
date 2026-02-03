import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import ChatSession from "../models/chatSession.model.js";
import SupportTicket from "../models/ticket.model.js";
import mongoose from "mongoose";
import { RedisHelper } from "../config/redis.js";

const OVERVIEW_CACHE_KEY = "admin:overview";
const OVERVIEW_CACHE_TTL = 300; // 5 minutes

// ============================================================
// HELPERS
// ============================================================

function buildDateFilter(dateFrom, dateTo) {
  const filter = {};
  if (dateFrom) filter.$gte = new Date(dateFrom);
  if (dateTo) filter.$lte = new Date(dateTo);
  return Object.keys(filter).length > 0 ? filter : null;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================================
// MAIN OVERVIEW
// ============================================================

export async function getAdminOverview(params = {}) {
  const { dateFrom, dateTo, noCache } = params;

  // Check cache (skip if date filters or noCache)
  if (!dateFrom && !dateTo && !noCache) {
    try {
      const cached = await RedisHelper.get(OVERVIEW_CACHE_KEY);
      if (cached) {
        return {
          fromCache: true,
          data: typeof cached === "string" ? JSON.parse(cached) : cached,
        };
      }
    } catch (_) {}
  }

  const dateFilter = buildDateFilter(dateFrom, dateTo);

  // Run all aggregations in parallel
  const [orders, customers, products, chat, tickets, crossDomain] =
    await Promise.all([
      aggregateOrders(dateFilter),
      aggregateCustomers(dateFilter),
      aggregateProducts(),
      aggregateChat(dateFilter),
      aggregateTickets(dateFilter),
      aggregateCrossDomain(dateFilter),
    ]);

  const data = {
    generatedAt: new Date(),
    dateRange: {
      from: dateFrom || null,
      to: dateTo || null,
    },
    kpis: buildKPIs(orders, customers, chat, tickets),
    orders,
    customers,
    products,
    chat,
    tickets,
    crossDomain,
  };

  // Cache result (only when no date filter)
  if (!dateFrom && !dateTo) {
    try {
      await RedisHelper.set(OVERVIEW_CACHE_KEY, JSON.stringify(data), {
        ex: OVERVIEW_CACHE_TTL,
      });
    } catch (_) {}
  }

  return { fromCache: false, data };
}

// ============================================================
// KPIs (Top Cards)
// ============================================================

function buildKPIs(orders, customers, chat, tickets) {
  return {
    totalRevenue: orders.totalRevenue,
    totalOrders: orders.totalOrders,
    averageOrderValue: orders.averageOrderValue,
    totalCustomers: customers.totalCustomers,
    newCustomersLast30Days: customers.newCustomersLast30Days,
    totalChatSessions: chat.totalSessions,
    totalTickets: tickets.total,
    aiResolutionRate: tickets.aiResolutionRate,
  };
}

// ============================================================
// 1. ORDERS ANALYTICS
// ============================================================

async function aggregateOrders(dateFilter) {
  const matchBase = { isActive: true };
  if (dateFilter) matchBase.createdAt = dateFilter;

  const [stats] = await Order.aggregate([
    { $match: matchBase },
    {
      $facet: {
        // Key metrics
        totals: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$totalPrice" },
              avgOrderValue: { $avg: "$totalPrice" },
            },
          },
        ],

        // By status
        byStatus: [
          { $group: { _id: "$orderStatus", count: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
          { $sort: { count: -1 } },
        ],

        // By payment status
        byPaymentStatus: [
          { $group: { _id: "$paymentStatus", count: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
        ],

        // By payment method
        byPaymentMethod: [
          { $group: { _id: "$paymentMethod", count: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
          { $sort: { revenue: -1 } },
        ],

        // Orders per day (heatmap) — last 90 days
        ordersPerDay: [
          { $match: { createdAt: { $gte: daysAgo(90) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
              revenue: { $sum: "$totalPrice" },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // Top customers
        topCustomers: [
          {
            $group: {
              _id: "$user",
              totalSpent: { $sum: "$totalPrice" },
              ordersCount: { $sum: 1 },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: 1,
              totalSpent: 1,
              ordersCount: 1,
              name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
              email: "$user.email",
              phone: "$user.phone",
            },
          },
        ],

        // Top selling products
        topProducts: [
          { $unwind: "$orderItems" },
          {
            $group: {
              _id: "$orderItems.product",
              totalQuantity: { $sum: "$orderItems.quantity" },
              totalRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
              ordersCount: { $sum: 1 },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              totalQuantity: 1,
              totalRevenue: 1,
              ordersCount: 1,
              title: { $ifNull: ["$product.en.title", "$product.ar.title"] },
              sku: "$product.sku",
            },
          },
        ],

        // Top cities
        topCities: [
          {
            $group: {
              _id: "$shippingAddress.city",
              ordersCount: { $sum: 1 },
              revenue: { $sum: "$totalPrice" },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const t = stats.totals[0] || {};

  return {
    totalOrders: t.totalOrders || 0,
    totalRevenue: Math.round((t.totalRevenue || 0) * 100) / 100,
    averageOrderValue: Math.round((t.avgOrderValue || 0) * 100) / 100,
    byStatus: Object.fromEntries((stats.byStatus || []).map((s) => [s._id, { count: s.count, revenue: s.revenue }])),
    byPaymentStatus: Object.fromEntries((stats.byPaymentStatus || []).map((s) => [s._id, { count: s.count, revenue: s.revenue }])),
    byPaymentMethod: Object.fromEntries((stats.byPaymentMethod || []).map((s) => [s._id, { count: s.count, revenue: s.revenue }])),
    ordersPerDay: stats.ordersPerDay || [],
    topCustomers: stats.topCustomers || [],
    topProducts: stats.topProducts || [],
    topCities: stats.topCities || [],
  };
}

// ============================================================
// 2. CUSTOMER INSIGHTS
// ============================================================

async function aggregateCustomers(dateFilter) {
  const matchBase = { status: "active" };

  const [stats] = await User.aggregate([
    { $match: matchBase },
    {
      $facet: {
        total: [{ $count: "count" }],

        newLast30Days: [
          { $match: { createdAt: { $gte: daysAgo(30) } } },
          { $count: "count" },
        ],

        // Registrations per day (last 30 days)
        registrationsPerDay: [
          { $match: { createdAt: { $gte: daysAgo(30) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // By city
        byCity: [
          { $group: { _id: "$address", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  // Returning customers (users with > 1 order)
  const [returningStats] = await Order.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$user", ordersCount: { $sum: 1 } } },
    {
      $facet: {
        totalBuyers: [{ $count: "count" }],
        returning: [
          { $match: { ordersCount: { $gt: 1 } } },
          { $count: "count" },
        ],
        avgOrdersPerCustomer: [
          { $group: { _id: null, avg: { $avg: "$ordersCount" } } },
        ],
        // Top by lifetime value
        topByLTV: [
          {
            $lookup: {
              from: "orders",
              let: { userId: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$user", "$$userId"] }, isActive: true } },
                { $group: { _id: null, ltv: { $sum: "$totalPrice" } } },
              ],
              as: "orderData",
            },
          },
          { $unwind: "$orderData" },
          { $sort: { "orderData.ltv": -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
              email: "$user.email",
              ordersCount: 1,
              lifetimeValue: "$orderData.ltv",
            },
          },
        ],
      },
    },
  ]);

  const totalCustomers = stats.total[0]?.count || 0;
  const totalBuyers = returningStats.totalBuyers[0]?.count || 0;
  const returningCount = returningStats.returning[0]?.count || 0;
  const returningRate = totalBuyers > 0 ? Math.round((returningCount / totalBuyers) * 100) : 0;

  return {
    totalCustomers,
    newCustomersLast30Days: stats.newLast30Days[0]?.count || 0,
    totalBuyers,
    returningCustomers: returningCount,
    returningRate: `${returningRate}%`,
    averageOrdersPerCustomer:
      Math.round((returningStats.avgOrdersPerCustomer[0]?.avg || 0) * 10) / 10,
    registrationsPerDay: stats.registrationsPerDay || [],
    byCity: stats.byCity || [],
    topByLifetimeValue: returningStats.topByLTV || [],
  };
}

// ============================================================
// 3. PRODUCT ANALYTICS
// ============================================================

async function aggregateProducts() {
  const [stats] = await Product.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              activeProducts: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
              },
              outOfStock: {
                $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] },
              },
              lowStock: {
                $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 5] }] }, 1, 0] },
              },
              totalViews: { $sum: "$views" },
              avgRating: { $avg: "$ratingsAverage" },
            },
          },
        ],

        topByViews: [
          { $match: { status: "active" } },
          { $sort: { views: -1 } },
          { $limit: 10 },
          {
            $project: {
              title: { $ifNull: ["$en.title", "$ar.title"] },
              sku: 1,
              views: 1,
              salesCount: 1,
              stock: 1,
              ratingsAverage: 1,
            },
          },
        ],

        topBySales: [
          { $match: { status: "active" } },
          { $sort: { salesCount: -1 } },
          { $limit: 10 },
          {
            $project: {
              title: { $ifNull: ["$en.title", "$ar.title"] },
              sku: 1,
              salesCount: 1,
              price: 1,
              stock: 1,
            },
          },
        ],

        byTag: [
          { $unwind: "$tags" },
          { $group: { _id: "$tags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],

        // Low stock alerts
        lowStockProducts: [
          { $match: { status: "active", stock: { $gt: 0, $lte: 5 } } },
          { $sort: { stock: 1 } },
          { $limit: 10 },
          {
            $project: {
              title: { $ifNull: ["$en.title", "$ar.title"] },
              sku: 1,
              stock: 1,
            },
          },
        ],
      },
    },
  ]);

  const t = stats.totals[0] || {};

  return {
    totalProducts: t.totalProducts || 0,
    activeProducts: t.activeProducts || 0,
    outOfStock: t.outOfStock || 0,
    lowStock: t.lowStock || 0,
    totalViews: t.totalViews || 0,
    averageRating: Math.round((t.avgRating || 0) * 10) / 10,
    topByViews: stats.topByViews || [],
    topBySales: stats.topBySales || [],
    byTag: Object.fromEntries((stats.byTag || []).map((t) => [t._id, t.count])),
    lowStockAlerts: stats.lowStockProducts || [],
  };
}

// ============================================================
// 4. CHAT ANALYTICS
// ============================================================

async function aggregateChat(dateFilter) {
  const chatMatch = dateFilter ? { createdAt: dateFilter } : {};

  const [stats] = await ChatSession.aggregate([
    { $match: chatMatch },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              avgMessages: { $avg: "$messageCount" },
            },
          },
        ],

        active: [{ $match: { status: "active" } }, { $count: "count" }],
        closed: [{ $match: { status: "closed" } }, { $count: "count" }],
        uniqueUsers: [{ $group: { _id: "$user" } }, { $count: "count" }],

        withTickets: [
          { $match: { "summary.linkedTicket": { $ne: null } } },
          { $count: "count" },
        ],

        // Avg session duration
        avgDuration: [
          { $match: { endedAt: { $ne: null }, startedAt: { $ne: null } } },
          {
            $project: {
              durationMin: { $divide: [{ $subtract: ["$endedAt", "$startedAt"] }, 60000] },
            },
          },
          { $group: { _id: null, avg: { $avg: "$durationMin" } } },
        ],

        // Top intents
        topIntents: [
          { $match: { "summary.detectedIntent": { $ne: null } } },
          { $group: { _id: "$summary.detectedIntent", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],

        // Chat activity per day (heatmap)
        sessionsPerDay: [
          { $match: { createdAt: { $gte: daysAgo(30) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              sessions: { $sum: 1 },
              messages: { $sum: "$messageCount" },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // Most asked products
        mostAskedProducts: [
          { $match: { "summary.relatedProducts.0": { $exists: true } } },
          { $unwind: "$summary.relatedProducts" },
          { $group: { _id: "$summary.relatedProducts", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              productId: "$_id",
              title: { $ifNull: ["$product.en.title", "$product.ar.title"] },
              sku: "$product.sku",
              count: 1,
            },
          },
        ],
      },
    },
  ]);

  const t = stats.totals[0] || {};
  const totalSessions = t.totalSessions || 0;
  const withTicketsCount = stats.withTickets[0]?.count || 0;
  const escalationRate =
    totalSessions > 0 ? Math.round((withTicketsCount / totalSessions) * 100) : 0;

  return {
    totalSessions,
    activeSessions: stats.active[0]?.count || 0,
    closedSessions: stats.closed[0]?.count || 0,
    uniqueUsers: stats.uniqueUsers[0]?.count || 0,
    averageMessagesPerSession: Math.round((t.avgMessages || 0) * 10) / 10,
    averageSessionDurationMinutes: Math.round((stats.avgDuration[0]?.avg || 0) * 10) / 10,
    escalatedToTicket: withTicketsCount,
    escalationRate: `${escalationRate}%`,
    topIntents: stats.topIntents || [],
    sessionsPerDay: stats.sessionsPerDay || [],
    mostAskedProducts: stats.mostAskedProducts || [],
  };
}

// ============================================================
// 5. TICKET ANALYTICS
// ============================================================

async function aggregateTickets(dateFilter) {
  const ticketMatch = dateFilter ? { createdAt: dateFilter } : {};

  const [stats] = await SupportTicket.aggregate([
    { $match: ticketMatch },
    {
      $facet: {
        total: [{ $count: "count" }],

        byStatus: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],

        byCategory: [
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],

        byPriority: [
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ],

        aiResolved: [{ $match: { aiResolved: true } }, { $count: "count" }],

        needsHumanReview: [
          { $match: { needsHumanReview: true, status: { $nin: ["resolved", "closed"] } } },
          { $count: "count" },
        ],

        repeatIssues: [{ $match: { isRepeatIssue: true } }, { $count: "count" }],

        // Avg resolution time
        avgResolutionTime: [
          { $match: { resolvedAt: { $ne: null } } },
          {
            $project: {
              hours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] },
            },
          },
          { $group: { _id: null, avg: { $avg: "$hours" } } },
        ],

        // Avg response time
        avgResponseTime: [
          { $match: { respondedAt: { $ne: null } } },
          {
            $project: {
              hours: { $divide: [{ $subtract: ["$respondedAt", "$createdAt"] }, 3600000] },
            },
          },
          { $group: { _id: null, avg: { $avg: "$hours" } } },
        ],

        // By resolvedBy (ai vs human)
        byResolvedBy: [
          { $match: { resolvedBy: { $ne: null } } },
          { $group: { _id: "$resolvedBy", count: { $sum: 1 } } },
        ],

        // Tickets per day (heatmap)
        ticketsPerDay: [
          { $match: { createdAt: { $gte: daysAgo(30) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // Top complaint types
        topComplaintTypes: [
          { $group: { _id: "$supportType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const totalTickets = stats.total[0]?.count || 0;
  const aiResolvedCount = stats.aiResolved[0]?.count || 0;
  const aiRate = totalTickets > 0 ? Math.round((aiResolvedCount / totalTickets) * 100) : 0;

  return {
    total: totalTickets,
    byStatus: Object.fromEntries((stats.byStatus || []).map((s) => [s._id, s.count])),
    byCategory: Object.fromEntries((stats.byCategory || []).map((c) => [c._id, c.count])),
    byPriority: Object.fromEntries((stats.byPriority || []).map((p) => [p._id, p.count])),
    aiResolved: aiResolvedCount,
    aiResolutionRate: `${aiRate}%`,
    needsHumanReview: stats.needsHumanReview[0]?.count || 0,
    repeatIssues: stats.repeatIssues[0]?.count || 0,
    averageResolutionTimeHours: Math.round((stats.avgResolutionTime[0]?.avg || 0) * 10) / 10,
    averageResponseTimeHours: Math.round((stats.avgResponseTime[0]?.avg || 0) * 10) / 10,
    byResolvedBy: Object.fromEntries((stats.byResolvedBy || []).map((r) => [r._id, r.count])),
    ticketsPerDay: stats.ticketsPerDay || [],
    topComplaintTypes: stats.topComplaintTypes || [],
  };
}

// ============================================================
// 6. CROSS-DOMAIN INSIGHTS
// ============================================================

async function aggregateCrossDomain(dateFilter) {
  const ticketMatch = dateFilter ? { createdAt: dateFilter } : {};

  // Products generating the most tickets
  const productsWithMostTickets = await SupportTicket.aggregate([
    { $match: { ...ticketMatch, orderNumber: { $ne: null } } },
    {
      $lookup: {
        from: "orders",
        let: { orderNum: "$orderNumber" },
        pipeline: [
          { $match: { $expr: { $eq: ["$orderNumber", "$$orderNum"] } } },
          { $unwind: "$orderItems" },
          { $project: { productId: "$orderItems.product" } },
        ],
        as: "orderData",
      },
    },
    { $unwind: "$orderData" },
    {
      $group: {
        _id: "$orderData.productId",
        ticketCount: { $sum: 1 },
      },
    },
    { $sort: { ticketCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: "$_id",
        title: { $ifNull: ["$product.en.title", "$product.ar.title"] },
        sku: "$product.sku",
        ticketCount: 1,
      },
    },
  ]);

  // Cities generating the most complaints
  const citiesWithMostComplaints = await SupportTicket.aggregate([
    { $match: { ...ticketMatch, "customer.userId": { $ne: null } } },
    {
      $lookup: {
        from: "users",
        localField: "customer.userId",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
    { $match: { "userInfo.address": { $ne: null } } },
    {
      $group: {
        _id: "$userInfo.address",
        ticketCount: { $sum: 1 },
      },
    },
    { $sort: { ticketCount: -1 } },
    { $limit: 10 },
  ]);

  // Sales volume vs support load (last 30 days — daily)
  const salesVsSupport = await Order.aggregate([
    { $match: { isActive: true, createdAt: { $gte: daysAgo(30) } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        orders: { $sum: 1 },
        revenue: { $sum: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const ticketsByDay = await SupportTicket.aggregate([
    { $match: { createdAt: { $gte: daysAgo(30) } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        tickets: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Merge sales + tickets by date
  const ticketMap = Object.fromEntries(ticketsByDay.map((t) => [t._id, t.tickets]));
  const salesVsSupportCorrelation = salesVsSupport.map((day) => ({
    date: day._id,
    orders: day.orders,
    revenue: day.revenue,
    tickets: ticketMap[day._id] || 0,
  }));

  // Most searched products from chat conversations (raw collection)
  let mostSearchedFromChat = [];
  try {
    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");

    mostSearchedFromChat = await conversationsCol
      .aggregate([
        { $unwind: "$lastProducts" },
        {
          $group: {
            _id: "$lastProducts._id",
            title: { $first: "$lastProducts.ar.title" },
            titleEn: { $first: "$lastProducts.en.title" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    mostSearchedFromChat = mostSearchedFromChat.map((p) => ({
      productId: p._id,
      title: p.titleEn || p.title || "Unknown",
      searchCount: p.count,
    }));
  } catch (_) {}

  return {
    productsWithMostTickets,
    mostSearchedFromChat,
    citiesWithMostComplaints,
    salesVsSupportCorrelation,
  };
}

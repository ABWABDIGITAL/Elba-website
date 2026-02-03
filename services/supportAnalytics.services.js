import ChatSession from "../models/chatSession.model.js";
import SupportTicket from "../models/ticket.model.js";
import mongoose from "mongoose";

/**
 * Get comprehensive support overview analytics combining
 * chatbot sessions, support tickets, and product search insights.
 *
 * @param {Object} params - { dateFrom, dateTo }
 * @returns {Promise<Object>} Combined analytics data
 */
export async function getSupportOverview(params = {}) {
  const dateFilter = {};
  if (params.dateFrom) dateFilter.$gte = new Date(params.dateFrom);
  if (params.dateTo) dateFilter.$lte = new Date(params.dateTo);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // ============================================================
  // 1. CHAT ANALYTICS
  // ============================================================
  const chatMatch = hasDateFilter ? { createdAt: dateFilter } : {};

  const [chatStats] = await ChatSession.aggregate([
    { $match: chatMatch },
    {
      $facet: {
        total: [{ $count: "count" }],
        active: [{ $match: { status: "active" } }, { $count: "count" }],
        closed: [{ $match: { status: "closed" } }, { $count: "count" }],
        avgMessages: [
          { $group: { _id: null, avg: { $avg: "$messageCount" } } },
        ],
        uniqueUsers: [{ $group: { _id: "$user" } }, { $count: "count" }],
        perDay: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              sessions: { $sum: 1 },
              messages: { $sum: "$messageCount" },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 30 },
        ],
        topIntents: [
          { $match: { "summary.detectedIntent": { $ne: null } } },
          {
            $group: {
              _id: "$summary.detectedIntent",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        withTickets: [
          { $match: { "summary.linkedTicket": { $ne: null } } },
          { $count: "count" },
        ],
        avgDuration: [
          { $match: { endedAt: { $ne: null }, startedAt: { $ne: null } } },
          {
            $project: {
              durationMinutes: {
                $divide: [
                  { $subtract: ["$endedAt", "$startedAt"] },
                  60000,
                ],
              },
            },
          },
          { $group: { _id: null, avg: { $avg: "$durationMinutes" } } },
        ],
      },
    },
  ]);

  // ============================================================
  // 2. TICKET ANALYTICS
  // ============================================================
  const ticketMatch = hasDateFilter ? { createdAt: dateFilter } : {};

  const [ticketStats] = await SupportTicket.aggregate([
    { $match: ticketMatch },
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byCategory: [
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
        aiResolved: [
          { $match: { aiResolved: true } },
          { $count: "count" },
        ],
        avgResolutionTime: [
          { $match: { resolvedAt: { $ne: null } } },
          {
            $project: {
              resolutionHours: {
                $divide: [
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  3600000,
                ],
              },
            },
          },
          { $group: { _id: null, avg: { $avg: "$resolutionHours" } } },
        ],
        repeatIssues: [
          { $match: { isRepeatIssue: true } },
          { $count: "count" },
        ],
        topComplaintCategories: [
          { $group: { _id: "$supportType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        ticketsPerDay: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 30 },
        ],
        // Average complaints per user
        avgComplaintsPerUser: [
          { $match: { "customer.userId": { $ne: null } } },
          { $group: { _id: "$customer.userId", count: { $sum: 1 } } },
          { $group: { _id: null, avg: { $avg: "$count" } } },
        ],
      },
    },
  ]);

  // ============================================================
  // 3. PRODUCT SEARCH INSIGHTS (from conversation data)
  // ============================================================
  let mostSearchedProducts = [];
  try {
    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");

    // Get product IDs that appear most in conversations
    const productInsights = await conversationsCol
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

    mostSearchedProducts = productInsights.map((p) => ({
      productId: p._id,
      title: p.title || p.titleEn || "Unknown",
      searchCount: p.count,
    }));
  } catch (_) {
    // Product insights are best-effort
  }

  // ============================================================
  // 4. COMPILE OVERVIEW
  // ============================================================
  const totalTickets = ticketStats.total[0]?.count || 0;
  const aiResolvedCount = ticketStats.aiResolved[0]?.count || 0;
  const aiResolutionRate =
    totalTickets > 0
      ? Math.round((aiResolvedCount / totalTickets) * 100)
      : 0;

  return {
    chat: {
      totalSessions: chatStats.total[0]?.count || 0,
      activeSessions: chatStats.active[0]?.count || 0,
      closedSessions: chatStats.closed[0]?.count || 0,
      averageMessagesPerSession:
        Math.round((chatStats.avgMessages[0]?.avg || 0) * 10) / 10,
      averageSessionDurationMinutes:
        Math.round((chatStats.avgDuration[0]?.avg || 0) * 10) / 10,
      uniqueUsers: chatStats.uniqueUsers[0]?.count || 0,
      sessionsWithTickets: chatStats.withTickets[0]?.count || 0,
      sessionsPerDay: chatStats.perDay || [],
      topIntents: chatStats.topIntents || [],
    },
    tickets: {
      total: totalTickets,
      byStatus: Object.fromEntries(
        (ticketStats.byStatus || []).map((s) => [s._id, s.count])
      ),
      byCategory: Object.fromEntries(
        (ticketStats.byCategory || []).map((c) => [c._id, c.count])
      ),
      byPriority: Object.fromEntries(
        (ticketStats.byPriority || []).map((p) => [p._id, p.count])
      ),
      aiResolved: aiResolvedCount,
      aiResolutionRate: `${aiResolutionRate}%`,
      averageResolutionTimeHours:
        Math.round((ticketStats.avgResolutionTime[0]?.avg || 0) * 10) / 10,
      repeatIssues: ticketStats.repeatIssues[0]?.count || 0,
      topComplaintCategories: ticketStats.topComplaintCategories || [],
      avgComplaintsPerUser:
        Math.round(
          (ticketStats.avgComplaintsPerUser[0]?.avg || 0) * 10
        ) / 10,
      ticketsPerDay: ticketStats.ticketsPerDay || [],
    },
    productInsights: {
      mostSearchedProducts,
    },
  };
}

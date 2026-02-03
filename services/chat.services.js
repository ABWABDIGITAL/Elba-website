import ChatSession from "../models/chatSession.model.js";
import User from "../models/user.model.js";
import { callAgent } from "../utlis/chatbotAgent.js";
import { ChatGroq } from "@langchain/groq";
import mongoose from "mongoose";
import ApiFeatures from "../utlis/apiFeatures.js";
import { NotFound, BadRequest, Forbidden } from "../utlis/apiError.js";

// ============================================================
// HELPERS
// ============================================================

function generateSessionId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `CHAT-${timestamp}-${random}`;
}

// ============================================================
// CREATE SESSION
// ============================================================

export async function createSession(userId) {
  const session = await ChatSession.create({
    sessionId: generateSessionId(),
    user: userId,
    messages: [],
    status: "active",
    messageCount: 0,
    startedAt: new Date(),
    lastActivity: new Date(),
  });

  return {
    sessionId: session.sessionId,
    status: session.status,
    startedAt: session.startedAt,
  };
}

// ============================================================
// SEND MESSAGE
// ============================================================

export async function sendMessage(sessionId, message, userId) {
  const session = await ChatSession.findOne({ sessionId });
  if (!session) throw NotFound("Chat session not found");
  if (session.user.toString() !== userId.toString()) {
    throw Forbidden("You do not own this session");
  }
  if (session.status !== "active") {
    throw BadRequest("This session is closed");
  }

  // Build customer info from user
  const user = await User.findById(userId).select(
    "firstName lastName email phone"
  );
  const customerInfo = {
    userId: userId,
    name: user ? `${user.firstName} ${user.lastName}` : null,
    email: user?.email || null,
    phone: user?.phone || null,
  };

  // Call the existing chatbot agent (sessionId doubles as threadId)
  const mongoClient = mongoose.connection.getClient();
  const response = await callAgent(
    mongoClient,
    message,
    sessionId,
    false,
    customerInfo
  );

  // Update session with new messages
  session.messages.push(
    { role: "user", content: message, timestamp: new Date() },
    {
      role: "assistant",
      content: response.reply,
      timestamp: new Date(),
    }
  );
  session.messageCount = session.messages.length;
  session.lastActivity = new Date();

  // Track metadata from agent response
  if (response.ticket?.ticketId) {
    session.summary.linkedTicket = response.ticket.ticketId;
  }
  if (response.metadata?.intent) {
    session.summary.detectedIntent = response.metadata.intent;
  }
  if (response.products?.length > 0) {
    session.summary.relatedProducts = response.products
      .filter((p) => p._id)
      .map((p) => p._id)
      .slice(0, 10);
  }

  await session.save();

  return response;
}

// ============================================================
// GET USER SESSIONS (paginated)
// ============================================================

export async function getUserSessions(userId, queryString = {}) {
  const baseQuery = ChatSession.find({ user: userId }).select(
    "sessionId status messageCount startedAt lastActivity summary.detectedIntent summary.linkedTicket"
  );

  const features = new ApiFeatures(baseQuery, queryString, {
    allowedFilterFields: ["status"],
  })
    .filter()
    .sort()
    .paginate();

  const sessions = await features.mongooseQuery.lean();
  const total = await ChatSession.countDocuments({
    user: userId,
    ...features.getFilter(),
  });
  const pagination = features.buildPaginationResult(total);

  return { sessions, pagination };
}

// ============================================================
// GET SESSION BY ID
// ============================================================

export async function getSessionById(sessionId, userId = null) {
  const session = await ChatSession.findOne({ sessionId })
    .populate("user", "firstName lastName email phone")
    .populate("summary.relatedProducts", "en.title ar.title slug images price")
    .lean();

  if (!session) throw NotFound("Chat session not found");

  // Ownership check for user endpoints
  if (userId && session.user._id.toString() !== userId.toString()) {
    throw Forbidden("You do not own this session");
  }

  return session;
}

// ============================================================
// ADMIN: GET ALL SESSIONS (paginated + filtered)
// ============================================================

export async function getAllSessions(queryString = {}) {
  const filter = {};

  if (queryString.status) filter.status = queryString.status;
  if (queryString.user) filter.user = queryString.user;

  // Date range filter
  if (queryString.dateFrom || queryString.dateTo) {
    filter.createdAt = {};
    if (queryString.dateFrom)
      filter.createdAt.$gte = new Date(queryString.dateFrom);
    if (queryString.dateTo)
      filter.createdAt.$lte = new Date(queryString.dateTo);
  }

  const baseQuery = ChatSession.find(filter)
    .populate("user", "firstName lastName email phone")
    .select(
      "sessionId user status messageCount startedAt lastActivity summary.detectedIntent summary.linkedTicket"
    );

  const features = new ApiFeatures(baseQuery, queryString).sort().paginate();

  const sessions = await features.mongooseQuery.lean();
  const total = await ChatSession.countDocuments(filter);
  const pagination = features.buildPaginationResult(total);

  return { sessions, pagination };
}

// ============================================================
// ADMIN: DELETE SESSION
// ============================================================

export async function deleteSession(sessionId) {
  const session = await ChatSession.findOne({ sessionId });
  if (!session) throw NotFound("Chat session not found");

  // Also clean up the raw conversations collection
  try {
    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");
    await conversationsCol.deleteOne({ threadId: sessionId });
  } catch (_) {
    // Ignore if raw conversation doesn't exist
  }

  await ChatSession.deleteOne({ sessionId });
  return { sessionId, deleted: true };
}

// ============================================================
// CLOSE SESSION
// ============================================================

export async function closeSession(sessionId, userId) {
  const session = await ChatSession.findOne({ sessionId });
  if (!session) throw NotFound("Chat session not found");
  if (session.user.toString() !== userId.toString()) {
    throw Forbidden("You do not own this session");
  }
  if (session.status === "closed") {
    throw BadRequest("Session is already closed");
  }

  session.status = "closed";
  session.endedAt = new Date();
  await session.save();

  // Generate summary in background (don't await to keep response fast)
  generateSessionSummary(sessionId).catch(() => {});

  return {
    sessionId: session.sessionId,
    status: session.status,
    endedAt: session.endedAt,
  };
}

// ============================================================
// GENERATE SESSION SUMMARY (AI-powered)
// ============================================================

export async function generateSessionSummary(sessionId) {
  const session = await ChatSession.findOne({ sessionId });
  if (!session) throw NotFound("Chat session not found");
  if (session.messages.length === 0) return session;

  // Build conversation text
  const conversationText = session.messages
    .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      apiKey: process.env.GROQ_API_KEY,
    });

    const prompt = `Analyze this customer support conversation and provide a brief summary in JSON format.

Conversation:
${conversationText}

Return ONLY valid JSON:
{
  "overview": "Brief 1-2 sentence summary of what the customer wanted and the outcome",
  "detectedIntent": "One of: product_search, support_request, recommendation, general_chat, complaint, order_inquiry"
}`;

    const res = await model.invoke(prompt);
    const content = (res?.content || "").trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      session.summary.overview = parsed.overview || null;
      if (parsed.detectedIntent) {
        session.summary.detectedIntent = parsed.detectedIntent;
      }
      await session.save();
    }
  } catch (_) {
    // Summary generation is best-effort
  }

  return session;
}

// ============================================================
// CHAT ANALYTICS
// ============================================================

export async function getChatAnalytics(params = {}) {
  const dateFilter = {};
  if (params.dateFrom) dateFilter.$gte = new Date(params.dateFrom);
  if (params.dateTo) dateFilter.$lte = new Date(params.dateTo);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const matchStage = hasDateFilter ? { createdAt: dateFilter } : {};

  const [stats] = await ChatSession.aggregate([
    { $match: matchStage },
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
      },
    },
  ]);

  return {
    totalSessions: stats.total[0]?.count || 0,
    activeSessions: stats.active[0]?.count || 0,
    closedSessions: stats.closed[0]?.count || 0,
    averageMessagesPerSession: Math.round(
      (stats.avgMessages[0]?.avg || 0) * 10
    ) / 10,
    uniqueUsers: stats.uniqueUsers[0]?.count || 0,
    sessionsWithTickets: stats.withTickets[0]?.count || 0,
    sessionsPerDay: stats.perDay,
    topIntents: stats.topIntents,
  };
}

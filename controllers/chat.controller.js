import { callAgent } from "../utlis/chatbotAgent.js";
import {
  createSession,
  sendMessage,
  getUserSessions,
  getSessionById,
  getAllSessions,
  deleteSession,
  closeSession,
  getChatAnalytics,
  generateSessionSummary,
} from "../services/chat.services.js";
import { getSupportOverview } from "../services/supportAnalytics.services.js";
import mongoose from "mongoose";

// ============================================================
// USER ENDPOINTS
// ============================================================

// POST /api/v1/chat/sessions
export const createSessionController = async (req, res, next) => {
  try {
    const session = await createSession(req.user._id);
    res.status(201).json({
      status: "success",
      message: "Chat session created",
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/chat/sessions/:sessionId/messages
export const sendMessageController = async (req, res, next) => {
  try {
    const response = await sendMessage(
      req.params.sessionId,
      req.body.message,
      req.user._id
    );
    res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/sessions/my
export const getMySessionsController = async (req, res, next) => {
  try {
    const { sessions, pagination } = await getUserSessions(
      req.user._id,
      req.query
    );
    res.status(200).json({
      status: "success",
      message: "Your chat sessions",
      data: { sessions, pagination },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/sessions/:sessionId
export const getSessionController = async (req, res, next) => {
  try {
    const session = await getSessionById(
      req.params.sessionId,
      req.user._id
    );
    res.status(200).json({
      status: "success",
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/chat/sessions/:sessionId/close
export const closeSessionController = async (req, res, next) => {
  try {
    const result = await closeSession(req.params.sessionId, req.user._id);
    res.status(200).json({
      status: "success",
      message: "Session closed",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// GET /api/v1/chat/admin/sessions
export const adminGetSessionsController = async (req, res, next) => {
  try {
    const { sessions, pagination } = await getAllSessions(req.query);
    res.status(200).json({
      status: "success",
      message: "All chat sessions",
      data: { sessions, pagination },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/admin/sessions/:sessionId
export const adminGetSessionDetailController = async (req, res, next) => {
  try {
    let session = await getSessionById(req.params.sessionId, null);

    // Generate summary if not yet available
    if (!session.summary?.overview && session.messages?.length > 0) {
      const updated = await generateSessionSummary(req.params.sessionId);
      if (updated) {
        session = await getSessionById(req.params.sessionId, null);
      }
    }

    res.status(200).json({
      status: "success",
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/chat/admin/sessions/:sessionId
export const adminDeleteSessionController = async (req, res, next) => {
  try {
    const result = await deleteSession(req.params.sessionId);
    res.status(200).json({
      status: "success",
      message: "Session deleted",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/admin/analytics
export const adminGetAnalyticsController = async (req, res, next) => {
  try {
    const analytics = await getChatAnalytics({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    res.status(200).json({
      status: "success",
      message: "Chat analytics",
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/chat/admin/overview
export const adminGetOverviewController = async (req, res, next) => {
  try {
    const overview = await getSupportOverview({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    res.status(200).json({
      status: "success",
      message: "Support overview",
      data: overview,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LEGACY ENDPOINTS (kept for backward compatibility)
// ============================================================

// POST /api/v1/chat/chat
export const chatController = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const threadId = sessionId || "guest_session";
    const mongoClient = mongoose.connection.getClient();
    const response = await callAgent(mongoClient, message, threadId);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Chatbot Error:", error);
    return res.status(500).json({
      error: "Something went wrong processing your request.",
    });
  }
};

// GET /api/v1/chat/conversations/:threadId
export const getConversationBySession = async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({ error: "threadId is required" });
    }

    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");

    const conversation = await conversationsCol.findOne({ threadId });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Get Conversation Error:", error);
    return res.status(500).json({
      error: "Failed to retrieve conversation",
    });
  }
};

// GET /api/v1/chat/conversations
export const getAllConversations = async (req, res) => {
  try {
    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");

    const conversations = await conversationsCol
      .find({})
      .sort({ lastActivity: -1 })
      .toArray();

    return res.status(200).json({
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({
      error: "Failed to retrieve conversations",
    });
  }
};

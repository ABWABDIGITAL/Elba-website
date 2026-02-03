import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import {
  sendMessageValidator,
  sessionIdValidator,
} from "../validators/chat.validators.js";
import {
  // User endpoints
  createSessionController,
  sendMessageController,
  getMySessionsController,
  getSessionController,
  closeSessionController,
  // Admin endpoints
  adminGetSessionsController,
  adminGetSessionDetailController,
  adminDeleteSessionController,
  adminGetAnalyticsController,
  adminGetOverviewController,
  // Legacy endpoints
  chatController,
  getConversationBySession,
  getAllConversations,
} from "../controllers/chat.controller.js";

const router = express.Router();

// =================== LEGACY ROUTES (no auth, backward compat) ===================
router.post("/chat", chatController);
router.get("/conversations", getAllConversations);
router.get("/conversations/:threadId", getConversationBySession);

// =================== USER ROUTES (require authentication) ===================
router.post("/sessions", protect, createSessionController);
router.post(
  "/sessions/:sessionId/messages",
  protect,
  sendMessageValidator,
  sendMessageController
);
router.get("/sessions/my", protect, getMySessionsController);
router.get(
  "/sessions/:sessionId",
  protect,
  sessionIdValidator,
  getSessionController
);
router.post(
  "/sessions/:sessionId/close",
  protect,
  sessionIdValidator,
  closeSessionController
);

// =================== ADMIN ROUTES (require auth + permissions) ===================
router.get(
  "/admin/overview",
  protect,
  requirePermission("chat", "read"),
  adminGetOverviewController
);
router.get(
  "/admin/analytics",
  protect,
  requirePermission("chat", "read"),
  adminGetAnalyticsController
);
router.get(
  "/admin/sessions",
  protect,
  requirePermission("chat", "read"),
  adminGetSessionsController
);
router.get(
  "/admin/sessions/:sessionId",
  protect,
  requirePermission("chat", "read"),
  adminGetSessionDetailController
);
router.delete(
  "/admin/sessions/:sessionId",
  protect,
  requirePermission("chat", "delete"),
  adminDeleteSessionController
);

export default router;

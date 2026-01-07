import express from "express";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendDiscountNotification,
  sendFlashSaleNotification,
  getNotificationStats,
  whatsappWebhook,
  createNotification,
} from "../controllers/notification.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";

const router = express.Router();

// WhatsApp Webhook (must be before protect middleware)
router.get("/whatsapp/webhook", whatsappWebhook);
router.post("/whatsapp/webhook", whatsappWebhook);

// User notification routes (protected)
router.use(protect);

// Get user's notifications
router.get("/", getUserNotifications);

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark notification as read
router.patch("/:notificationId/read", markAsRead);

// Mark all as read
router.patch("/mark-all-read", markAllAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotification);

// Delete all notifications
router.delete("/", deleteAllNotifications);
router.post("/", createNotification);
// Admin routes
router.post(
  "/send-discount",
  requirePermission("analytics", "create"),
  upload({ folder: "notifications" }).none(),
  parseNestedJson,
  sendDiscountNotification
);

router.post(
  "/send-flash-sale",
  requirePermission("analytics", "create"),
  upload({ folder: "notifications" }).none(),
  parseNestedJson,
  sendFlashSaleNotification
);

router.get(
  "/stats",
  requirePermission("analytics", "read"),
  getNotificationStats
);

export default router;

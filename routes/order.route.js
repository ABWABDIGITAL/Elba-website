import express from "express";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";
import {
  createOrderController,
  getUserOrdersController,
  getOrderByIdController,
  getAllOrdersController,
  updateOrderStatusController,
  cancelOrderController,
  updatePaymentStatusController,
  updateTrackingInfoController,
  getOrderStatsController,
  bulkUpdateOrderStatusController,
  bulkExportOrdersController,
  getOrderAnalyticsController,
} from "../controllers/order.controller.js";

const router = express.Router();

// All order routes require authentication
router.use(protect);

/* --------------------------------------------------
   USER ROUTES
--------------------------------------------------- */

// Create order from cart
router.post("/", createOrderController);

// Get user's orders
router.get("/my-orders", getUserOrdersController);

// Get specific order
router.get("/:orderId", getOrderByIdController);

// Cancel order
router.put("/:orderId/cancel", cancelOrderController);

/* --------------------------------------------------
   ADMIN ROUTES
--------------------------------------------------- */

// Get all orders (admin only)
router.get("/admin/all", allowTo("admin", "superAdmin"), getAllOrdersController);

// Get order statistics (admin only)
router.get("/admin/stats", allowTo("admin", "superAdmin"), getOrderStatsController);

// Update order status (admin only)
router.put(
  "/admin/:orderId/status",
  allowTo("admin", "superAdmin"),
  updateOrderStatusController
);

// Update tracking info (admin only)
router.put(
  "/admin/:orderId/tracking",
  allowTo("admin", "superAdmin"),
  updateTrackingInfoController
);

// Update payment status (admin only or webhook)
router.put(
  "/admin/:orderId/payment",
  allowTo("admin", "superAdmin"),
  updatePaymentStatusController
);

// Bulk update order status (admin only)
router.post(
  "/admin/bulk-update-status",
  requirePermission("orders", "update"),
  upload({ folder: "orders" }).none(),
  parseNestedJson,
  bulkUpdateOrderStatusController
);

// Bulk export orders (admin only)
router.get(
  "/admin/export",
  requirePermission("orders", "export"),
  bulkExportOrdersController
);

// Get order analytics (admin only)
router.get(
  "/admin/analytics",
  requirePermission("analytics", "read"),
  getOrderAnalyticsController
);

export default router;

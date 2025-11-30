import express from "express";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
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

export default router;

import express from "express";
import {
  getDashboardAnalytics,
  getUsersAnalytics,
  getSalesAnalytics,
  getProductAnalytics,
  getSystemStats,
} from "../controllers/admin.controller.js";
import { protect , allowTo } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

// All admin routes require authentication
router.use(protect,allowTo("superAdmin","admin"));

// Dashboard analytics (requires analytics:read permission)
router.get(
  "/analytics/dashboard",
  requirePermission("analytics", "read"),
  getDashboardAnalytics
);

// User analytics
router.get(
  "/analytics/users",
  requirePermission("analytics", "read"),
  getUsersAnalytics
);

// Sales analytics
router.get(
  "/analytics/sales",
  requirePermission("analytics", "read"),
  getSalesAnalytics
);

// Product analytics
router.get(
  "/analytics/products",
  requirePermission("analytics", "read"),
  getProductAnalytics
);

// System stats
router.get(
  "/system/stats",
  requirePermission("analytics", "read"),
  getSystemStats
);

export default router;

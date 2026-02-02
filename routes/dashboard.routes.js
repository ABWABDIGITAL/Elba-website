// routes/dashboard.routes.js

import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import {
  getCEODashboardController,
  getMarketingDashboardController,
  getOperationsDashboardController,
  getRealtimeMetricsController,
  getDashboardAlertsController,
  getOverviewDashboardController,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

// Overview Dashboard (heatmap, metrics, top performers, anomalies)
router.get(
  "/overview",
  protect,
  requirePermission("dashboard", "read"),
  getOverviewDashboardController
);

// CEO Dashboard
router.get(
  "/ceo",
  protect,
  requirePermission("dashboard", "read"),
  getCEODashboardController
);

// Marketing Dashboard
router.get(
  "/marketing",
  protect,
  requirePermission("dashboard", "read"),
  getMarketingDashboardController
);

// Operations Dashboard
router.get(
  "/operations",
  protect,
  requirePermission("dashboard", "read"),
  getOperationsDashboardController
);

// Real-time metrics (WebSocket or polling)
router.get(
  "/realtime",
  protect,
  requirePermission("dashboard", "read"),
  getRealtimeMetricsController
);

// Alerts
router.get(
  "/alerts",
  protect,
  requirePermission("dashboard", "read"),
  getDashboardAlertsController
);

export default router;
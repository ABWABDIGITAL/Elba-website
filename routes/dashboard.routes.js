// routes/dashboard.routes.js

import express from "express";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
import {
  getCEODashboardController,
  getMarketingDashboardController,
  getOperationsDashboardController,
  getRealtimeMetricsController,
  getDashboardAlertsController
} from "../controllers/dashboard.controller.js";

const router = express.Router();

// CEO Dashboard
router.get(
  "/ceo",
  protect,
  allowTo("superAdmin", "admin"),
  getCEODashboardController
);

// Marketing Dashboard
router.get(
  "/marketing",
  protect,
  allowTo("superAdmin", "admin", "manager"),
  getMarketingDashboardController
);

// Operations Dashboard
router.get(
  "/operations",
  protect,
  allowTo("superAdmin", "admin", "manager"),
  getOperationsDashboardController
);

// Real-time metrics (WebSocket or polling)
router.get(
  "/realtime",
  protect,
  allowTo("superAdmin", "admin"),
  getRealtimeMetricsController
);

// Alerts
router.get(
  "/alerts",
  protect,
  allowTo("superAdmin", "admin", "manager"),
  getDashboardAlertsController
);

export default router;
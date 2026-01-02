// routes/analytics.routes.js

import express from "express";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
import {
  getRealtimeAnalyticsController,
  getDashboardOverviewController,
  getRevenueMetricsController,
  getRevenueTrendController,
  getConversionMetricsController,
  getFunnelDataController,
  getCartAbandonmentRateController,
  getAbandonedCartsController,
  getActiveUsersController,
  getUserGrowthController,
  getUserRetentionController,
  getTopProductsController,
  getProductConversionRatesController,
  getSearchAnalyticsController,
  getTrafficBySourceController,
  getCampaignPerformanceController,
  getSegmentDistributionController,
  getAtRiskUsersController,
  getVIPUsersController,
  getHighIntentNonBuyersController,
  getUserSegmentController,
  processAlertsController,
  triggerAutomationController,
  trackEventController,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// Public endpoints
router.post("/track", trackEventController);

// Protected endpoints
router.use(protect);

// Admin endpoints
router.get("/realtime", allowTo("admin", "superAdmin"), getRealtimeAnalyticsController);
router.get("/dashboard", allowTo("admin", "superAdmin"), getDashboardOverviewController);
router.get("/revenue", allowTo("admin", "superAdmin"), getRevenueMetricsController);
router.get("/revenue/trend", allowTo("admin", "superAdmin"), getRevenueTrendController);
router.get("/conversion", allowTo("admin", "superAdmin"), getConversionMetricsController);
router.get("/funnel", allowTo("admin", "superAdmin"), getFunnelDataController);
router.get("/cart/abandonment", allowTo("admin", "superAdmin"), getCartAbandonmentRateController);
router.get("/cart/abandoned", allowTo("admin", "superAdmin"), getAbandonedCartsController);
router.get("/users/active", allowTo("admin", "superAdmin"), getActiveUsersController);
router.get("/users/growth", allowTo("admin", "superAdmin"), getUserGrowthController);
router.get("/users/retention", allowTo("admin", "superAdmin"), getUserRetentionController);
router.get("/products/top", allowTo("admin", "superAdmin"), getTopProductsController);
router.get("/products/conversion", allowTo("admin", "superAdmin"), getProductConversionRatesController);
router.get("/search", allowTo("admin", "superAdmin"), getSearchAnalyticsController);
router.get("/traffic", allowTo("admin", "superAdmin"), getTrafficBySourceController);
router.get("/campaigns", allowTo("admin", "superAdmin"), getCampaignPerformanceController);
router.get("/segments", allowTo("admin", "superAdmin"), getSegmentDistributionController);
router.get("/segments/at-risk", allowTo("admin", "superAdmin"), getAtRiskUsersController);
router.get("/segments/vip", allowTo("admin", "superAdmin"), getVIPUsersController);
router.get("/segments/high-intent", allowTo("admin", "superAdmin"), getHighIntentNonBuyersController);
router.get("/segments/user/:userId", allowTo("admin", "superAdmin"), getUserSegmentController);

// Alerts
router.post("/alerts/process", allowTo("admin", "superAdmin"), processAlertsController);

// Automations
router.post("/automations/trigger", allowTo("admin", "superAdmin"), triggerAutomationController);

export default router;
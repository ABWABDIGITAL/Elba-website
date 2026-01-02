// controllers/analytics.controller.js

import { StatusCodes } from "http-status-codes";
import {
  getRealtimeStats,
  getDashboardOverview,
  getRevenueMetrics,
  getRevenueTrend,
  getConversionMetrics,
  getFunnelData,
  getCartAbandonmentRate,
  getAbandonedCarts,
  getActiveUsers,
  getUserGrowth,
  getUserRetention,
  getTopProducts,
  getProductConversionRates,
  getSearchAnalytics,
  getTrafficBySource,
  getCampaignPerformance,
} from "../services/metrics.services.js";
import {
  getSegmentDistribution,
  getAtRiskUsers,
  getVIPUsers,
  getHighIntentNonBuyers,
  calculateUserSegment,
} from "../services/segmentation.services.js";
import { processAlerts } from "../services/alerts.services.js";
import { automationEngine } from "../services/automation.services.js";
import { trackEvent } from "../services/analytics.services.js";

/**
 * Get real-time analytics stats
 */
export const getRealtimeAnalyticsController = async (req, res) => {
  try {
    const stats = await getRealtimeStats();
    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch realtime analytics",
      error: error.message,
    });
  }
};

/**
 * Get dashboard overview
 */
export const getDashboardOverviewController = async (req, res) => {
  try {
    const overview = await getDashboardOverview();
    res.status(StatusCodes.OK).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch dashboard overview",
      error: error.message,
    });
  }
};

/**
 * Get revenue metrics
 */
export const getRevenueMetricsController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const metrics = await getRevenueMetrics(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch revenue metrics",
      error: error.message,
    });
  }
};

/**
 * Get revenue trend
 */
export const getRevenueTrendController = async (req, res) => {
  try {
    const { period = "30d", granularity = "daily" } = req.query;
    const trend = await getRevenueTrend(period, granularity);
    res.status(StatusCodes.OK).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch revenue trend",
      error: error.message,
    });
  }
};

/**
 * Get conversion metrics
 */
export const getConversionMetricsController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const metrics = await getConversionMetrics(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch conversion metrics",
      error: error.message,
    });
  }
};

/**
 * Get funnel data
 */
export const getFunnelDataController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const funnel = await getFunnelData(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch funnel data",
      error: error.message,
    });
  }
};

/**
 * Get cart abandonment rate
 */
export const getCartAbandonmentRateController = async (req, res) => {
  try {
    const { period = "7d" } = req.query;
    const rate = await getCartAbandonmentRate(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: rate,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch cart abandonment rate",
      error: error.message,
    });
  }
};

/**
 * Get abandoned carts
 */
export const getAbandonedCartsController = async (req, res) => {
  try {
    const { limit = 50, minValue = 0 } = req.query;
    const carts = await getAbandonedCarts(parseInt(limit), parseInt(minValue));
    res.status(StatusCodes.OK).json({
      success: true,
      data: carts,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch abandoned carts",
      error: error.message,
    });
  }
};

/**
 * Get active users
 */
export const getActiveUsersController = async (req, res) => {
  try {
    const { period = "DAU" } = req.query;
    const count = await getActiveUsers(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: { count, period },
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch active users",
      error: error.message,
    });
  }
};

/**
 * Get user growth
 */
export const getUserGrowthController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const growth = await getUserGrowth(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: growth,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch user growth",
      error: error.message,
    });
  }
};

/**
 * Get user retention
 */
export const getUserRetentionController = async (req, res) => {
  try {
    const { cohortPeriod = "week", periods = 8 } = req.query;
    const retention = await getUserRetention(cohortPeriod, parseInt(periods));
    res.status(StatusCodes.OK).json({
      success: true,
      data: retention,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch user retention",
      error: error.message,
    });
  }
};

/**
 * Get top products
 */
export const getTopProductsController = async (req, res) => {
  try {
    const { period = "30d", metric = "revenue", limit = 10 } = req.query;
    const products = await getTopProducts(period, metric, parseInt(limit));
    res.status(StatusCodes.OK).json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch top products",
      error: error.message,
    });
  }
};

/**
 * Get product conversion rates
 */
export const getProductConversionRatesController = async (req, res) => {
  try {
    const { period = "30d", limit = 20 } = req.query;
    const rates = await getProductConversionRates(period, parseInt(limit));
    res.status(StatusCodes.OK).json({
      success: true,
      data: rates,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch product conversion rates",
      error: error.message,
    });
  }
};

/**
 * Get search analytics
 */
export const getSearchAnalyticsController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const analytics = await getSearchAnalytics(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch search analytics",
      error: error.message,
    });
  }
};

/**
 * Get traffic by source
 */
export const getTrafficBySourceController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const traffic = await getTrafficBySource(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: traffic,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch traffic by source",
      error: error.message,
    });
  }
};

/**
 * Get campaign performance
 */
export const getCampaignPerformanceController = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const performance = await getCampaignPerformance(period);
    res.status(StatusCodes.OK).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch campaign performance",
      error: error.message,
    });
  }
};

/**
 * Get segment distribution
 */
export const getSegmentDistributionController = async (req, res) => {
  try {
    const distribution = await getSegmentDistribution();
    res.status(StatusCodes.OK).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch segment distribution",
      error: error.message,
    });
  }
};

/**
 * Get at-risk users
 */
export const getAtRiskUsersController = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const users = await getAtRiskUsers(parseInt(limit));
    res.status(StatusCodes.OK).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch at-risk users",
      error: error.message,
    });
  }
};

/**
 * Get VIP users
 */
export const getVIPUsersController = async (req, res) => {
  try {
    const { tier, limit = 50 } = req.query;
    const users = await getVIPUsers(tier, parseInt(limit));
    res.status(StatusCodes.OK).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch VIP users",
      error: error.message,
    });
  }
};

/**
 * Get high intent non-buyers
 */
export const getHighIntentNonBuyersController = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const users = await getHighIntentNonBuyers(parseInt(limit));
    res.status(StatusCodes.OK).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch high intent non-buyers",
      error: error.message,
    });
  }
};

/**
 * Get user segment
 */
export const getUserSegmentController = async (req, res) => {
  try {
    const { userId } = req.params;
    const segment = await calculateUserSegment(userId);
    res.status(StatusCodes.OK).json({
      success: true,
      data: segment,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to calculate user segment",
      error: error.message,
    });
  }
};

/**
 * Process alerts
 */
export const processAlertsController = async (req, res) => {
  try {
    const alerts = await processAlerts();
    res.status(StatusCodes.OK).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to process alerts",
      error: error.message,
    });
  }
};

/**
 * Trigger automation
 */
export const triggerAutomationController = async (req, res) => {
  try {
    const { automationId, userId } = req.body;
    const result = await automationEngine.triggerWorkflow(automationId, userId, req.body.contextData);
    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to trigger automation",
      error: error.message,
    });
  }
};

/**
 * Track event
 */
export const trackEventController = async (req, res) => {
  try {
    const event = await trackEvent(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to track event",
      error: error.message,
    });
  }
};
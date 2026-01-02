// controllers/dashboard.controller.js

import { StatusCodes } from "http-status-codes";
import {
  getCEODashboard,
  getMarketingDashboard,
  getOperationsDashboard,
  getRealtimeMetrics,
  getDashboardAlerts,
} from "../services/dashboard.services.js";
import { BadRequest } from "../utlis/apiError.js";

/**
 * Get CEO Dashboard
 */
export const getCEODashboardController = async (req, res) => {
  try {
    const dashboardData = await getCEODashboard();
    res.status(StatusCodes.OK).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch CEO dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get Marketing Dashboard
 */
export const getMarketingDashboardController = async (req, res) => {
  try {
    const dashboardData = await getMarketingDashboard();
    res.status(StatusCodes.OK).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch marketing dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get Operations Dashboard
 */
export const getOperationsDashboardController = async (req, res) => {
  try {
    const dashboardData = await getOperationsDashboard();
    res.status(StatusCodes.OK).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch operations dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get Real-time Metrics
 */
export const getRealtimeMetricsController = async (req, res) => {
  try {
    const metrics = await getRealtimeMetrics();
    res.status(StatusCodes.OK).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch realtime metrics",
      error: error.message,
    });
  }
};

/**
 * Get Dashboard Alerts
 */
export const getDashboardAlertsController = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const alerts = await getDashboardAlerts(parseInt(limit));
    res.status(StatusCodes.OK).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch dashboard alerts",
      error: error.message,
    });
  }
};

/**
 * Acknowledge Alert
 */
export const acknowledgeAlertController = async (req, res) => {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      throw new BadRequest("Alert ID is required");
    }

    // In a real implementation, you would update the alert status in Redis/DB
    // For now, just return success
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Alert acknowledged successfully",
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to acknowledge alert",
      error: error.message,
    });
  }
};

/**
 * Get Widget Data
 */
export const getWidgetDataController = async (req, res) => {
  try {
    const { widgetType, period = "30d" } = req.query;

    if (!widgetType) {
      throw new BadRequest("Widget type is required");
    }

    let data;

    switch (widgetType) {
      case "revenue":
        data = await getRevenueMetrics(period);
        break;
      case "conversion":
        data = await getConversionMetrics(period);
        break;
      case "funnel":
        data = await getFunnelData(period);
        break;
      case "top-products":
        data = await getTopProducts(period, "revenue", 5);
        break;
      case "traffic-sources":
        data = await getTrafficBySource(period);
        break;
      case "user-growth":
        data = await getUserGrowth(period);
        break;
      case "cart-abandonment":
        data = await getCartAbandonmentRate(period);
        break;
      case "segments":
        data = await getSegmentDistribution();
        break;
      case "realtime":
        data = await getRealtimeMetrics();
        break;
      default:
        throw new BadRequest("Invalid widget type");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: `Failed to fetch ${widgetType} widget data`,
      error: error.message,
    });
  }
};
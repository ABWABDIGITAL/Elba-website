import {
  getDashboardAnalyticsService,
  getUsersAnalyticsService,
  getSalesAnalyticsService,
  getProductAnalyticsService,
  getSystemStatsService,
} from "../services/admin.services.js";

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const result = await getDashboardAnalyticsService();

    res.status(200).json({
      status: "success",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

export const getUsersAnalytics = async (req, res, next) => {
  try {
    const period = req.query.period || "month";
    const analytics = await getUsersAnalyticsService(period);

    res.status(200).json({
      status: "success",
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
};

export const getSalesAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await getSalesAnalyticsService(startDate, endDate);

    res.status(200).json({
      status: "success",
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
};

export const getProductAnalytics = async (req, res, next) => {
  try {
    const analytics = await getProductAnalyticsService();

    res.status(200).json({
      status: "success",
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
};

export const getSystemStats = async (req, res, next) => {
  try {
    const stats = await getSystemStatsService();

    res.status(200).json({
      status: "success",
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

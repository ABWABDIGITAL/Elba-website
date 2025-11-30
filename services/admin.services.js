import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import { redis } from "../config/redis.js";
import { ServerError } from "../utlis/apiError.js";

const ANALYTICS_CACHE_KEY = "admin:analytics";
const CACHE_TTL = 300; // 5 minutes

export const getDashboardAnalyticsService = async () => {
  try {
    const cached = await redis.get(ANALYTICS_CACHE_KEY);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Users analytics
    const [totalUsers, activeUsers, newUsersThisMonth, newUsersLastMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),
    ]);

    // Products analytics
    const [totalProducts, activeProducts, outOfStock, lowStock] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ status: "out_of_stock" }),
      Product.countDocuments({ stock: { $lte: 10, $gt: 0 } }),
    ]);

    // Orders analytics
    const [totalOrders, pendingOrders, completedOrders, cancelledOrders] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
    ]);

    // Revenue analytics
    const revenueAggregation = await Order.aggregate([
      {
        $match: {
          status: { $in: ["delivered", "processing", "shipped"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    const revenue = revenueAggregation[0] || {
      totalRevenue: 0,
      averageOrderValue: 0,
    };

    // Monthly revenue
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          status: { $in: ["delivered", "processing", "shipped"] },
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const lastMonthRevenue = await Order.aggregate([
      {
        $match: {
          status: { $in: ["delivered", "processing", "shipped"] },
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Top selling products
    const topProducts = await Product.find()
      .sort({ salesCount: -1 })
      .limit(5)
      .select("en.name ar.name salesCount price en.images")
      .lean();

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email")
      .select("orderNumber totalAmount status createdAt")
      .lean();

    // Category distribution
    const [categoryCount, brandCount] = await Promise.all([
      Category.countDocuments(),
      Brand.countDocuments(),
    ]);

    const analytics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        newLastMonth: newUsersLastMonth,
        growth:
          newUsersLastMonth > 0
            ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
            : 0,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        outOfStock,
        lowStock,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      },
      revenue: {
        total: revenue.totalRevenue || 0,
        averageOrderValue: revenue.averageOrderValue || 0,
        thisMonth: monthlyRevenue[0]?.total || 0,
        lastMonth: lastMonthRevenue[0]?.total || 0,
        growth:
          lastMonthRevenue[0]?.total > 0
            ? ((monthlyRevenue[0]?.total || 0) - lastMonthRevenue[0].total) /
              lastMonthRevenue[0].total *
              100
            : 0,
      },
      catalog: {
        categories: categoryCount,
        brands: brandCount,
      },
      topProducts,
      recentOrders,
    };

    await redis.set(ANALYTICS_CACHE_KEY, JSON.stringify(analytics), { ex: CACHE_TTL });

    return { fromCache: false, data: analytics };
  } catch (err) {
    throw ServerError("Failed to fetch analytics", err);
  }
};

export const getUsersAnalyticsService = async (period = "month") => {
  try {
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: "$legacyRole",
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      userGrowth,
      roleDistribution,
    };
  } catch (err) {
    throw ServerError("Failed to fetch user analytics", err);
  }
};

export const getSalesAnalyticsService = async (startDate, endDate) => {
  try {
    const matchStage = {
      status: { $in: ["delivered", "processing", "shipped"] },
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const salesByDay = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    const salesByStatus = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    return {
      salesByDay,
      salesByStatus,
    };
  } catch (err) {
    throw ServerError("Failed to fetch sales analytics", err);
  }
};

export const getProductAnalyticsService = async () => {
  try {
    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $unwind: "$categoryInfo",
      },
      {
        $project: {
          category: "$categoryInfo.en.name",
          categoryAr: "$categoryInfo.ar.name",
          count: 1,
        },
      },
    ]);

    const brandDistribution = await Product.aggregate([
      {
        $group: {
          _id: "$brand",
          count: { $sum: 1 },
          totalSales: { $sum: "$salesCount" },
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      {
        $unwind: "$brandInfo",
      },
      {
        $project: {
          brand: "$brandInfo.en.name",
          brandAr: "$brandInfo.ar.name",
          count: 1,
          totalSales: 1,
        },
      },
      {
        $sort: { totalSales: -1 },
      },
    ]);

    const priceRanges = await Product.aggregate([
      {
        $bucket: {
          groupBy: "$price",
          boundaries: [0, 100, 500, 1000, 5000, 10000, 50000],
          default: "50000+",
          output: {
            count: { $sum: 1 },
            products: {
              $push: {
                name: "$en.name",
                price: "$price",
              },
            },
          },
        },
      },
    ]);

    return {
      categoryDistribution,
      brandDistribution,
      priceRanges,
    };
  } catch (err) {
    throw ServerError("Failed to fetch product analytics", err);
  }
};

export const getSystemStatsService = async () => {
  try {
    const stats = {
      database: {
        users: await User.estimatedDocumentCount(),
        products: await Product.estimatedDocumentCount(),
        orders: await Order.estimatedDocumentCount(),
        categories: await Category.estimatedDocumentCount(),
        brands: await Brand.estimatedDocumentCount(),
      },
      storage: {
        // This would need actual file system checks
        uploadsCount: 0,
        totalSize: "0 MB",
      },
      cache: {
        status: "connected",
        // Could add Redis stats here if needed
      },
    };

    return stats;
  } catch (err) {
    throw ServerError("Failed to fetch system stats", err);
  }
};

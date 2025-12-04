import Notification from "../models/notification.model.js";
import {RedisHelper} from "../config/redis.js";

const NOTIFICATIONS_CACHE_PREFIX = "notifications:user:";
const CACHE_TTL = 300; // 5 minutes

/* --------------------------------------------------
   BUILD NOTIFICATION DTO
--------------------------------------------------- */
const buildNotificationDTO = (notification, language = "ar") => {
  const langData = notification[language] || notification.ar;

  return {
    id: notification._id,
    title: langData.title,
    message: langData.message,
    type: notification.type,
    priority: notification.priority,
    inApp: notification.inApp,
    whatsapp: notification.whatsapp,
    relatedDocument: notification.relatedDocument,
    relatedModel: notification.relatedModel,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
};

/* --------------------------------------------------
   GET USER NOTIFICATIONS
--------------------------------------------------- */
export const getUserNotificationsService = async (userId, query = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      read,
      priority,
      language = "ar",
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = { user: userId };
    if (type) filter.type = type;
    if (read !== undefined) filter["inApp.read"] = read === "true";
    if (priority) filter.priority = priority;

    // Try cache
    const cacheKey = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:${JSON.stringify(filter)}:${page}:${limit}:${language}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("relatedDocument")
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.getUnreadCount(userId);

    // Transform notifications with language-specific data
    const transformedNotifications = notifications.map(n => buildNotificationDTO(n, language));

    const result = {
      notifications: transformedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };

    // Cache result
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (error) {
    throw new Error(`Get notifications error: ${error.message}`);
  }
};

/* --------------------------------------------------
   GET UNREAD COUNT
--------------------------------------------------- */
export const getUnreadCountService = async (userId) => {
  try {
    const cacheKey = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:unread`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, count: parseInt(cached) };
    }

    const count = await Notification.getUnreadCount(userId);

    await redis.set(cacheKey, count.toString(), { ex: CACHE_TTL });

    return { fromCache: false, count };
  } catch (error) {
    throw new Error(`Get unread count error: ${error.message}`);
  }
};

/*----------------------------------------------------
   MARK NOTIFICATION AS READ
-----------------------------------------------------*/
export const markAsReadService = async (notificationId, userId, language = "ar") => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await notification.markAsRead();

    // Clear cache
    await redis.del(`${NOTIFICATIONS_CACHE_PREFIX}${userId}:unread`);
    const pattern = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return buildNotificationDTO(notification.toObject(), language);
  } catch (error) {
    throw new Error(`Mark as read error: ${error.message}`);
  }
};

/*----------------------------------------------------
   MARK ALL AS READ
-----------------------------------------------------*/
export const markAllAsReadService = async (userId) => {
  try {
    await Notification.markAllAsRead(userId);

    // Clear cache
    await redis.del(`${NOTIFICATIONS_CACHE_PREFIX}${userId}:unread`);
    const pattern = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return { success: true };
  } catch (error) {
    throw new Error(`Mark all as read error: ${error.message}`);
  }
};

/*----------------------------------------------------
   DELETE NOTIFICATION
-----------------------------------------------------*/
export const deleteNotificationService = async (notificationId, userId, language = "ar") => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Clear cache
    const pattern = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return buildNotificationDTO(notification.toObject(), language);
  } catch (error) {
    throw new Error(`Delete notification error: ${error.message}`);
  }
};

/*----------------------------------------------------
   DELETE ALL NOTIFICATIONS
-----------------------------------------------------*/
export const deleteAllNotificationsService = async (userId) => {
  try {
    await Notification.deleteMany({ user: userId });

    // Clear cache
    const pattern = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return { success: true };
  } catch (error) {
    throw new Error(`Delete all notifications error: ${error.message}`);
  }
};

/*----------------------------------------------------
   CREATE NOTIFICATION (INTERNAL)
-----------------------------------------------------*/
export const createNotificationService = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);

    // Clear user's cache
    const pattern = `${NOTIFICATIONS_CACHE_PREFIX}${notificationData.user}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return notification;
  } catch (error) {
    throw new Error(`Create notification error: ${error.message}`);
  }
};

/*----------------------------------------------------
   BULK CREATE NOTIFICATIONS
-----------------------------------------------------*/
export const bulkCreateNotificationsService = async (notifications) => {
  try {
    const created = await Notification.insertMany(notifications);

    // Clear cache for all affected users
    const uniqueUserIds = [...new Set(notifications.map(n => n.user.toString()))];
    for (const userId of uniqueUserIds) {
      const pattern = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }

    return created;
  } catch (error) {
    throw new Error(`Bulk create notifications error: ${error.message}`);
  }
};

/*----------------------------------------------------
   GET NOTIFICATION STATISTICS (ADMIN)
-----------------------------------------------------*/
export const getNotificationStatsService = async () => {
  try {
    const cacheKey = "admin:notification:stats";
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const stats = await Notification.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byStatus: [
            {
              $group: {
                _id: "$whatsapp.status",
                count: { $sum: 1 },
              },
            },
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
          ],
          readStats: [
            {
              $group: {
                _id: null,
                totalRead: {
                  $sum: { $cond: ["$inApp.read", 1, 0] },
                },
                totalUnread: {
                  $sum: { $cond: ["$inApp.read", 0, 1] },
                },
              },
            },
          ],
          whatsappStats: [
            {
              $group: {
                _id: null,
                totalSent: {
                  $sum: { $cond: ["$whatsapp.sent", 1, 0] },
                },
                totalFailed: {
                  $sum: {
                    $cond: [
                      { $eq: ["$whatsapp.status", "failed"] },
                      1,
                      0,
                    ],
                  },
                },
                totalDelivered: {
                  $sum: {
                    $cond: [
                      { $eq: ["$whatsapp.status", "delivered"] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = {
      byType: stats[0].byType,
      byStatus: stats[0].byStatus,
      byPriority: stats[0].byPriority,
      readStats: stats[0].readStats[0] || { totalRead: 0, totalUnread: 0 },
      whatsappStats: stats[0].whatsappStats[0] || {
        totalSent: 0,
        totalFailed: 0,
        totalDelivered: 0,
      },
    };

    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

    return { fromCache: false, data: result };
  } catch (error) {
    throw new Error(`Get notification stats error: ${error.message}`);
  }
};

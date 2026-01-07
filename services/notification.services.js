import Notification from "../models/notification.model.js";
import { RedisHelper } from "../config/redis.js";

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
   CLEAR USER CACHE (HELPER)
--------------------------------------------------- */
const clearUserNotificationCache = async (userId) => {
  await RedisHelper.del(
    `${NOTIFICATIONS_CACHE_PREFIX}${userId}`,
    `${NOTIFICATIONS_CACHE_PREFIX}${userId}:unread`
  );
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

    const filter = { user: userId };
    if (type) filter.type = type;
    if (read !== undefined) filter["inApp.read"] = read === "true";
    if (priority) filter.priority = priority;

    const cacheKey = `${NOTIFICATIONS_CACHE_PREFIX}${userId}:${page}:${limit}:${language}:${JSON.stringify(filter)}`;
    const cached = await RedisHelper.get(cacheKey);

    if (cached) {
    const data =
      typeof cached === "string" ? JSON.parse(cached) : cached;

    return { fromCache: true, data };
  }


    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("relatedDocument")
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.getUnreadCount(userId);
``
    const transformedNotifications = notifications.map((n) =>
      buildNotificationDTO(n, language)
    );

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

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });

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
    const cached = await RedisHelper.get(cacheKey);

    if (cached) {
      return { fromCache: true, count: parseInt(cached) };
    }

    const count = await Notification.getUnreadCount(userId);
    await RedisHelper.set(cacheKey, count.toString(), { ex: CACHE_TTL });

    return { fromCache: false, count };
  } catch (error) {
    throw new Error(`Get unread count error: ${error.message}`);
  }
};

/* --------------------------------------------------
   MARK NOTIFICATION AS READ
--------------------------------------------------- */
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
    await clearUserNotificationCache(userId);

    return buildNotificationDTO(notification.toObject(), language);
  } catch (error) {
    throw new Error(`Mark as read error: ${error.message}`);
  }
};

/* --------------------------------------------------
   MARK ALL AS READ
--------------------------------------------------- */
export const markAllAsReadService = async (userId) => {
  try {
    await Notification.markAllAsRead(userId);
    await clearUserNotificationCache(userId);
    return { success: true };
  } catch (error) {
    throw new Error(`Mark all as read error: ${error.message}`);
  }
};

/* --------------------------------------------------
   DELETE NOTIFICATION
--------------------------------------------------- */
export const deleteNotificationService = async (notificationId, userId, language = "ar") => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await clearUserNotificationCache(userId);
    return buildNotificationDTO(notification.toObject(), language);
  } catch (error) {
    throw new Error(`Delete notification error: ${error.message}`);
  }
};

/* --------------------------------------------------
   DELETE ALL NOTIFICATIONS
--------------------------------------------------- */
export const deleteAllNotificationsService = async (userId) => {
  try {
    await Notification.deleteMany({ user: userId });
    await clearUserNotificationCache(userId);
    return { success: true };
  } catch (error) {
    throw new Error(`Delete all notifications error: ${error.message}`);
  }
};

/* --------------------------------------------------
   CREATE NOTIFICATION
--------------------------------------------------- */
export const createNotificationService = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    await clearUserNotificationCache(notificationData.user);
    return notification;
  } catch (error) {
    throw new Error(`Create notification error: ${error.message}`);
  }
};

/* --------------------------------------------------
   BULK CREATE NOTIFICATIONS
--------------------------------------------------- */
export const bulkCreateNotificationsService = async (notifications) => {
  try {
    const created = await Notification.insertMany(notifications);

    const uniqueUserIds = [
      ...new Set(notifications.map((n) => n.user.toString())),
    ];

    for (const userId of uniqueUserIds) {
      await clearUserNotificationCache(userId);
    }

    return created;
  } catch (error) {
    throw new Error(`Bulk create notifications error: ${error.message}`);
  }
};

/* --------------------------------------------------
   GET NOTIFICATION STATISTICS (ADMIN)
--------------------------------------------------- */
export const getNotificationStatsService = async () => {
  try {
    const cacheKey = "admin:notification:stats";
    const cached = await RedisHelper.get(cacheKey);

    if (cached) {
      return { fromCache: true, data: JSON.parse(cached) };
    }

    const stats = await Notification.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byStatus: [
            { $group: { _id: "$whatsapp.status", count: { $sum: 1 } } },
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
          ],
          readStats: [
            {
              $group: {
                _id: null,
                totalRead: { $sum: { $cond: ["$inApp.read", 1, 0] } },
                totalUnread: { $sum: { $cond: ["$inApp.read", 0, 1] } },
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
    };

    await RedisHelper.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
    return { fromCache: false, data: result };
  } catch (error) {
    throw new Error(`Get notification stats error: ${error.message}`);
  }
};

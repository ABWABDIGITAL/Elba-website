import {
  getUserNotificationsService,
  getUnreadCountService,
  markAsReadService,
  markAllAsReadService,
  deleteNotificationService,
  deleteAllNotificationsService,
  getNotificationStatsService,
} from "../services/notification.services.js";
import {
  sendDiscountWhatsApp,
  sendFlashSaleWhatsApp,
  handleWhatsAppWebhook,
} from "../services/whatsapp.services.js";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model.js";

/* --------------------------------------------------
   GET USER NOTIFICATIONS
--------------------------------------------------- */
export const getUserNotifications = async (req, res, next) => {
  try {
    const result = await getUserNotificationsService(req.user.id, req.query);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Notifications fetched successfully",
      fromCache: result.fromCache,
      ...result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET UNREAD COUNT
--------------------------------------------------- */
export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await getUnreadCountService(req.user.id);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Unread count fetched successfully",
      fromCache: result.fromCache,
      count: result.count,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   MARK NOTIFICATION AS READ
--------------------------------------------------- */
export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await markAsReadService(notificationId, req.user.id);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   MARK ALL AS READ
--------------------------------------------------- */
export const markAllAsRead = async (req, res, next) => {
  try {
    await markAllAsReadService(req.user.id);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   DELETE NOTIFICATION
--------------------------------------------------- */
export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await deleteNotificationService(notificationId, req.user.id);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Notification deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   DELETE ALL NOTIFICATIONS
--------------------------------------------------- */
export const deleteAllNotifications = async (req, res, next) => {
  try {
    await deleteAllNotificationsService(req.user.id);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "All notifications deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   SEND DISCOUNT NOTIFICATION (ADMIN)
--------------------------------------------------- */
export const sendDiscountNotification = async (req, res, next) => {
  try {
    const { userIds, couponId, broadcast } = req.body;

    let users;
    if (broadcast === true || broadcast === "true") {
      // Send to all active users
      users = await User.find({
        isActive: true,
        phone: { $exists: true, $ne: null },
      }).select("_id name phone");
    } else if (userIds && userIds.length > 0) {
      // Send to specific users
      users = await User.find({
        _id: { $in: userIds },
        isActive: true,
        phone: { $exists: true, $ne: null },
      }).select("_id name phone");
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({
        OK: false,
        message: "Please provide userIds or set broadcast to true",
      });
    }

    // Get coupon details
    const Coupon = (await import("../models/coupon.model.js")).default;
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(StatusCodes.NOT_FOUND).json({
        OK: false,
        message: "Coupon not found",
      });
    }

    const result = await sendDiscountWhatsApp(users, coupon);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Discount notifications sent",
      data: {
        totalUsers: users.length,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   SEND FLASH SALE NOTIFICATION (ADMIN)
--------------------------------------------------- */
export const sendFlashSaleNotification = async (req, res, next) => {
  try {
    const { userIds, saleInfo, broadcast } = req.body;

    let users;
    if (broadcast === true || broadcast === "true") {
      users = await User.find({
        isActive: true,
        phone: { $exists: true, $ne: null },
      }).select("_id name phone");
    } else if (userIds && userIds.length > 0) {
      users = await User.find({
        _id: { $in: userIds },
        isActive: true,
        phone: { $exists: true, $ne: null },
      }).select("_id name phone");
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({
        OK: false,
        message: "Please provide userIds or set broadcast to true",
      });
    }

    const result = await sendFlashSaleWhatsApp(users, saleInfo);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Flash sale notifications sent",
      data: {
        totalUsers: users.length,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET NOTIFICATION STATISTICS (ADMIN)
--------------------------------------------------- */
export const getNotificationStats = async (req, res, next) => {
  try {
    const result = await getNotificationStatsService();

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Notification statistics fetched successfully",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   WHATSAPP WEBHOOK HANDLER
--------------------------------------------------- */
export const whatsappWebhook = async (req, res, next) => {
  try {
    // Verify webhook (GET request)
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "elba_whatsapp_webhook";

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(StatusCodes.OK).send(challenge);
      } else {
        return res.status(StatusCodes.FORBIDDEN).json({
          OK: false,
          message: "Verification failed",
        });
      }
    }

    // Handle webhook events (POST request)
    await handleWhatsAppWebhook(req.body);

    res.status(StatusCodes.OK).json({
      OK: true,
      message: "Webhook received",
    });
  } catch (err) {
    next(err);
  }
};

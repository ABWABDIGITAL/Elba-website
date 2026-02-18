import Notification from "../models/notification.model.js";
import { RedisHelper } from "../config/redis.js";
import User from "../models/user.model.js";

const NOTIFICATIONS_CACHE_PREFIX = "notifications:user:";
const CACHE_TTL = 300; // 5 minutes

/* --------------------------------------------------
   BUILD NOTIFICATION DTO (Lightweight - for list)
--------------------------------------------------- */
const buildNotificationListDTO = (notification, language = "ar") => {
  const langData = notification[language] || notification.ar;

  return {
    id: notification._id,
    title: langData?.title,
    message: langData?.message,
    type: notification.type,
    priority: notification.priority,
    read: notification.inApp?.read || false,
    createdAt: notification.createdAt,
  };
};

/* --------------------------------------------------
   BUILD NOTIFICATION DETAIL DTO (Full - for single view)
--------------------------------------------------- */
const buildNotificationDetailDTO = (notification, language = "ar") => {
  const langData = notification[language] || notification.ar;

  return {
    id: notification._id,
    title: langData?.title,
    message: langData?.message,
    type: notification.type,
    priority: notification.priority,
    read: notification.inApp?.read || false,
    readAt: notification.inApp?.readAt,
    relatedModel: notification.relatedModel,
    relatedId: notification.relatedId,
    relatedDocument: notification.relatedDocument || null,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
};

/* --------------------------------------------------
   CLEAR USER CACHE (HELPER)
--------------------------------------------------- */
const clearUserNotificationCache = async (userId) => {
  try {
    // Delete all cache keys for this user (pattern: notifications:user:USERID:*)
    await RedisHelper.delByPattern(`${NOTIFICATIONS_CACHE_PREFIX}${userId}:*`);
    // Also delete the base key and unread key
    await RedisHelper.del(`${NOTIFICATIONS_CACHE_PREFIX}${userId}`);
    await RedisHelper.del(`${NOTIFICATIONS_CACHE_PREFIX}${userId}:unread`);
  } catch (error) {
    console.error("clearUserNotificationCache error:", error.message);
  }
};

// Exported version for controller use
export const clearUserNotificationCacheService = async (userId) => {
  await clearUserNotificationCache(userId);
  return { success: true };
};

/* --------------------------------------------------
   GET USER NOTIFICATIONS (Lightweight - No Populate)
   Optimized for dashboard listing
--------------------------------------------------- */
export const getUserNotificationsService = async (userId, query = {}) => {
  const {
    page = 1,
    limit = 20,
    type,
    read,
    priority,
    language = "ar",
  } = query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = { user: userId };
  if (type) filter.type = type;
  if (read !== undefined) filter["inApp.read"] = read === "true";
  if (priority) filter.priority = priority;

  // Parallel queries for better performance
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .select("type priority inApp.read ar.title ar.message en.title en.message createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, "inApp.read": false }),
  ]);

  return {
    notifications: notifications.map((n) => buildNotificationListDTO(n, language)),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1,
    },
    unreadCount,
  };
};

/* --------------------------------------------------
   GET NOTIFICATION BY ID (Detailed + Mark as Read)
   Populates related document and marks as read
--------------------------------------------------- */
export const getNotificationByIdService = async (notificationId, userId, language = "ar") => {
  // Find notification and verify ownership
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    return null;
  }

  // Mark as read if not already
  if (!notification.inApp.read) {
    notification.inApp.read = true;
    notification.inApp.readAt = new Date();
    await notification.save();
    // Clear cache since read status changed
    await clearUserNotificationCache(userId);
  }

  // Populate related document based on relatedModel
  let populatedNotification = notification.toObject();

  if (notification.relatedModel && notification.relatedId) {
    try {
      const Model = (await import(`../models/${notification.relatedModel.toLowerCase()}.model.js`)).default;
      const relatedDoc = await Model.findById(notification.relatedId).lean();
      populatedNotification.relatedDocument = relatedDoc;
    } catch {
      // Model not found or error populating - continue without related doc
      populatedNotification.relatedDocument = null;
    }
  }

  return buildNotificationDetailDTO(populatedNotification, language);
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

    return buildNotificationListDTO(notification.toObject(), language);
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
    return buildNotificationListDTO(notification.toObject(), language);
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

/* ============================================================
   EVENT-BASED NOTIFICATION TRIGGERS
   These functions create notifications for important platform events
============================================================ */

/**
 * Get all admin/superAdmin user IDs for admin notifications
 */
const getAdminUserIds = async () => {
  const admins = await User.find({
    legacyRole: { $in: ["admin", "superAdmin", "manager"] },
    status: "active",
  }).select("_id").lean();
  return admins.map((a) => a._id);
};

/**
 * Notify admins about an event (creates one notification per admin)
 */
const notifyAdmins = async (notificationData) => {
  try {
    const adminIds = await getAdminUserIds();
    if (!adminIds.length) return [];

    const notifications = adminIds.map((adminId) => ({
      ...notificationData,
      user: adminId,
    }));

    return await bulkCreateNotificationsService(notifications);
  } catch (error) {
    console.error("Failed to notify admins:", error.message);
    return [];
  }
};

/* --------------------------------------------------
   ORDER EVENTS
--------------------------------------------------- */

/**
 * Notify when a new order is created
 */
export const notifyOrderCreated = async (order, customer) => {
  try {
    const orderNumber = order.orderNumber || order._id.toString().slice(-8).toUpperCase();
    const totalAmount = order.totalAmount || order.total || 0;

    // Notify the customer
    await createNotificationService({
      user: customer._id,
      type: "order_created",
      ar: {
        title: "تم إنشاء طلبك بنجاح",
        message: `تم استلام طلبك رقم #${orderNumber} بقيمة ${totalAmount} ر.س. سنقوم بإعلامك عند تأكيد الطلب.`,
      },
      en: {
        title: "Order Created Successfully",
        message: `Your order #${orderNumber} worth ${totalAmount} SAR has been received. We'll notify you when it's confirmed.`,
      },
      relatedModel: "Order",
      relatedId: order._id,
      priority: "high",
      metadata: { orderNumber, totalAmount, itemCount: order.items?.length || 0 },
    });

    // Notify admins
    await notifyAdmins({
      type: "order_created",
      ar: {
        title: "طلب جديد",
        message: `تم استلام طلب جديد #${orderNumber} من ${customer.name || customer.email} بقيمة ${totalAmount} ر.س`,
      },
      en: {
        title: "New Order Received",
        message: `New order #${orderNumber} from ${customer.name || customer.email} worth ${totalAmount} SAR`,
      },
      relatedModel: "Order",
      relatedId: order._id,
      priority: "high",
      metadata: { orderNumber, totalAmount, customerId: customer._id, customerName: customer.name },
    });
  } catch (error) {
    console.error("notifyOrderCreated error:", error.message);
  }
};

/**
 * Notify when order status changes
 */
export const notifyOrderStatusChange = async (order, customer, newStatus, oldStatus) => {
  try {
    const orderNumber = order.orderNumber || order._id.toString().slice(-8).toUpperCase();

    const statusMessages = {
      confirmed: {
        ar: { title: "تم تأكيد طلبك", message: `تم تأكيد طلبك رقم #${orderNumber} وجاري تجهيزه للشحن.` },
        en: { title: "Order Confirmed", message: `Your order #${orderNumber} has been confirmed and is being prepared for shipping.` },
      },
      shipped: {
        ar: { title: "تم شحن طلبك", message: `طلبك رقم #${orderNumber} في الطريق إليك.` },
        en: { title: "Order Shipped", message: `Your order #${orderNumber} is on its way to you.` },
      },
      delivered: {
        ar: { title: "تم توصيل طلبك", message: `تم توصيل طلبك رقم #${orderNumber} بنجاح. شكراً لتسوقك معنا!` },
        en: { title: "Order Delivered", message: `Your order #${orderNumber} has been delivered successfully. Thank you for shopping with us!` },
      },
      cancelled: {
        ar: { title: "تم إلغاء طلبك", message: `تم إلغاء طلبك رقم #${orderNumber}. سيتم استرداد المبلغ خلال 3-5 أيام عمل.` },
        en: { title: "Order Cancelled", message: `Your order #${orderNumber} has been cancelled. Refund will be processed within 3-5 business days.` },
      },
      refunded: {
        ar: { title: "تم استرداد المبلغ", message: `تم استرداد مبلغ طلبك رقم #${orderNumber} بنجاح.` },
        en: { title: "Order Refunded", message: `Your order #${orderNumber} has been refunded successfully.` },
      },
    };

    const typeMap = {
      confirmed: "order_confirmed",
      shipped: "order_shipped",
      delivered: "order_delivered",
      cancelled: "order_cancelled",
      refunded: "order_refunded",
    };

    const messages = statusMessages[newStatus];
    const notificationType = typeMap[newStatus];

    if (!messages || !notificationType) return;

    // Notify customer
    await createNotificationService({
      user: customer._id,
      type: notificationType,
      ar: messages.ar,
      en: messages.en,
      relatedModel: "Order",
      relatedId: order._id,
      priority: newStatus === "cancelled" ? "high" : "medium",
      metadata: { orderNumber, oldStatus, newStatus },
    });

    // Notify admins for cancellations
    if (newStatus === "cancelled") {
      await notifyAdmins({
        type: "order_cancelled",
        ar: {
          title: "تم إلغاء طلب",
          message: `تم إلغاء الطلب #${orderNumber} من ${customer.name || customer.email}`,
        },
        en: {
          title: "Order Cancelled",
          message: `Order #${orderNumber} from ${customer.name || customer.email} has been cancelled`,
        },
        relatedModel: "Order",
        relatedId: order._id,
        priority: "high",
        metadata: { orderNumber, customerId: customer._id },
      });
    }
  } catch (error) {
    console.error("notifyOrderStatusChange error:", error.message);
  }
};

/* --------------------------------------------------
   CART EVENTS
--------------------------------------------------- */

/**
 * Notify about cart abandonment (called by a scheduled job)
 */
export const notifyCartAbandoned = async (cart, customer) => {
  try {
    const itemCount = cart.items?.length || 0;
    const cartValue = cart.totalPrice || cart.total || 0;

    // Notify customer to recover cart
    await createNotificationService({
      user: customer._id,
      type: "cart_abandoned",
      ar: {
        title: "نسيت شيئاً في سلتك!",
        message: `لديك ${itemCount} منتجات في سلة التسوق بقيمة ${cartValue} ر.س. أكمل طلبك الآن!`,
      },
      en: {
        title: "You left something in your cart!",
        message: `You have ${itemCount} items in your cart worth ${cartValue} SAR. Complete your order now!`,
      },
      relatedModel: "Cart",
      relatedId: cart._id,
      priority: "medium",
      metadata: { itemCount, cartValue },
    });

    // Notify admins
    await notifyAdmins({
      type: "cart_abandoned",
      ar: {
        title: "سلة متروكة",
        message: `${customer.name || customer.email} لديه سلة متروكة بقيمة ${cartValue} ر.س`,
      },
      en: {
        title: "Cart Abandoned",
        message: `${customer.name || customer.email} has an abandoned cart worth ${cartValue} SAR`,
      },
      relatedModel: "Cart",
      relatedId: cart._id,
      priority: "low",
      metadata: { customerId: customer._id, cartValue, itemCount },
    });
  } catch (error) {
    console.error("notifyCartAbandoned error:", error.message);
  }
};

/* --------------------------------------------------
   PRODUCT/STOCK EVENTS
--------------------------------------------------- */

/**
 * Notify admins when product stock is low
 */
export const notifyLowStock = async (product, currentStock, threshold = 10) => {
  try {
    const productName = product.en?.title || product.ar?.title || product.sku;

    await notifyAdmins({
      type: "low_stock",
      ar: {
        title: "تنبيه: مخزون منخفض",
        message: `المنتج "${productName}" (${product.sku}) وصل إلى ${currentStock} قطعة فقط. يرجى إعادة التخزين.`,
      },
      en: {
        title: "Low Stock Alert",
        message: `Product "${productName}" (${product.sku}) is down to ${currentStock} units. Please restock.`,
      },
      relatedModel: "Product",
      relatedId: product._id,
      priority: currentStock === 0 ? "urgent" : "high",
      metadata: { sku: product.sku, currentStock, threshold, productName },
    });
  } catch (error) {
    console.error("notifyLowStock error:", error.message);
  }
};

/**
 * Notify admins when product is out of stock
 */
export const notifyOutOfStock = async (product) => {
  try {
    const productName = product.en?.title || product.ar?.title || product.sku;

    await notifyAdmins({
      type: "out_of_stock",
      ar: {
        title: "تنبيه عاجل: نفاد المخزون",
        message: `المنتج "${productName}" (${product.sku}) نفد من المخزون تماماً!`,
      },
      en: {
        title: "URGENT: Out of Stock",
        message: `Product "${productName}" (${product.sku}) is completely out of stock!`,
      },
      relatedModel: "Product",
      relatedId: product._id,
      priority: "urgent",
      metadata: { sku: product.sku, productName },
    });
  } catch (error) {
    console.error("notifyOutOfStock error:", error.message);
  }
};

/* --------------------------------------------------
   CHAT/SUPPORT EVENTS
--------------------------------------------------- */

/**
 * Notify when a new chat conversation is started
 */
export const notifyNewChat = async (chat, customer) => {
  try {
    await notifyAdmins({
      type: "new_chat",
      ar: {
        title: "محادثة جديدة",
        message: `${customer.name || customer.email} بدأ محادثة جديدة. الرسالة: "${(chat.messages?.[0]?.content || "").slice(0, 50)}..."`,
      },
      en: {
        title: "New Chat Started",
        message: `${customer.name || customer.email} started a new chat. Message: "${(chat.messages?.[0]?.content || "").slice(0, 50)}..."`,
      },
      relatedModel: "ChatSession",
      relatedId: chat._id,
      priority: "high",
      metadata: { customerId: customer._id, customerName: customer.name },
    });
  } catch (error) {
    console.error("notifyNewChat error:", error.message);
  }
};

/**
 * Notify when a new chat message is received
 */
export const notifyNewChatMessage = async (chat, message, sender, recipient) => {
  try {
    const senderName = sender.name || sender.email || "Someone";
    const messagePreview = (message.content || "").slice(0, 50);

    await createNotificationService({
      user: recipient._id,
      type: "chat_message",
      ar: {
        title: "رسالة جديدة",
        message: `${senderName}: "${messagePreview}${message.content?.length > 50 ? "..." : ""}"`,
      },
      en: {
        title: "New Message",
        message: `${senderName}: "${messagePreview}${message.content?.length > 50 ? "..." : ""}"`,
      },
      relatedModel: "ChatSession",
      relatedId: chat._id,
      priority: "medium",
      metadata: { senderId: sender._id, senderName, messageId: message._id },
    });
  } catch (error) {
    console.error("notifyNewChatMessage error:", error.message);
  }
};

/**
 * Notify when a new support ticket is created
 */
export const notifyTicketCreated = async (ticket, customer) => {
  try {
    const ticketNumber = ticket.ticketNumber || ticket._id.toString().slice(-6).toUpperCase();

    // Notify customer
    await createNotificationService({
      user: customer._id,
      type: "ticket_created",
      ar: {
        title: "تم إنشاء تذكرة الدعم",
        message: `تم إنشاء تذكرة الدعم رقم #${ticketNumber}. سنرد عليك في أقرب وقت.`,
      },
      en: {
        title: "Support Ticket Created",
        message: `Your support ticket #${ticketNumber} has been created. We'll respond shortly.`,
      },
      relatedModel: "SupportTicket",
      relatedId: ticket._id,
      priority: "medium",
      metadata: { ticketNumber, subject: ticket.subject },
    });

    // Notify admins
    await notifyAdmins({
      type: "ticket_created",
      ar: {
        title: "تذكرة دعم جديدة",
        message: `تذكرة جديدة #${ticketNumber} من ${customer.name || customer.email}: "${(ticket.subject || "").slice(0, 50)}"`,
      },
      en: {
        title: "New Support Ticket",
        message: `New ticket #${ticketNumber} from ${customer.name || customer.email}: "${(ticket.subject || "").slice(0, 50)}"`,
      },
      relatedModel: "SupportTicket",
      relatedId: ticket._id,
      priority: ticket.priority === "urgent" ? "urgent" : "high",
      metadata: { ticketNumber, customerId: customer._id, subject: ticket.subject },
    });
  } catch (error) {
    console.error("notifyTicketCreated error:", error.message);
  }
};

/* --------------------------------------------------
   USER EVENTS
--------------------------------------------------- */

/**
 * Notify when a new user registers
 */
export const notifyNewUserRegistration = async (user) => {
  try {
    // Welcome notification for the new user
    await createNotificationService({
      user: user._id,
      type: "new_register",
      ar: {
        title: "مرحباً بك في ألبا!",
        message: "شكراً لتسجيلك معنا. استمتع بالتسوق واستكشف أحدث المنتجات والعروض الحصرية.",
      },
      en: {
        title: "Welcome to Alba!",
        message: "Thank you for registering with us. Enjoy shopping and explore our latest products and exclusive offers.",
      },
      relatedModel: "User",
      relatedId: user._id,
      priority: "medium",
    });

    // Notify admins
    await notifyAdmins({
      type: "new_register",
      ar: {
        title: "مستخدم جديد",
        message: `تسجيل مستخدم جديد: ${user.name || user.email} (${user.phone || "N/A"})`,
      },
      en: {
        title: "New User Registration",
        message: `New user registered: ${user.name || user.email} (${user.phone || "N/A"})`,
      },
      relatedModel: "User",
      relatedId: user._id,
      priority: "low",
      metadata: { userName: user.name, userEmail: user.email, userPhone: user.phone },
    });
  } catch (error) {
    console.error("notifyNewUserRegistration error:", error.message);
  }
};

/* --------------------------------------------------
   PAYMENT EVENTS
--------------------------------------------------- */

/**
 * Notify when payment fails
 */
export const notifyPaymentFailed = async (order, customer, errorMessage) => {
  try {
    const orderNumber = order.orderNumber || order._id.toString().slice(-8).toUpperCase();

    await createNotificationService({
      user: customer._id,
      type: "payment_failed",
      ar: {
        title: "فشل عملية الدفع",
        message: `فشلت عملية الدفع للطلب #${orderNumber}. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع أخرى.`,
      },
      en: {
        title: "Payment Failed",
        message: `Payment for order #${orderNumber} failed. Please try again or use a different payment method.`,
      },
      relatedModel: "Order",
      relatedId: order._id,
      priority: "high",
      metadata: { orderNumber, errorMessage },
    });

    // Notify admins
    await notifyAdmins({
      type: "payment_failed",
      ar: {
        title: "فشل دفع",
        message: `فشل الدفع للطلب #${orderNumber} من ${customer.name || customer.email}`,
      },
      en: {
        title: "Payment Failed",
        message: `Payment failed for order #${orderNumber} from ${customer.name || customer.email}`,
      },
      relatedModel: "Order",
      relatedId: order._id,
      priority: "medium",
      metadata: { orderNumber, customerId: customer._id, errorMessage },
    });
  } catch (error) {
    console.error("notifyPaymentFailed error:", error.message);
  }
};

/* --------------------------------------------------
   SYSTEM EVENTS
--------------------------------------------------- */

/**
 * Send a system alert to all admins
 */
export const notifySystemAlert = async (title, message, priority = "high", metadata = {}) => {
  try {
    await notifyAdmins({
      type: "system_alert",
      ar: { title, message },
      en: { title, message },
      priority,
      metadata,
    });
  } catch (error) {
    console.error("notifySystemAlert error:", error.message);
  }
};

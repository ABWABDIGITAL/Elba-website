import axios from "axios";
import Notification from "../models/notification.model.js";

const HYPERSEND_API_URL = process.env.HYPERSEND_API_URL || "https://app.hypersender.com/api/whatsapp/v2";
const HYPERSEND_INSTANCE_ID = process.env.HYPERSEND_INSTANCE_ID;
const HYPERSEND_API_KEY = process.env.HYPERSEND_API_KEY;

/* --------------------------------------------------
   SEND WHATSAPP MESSAGE (HyperSend v2)
--------------------------------------------------- */
export const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    if (!HYPERSEND_API_URL || !HYPERSEND_INSTANCE_ID || !HYPERSEND_API_KEY) {
      console.warn("HyperSend credentials not configured");
      return { success: false, error: "HyperSend not configured" };
    }

    // Build WhatsApp JID: e.g. 201012345678 -> "201012345678@c.us"
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, "");
    const chatId = `${formattedPhone}@c.us`;

    const payload = {
      chatId,
      text: message,
      link_preview: false,
      link_preview_high_quality: false,
      // reply_to: "optional-message-id"  // only if you want to reply to a specific message
    };

    // Use the "safe" endpoint to avoid blocking, as docs recommend
    const url = `${HYPERSEND_API_URL}/${HYPERSEND_INSTANCE_ID}/send-text-safe`;
    console.log("HyperSend URL:", url);

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${HYPERSEND_API_KEY}`,  // "Api Key (Bearer Token)"
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Response example:
    // {
    //   "key": {
    //     "remoteJid": "111111111@s.whatsapp.net",
    //     "fromMe": true,
    //     "id": "3EB0CD3810439716606547"
    //   },
    //   "message": {...},
    //   "messageTimestamp": 1741359489,
    //   "status": "PENDING"
    // }

    return {
      success: true,
      messageId: response.data?.key?.id || null,
      data: response.data,
    };
  } catch (error) {
    console.error(
      "HyperSend WhatsApp send error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message,
    };
  }
};
export const sendRegistrationWhatsApp = async (user) => {
  try {
    const message = `مرحباً ${user.firstName}! \n\nشكراً لتسجيلك في متجرنا للأجهزة المنزلية.\n\nيمكنك الآن تصفح أحدث العروض والمنتجات.\n\nفريق خدمة العملاء`;

    const result = await sendWhatsAppMessage(user.phone, message);

    // Create notification record
    const notification = await Notification.create({
      user: user._id,
      type: "new_register",
      ar: {
        title: "مرحباً بك في متجرنا!",
        message: `مرحباً ${user.firstName}! شكراً لتسجيلك معنا.`,
      },
      en: {
        title: "Welcome to Our Store!",
        message: `Welcome ${user.firstName}! Thank you for registering.`,
      },
      whatsapp: {
        sent: result.success,
        sentAt: result.success ? new Date() : null,
        messageId: result.messageId || null,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
      },
      priority: "medium",
    });

    return { success: true, notification, whatsappResult: result };
  } catch (error) {
    console.error("Registration WhatsApp error:", error);
    return { success: false, error: error.message };
  }
};

/* --------------------------------------------------
   SEND ORDER UPDATE NOTIFICATION
--------------------------------------------------- */
export const sendOrderUpdateWhatsApp = async (order, user, status) => {
  try {
    const statusMessages = {
      confirmed: {
        ar: `تم تأكيد طلبك #${order.orderNumber} ✅\n\nسيتم معالجة طلبك وشحنه قريباً.\n\nالإجمالي: ${order.totalPrice} ريال`,
        en: `Your order #${order.orderNumber} has been confirmed ✅\n\nTotal: ${order.totalPrice} SAR`,
      },
      shipped: {
        ar: `تم شحن طلبك #${order.orderNumber} 🚚\n\nرقم الشحنة: ${order.shippingInfo?.trackingNumber || "سيتم تحديثه قريباً"}\n\nالتوصيل المتوقع: ${order.shippingInfo?.estimatedDelivery || "قريباً"}`,
        en: `Your order #${order.orderNumber} has been shipped 🚚\n\nTracking: ${order.shippingInfo?.trackingNumber || "Coming soon"}`,
      },
      delivered: {
        ar: `تم توصيل طلبك #${order.orderNumber} ✨\n\nنتمنى أن تنال المنتجات إعجابك!\n\nيمكنك تقييم المنتجات من حسابك.`,
        en: `Your order #${order.orderNumber} has been delivered ✨\n\nEnjoy your products!`,
      },
      cancelled: {
        ar: `تم إلغاء طلبك #${order.orderNumber} ❌\n\nإذا كان لديك أي استفسار، يرجى التواصل معنا.\n\nسيتم استرداد المبلغ خلال 3-5 أيام عمل.`,
        en: `Your order #${order.orderNumber} has been cancelled ❌\n\nRefund will be processed in 3-5 business days.`,
      },
    };
    console.log("statusMessages", statusMessages);
    console.log("order", order.orderNumber);
    const message = statusMessages[status]?.ar || `تحديث طلبك #${order.orderNumber}`;

    const result = await sendWhatsAppMessage(user.phone, message);

    // Create notification record
    const notification = await Notification.create({
      user: user._id,
      type: `order_${status}`,
      ar: {
        title: status === "confirmed" ? "تم تأكيد الطلب" :
               status === "shipped" ? "تم الشحن" :
               status === "delivered" ? "تم التوصيل" : "تم الإلغاء",
        message: message,
      },
      en: {
        title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: statusMessages[status]?.en || `Order #${order.orderNumber} update`,
      },
      relatedModel: "Order",
      relatedId: order._id,
      metadata: {
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        status: status,
      },
      whatsapp: {
        sent: result.success,
        sentAt: result.success ? new Date() : null,
        messageId: result.messageId || null,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
      },
      priority: "high",
    });

    return { success: true, notification, whatsappResult: result };
  } catch (error) {
    console.error("Order update WhatsApp error:", error);
    return { success: false, error: error.message };
  }
};

export const sendDiscountWhatsApp = async (users, discount) => {
  try {
      console.log("=== DISCOUNT NOTIFICATION CALLED AT ===", new Date().toISOString());
  console.log("Request body:", users);
  console.log("Request headers x-request-id or cf-request-id:", discount);
    const results = [];

    // Safely build discount value text
    const percentage =
      typeof discount.discount === "number"
        ? discount.discount
        : null;
    const amount =
      typeof discount.discountAmount === "number"
        ? discount.discountAmount
        : null;

    let discountValueText;
    if (percentage !== null) {
      discountValueText = `خصم ${percentage}%`;
    } else if (amount !== null) {
      discountValueText = `خصم ${amount} ريال`;
    } else {
      discountValueText = "عرض خاص بخصم مميز"; // fallback if no value
    }

    // Safely format end date
    let endDateText = "لفترة محدودة";
    if (discount.expiredAt) {
      const endDate = new Date(discount.expiredAt);
      if (!isNaN(endDate)) {
        endDateText = endDate.toLocaleDateString("ar-SA");
      }
    }

    for (const user of users) {
      const message = ` عرض خاص لك من متجر ألبا! عميلنا العزيز \n\n${
        discount.title?.ar || discount.code
      }\n\n${discountValueText}\n\nكود الخصم: ${
        discount.code
      }\n\nصالح حتى: ${endDateText}\n\nلا تفوت الفرصة! `;

      const result = await sendWhatsAppMessage(user.phone, message);

      const notification = await Notification.create({
        user: user._id || null,
        type: "discount_alert",
        ar: {
          title: "عرض خاص لك!",
          message,
        },
        en: {
          title: "Special Discount for You!",
          message: percentage
            ? `Get ${percentage}% off with code: ${discount.code}`
            : amount
            ? `Get ${amount} SAR off with code: ${discount.code}`
            : `Exclusive offer with code: ${discount.code}`,
        },
        relatedModel: "Coupon",
        relatedId: discount._id,
        metadata: {
          code: discount.code,
          discountPercentage: discount.discountPercentage ?? null,
          discountAmount: discount.discountAmount ?? null,
          endDate: discount.expiredAt ?? null,
        },
        whatsapp: {
          sent: result.success,
          sentAt: result.success ? new Date() : null,
          messageId: result.messageId || null,
          status: result.success ? "sent" : "failed",
          error: result.error || null,
        },
        priority: "medium",
        expiresAt: discount.endDate || null,
      });

      results.push({ user: user._id, notification, result });

      // Avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      totalSent: results.filter((r) => r.result.success).length,
      totalFailed: results.filter((r) => !r.result.success).length,
      results,
    };
  } catch (error) {
    console.error("Discount WhatsApp error:", error);
    return { success: false, error: error.message };
  }
};
/* --------------------------------------------------
   SEND FLASH SALE NOTIFICATION
--------------------------------------------------- */
export const sendFlashSaleWhatsApp = async (users, saleInfo) => {
  try {
    const results = [];

    for (const user of users) {
      const message = `⚡ عرض فلاش - لفترة محدودة!\n\n${saleInfo.title?.ar}\n\nخصم يصل إلى ${saleInfo.maxDiscount}%!\n\nينتهي خلال: ${saleInfo.duration}\n\nسارع بالطلب الآن! 🛒`;

      const result = await sendWhatsAppMessage(user.phone, message);

      const notification = await Notification.create({
        user: user._id,
        type: "flash_sale",
        ar: {
          title: "عرض فلاش - لفترة محدودة!",
          message: message,
        },
        en: {
          title: "Flash Sale - Limited Time!",
          message: `Flash sale! Up to ${saleInfo.maxDiscount}% off!`,
        },
        metadata: saleInfo,
        whatsapp: {
          sent: result.success,
          sentAt: result.success ? new Date() : null,
          messageId: result.messageId || null,
          status: result.success ? "sent" : "failed",
          error: result.error || null,
        },
        priority: "high",
        expiresAt: saleInfo.endDate,
      });

      results.push({ user: user._id, notification, result });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      totalSent: results.filter(r => r.result.success).length,
      totalFailed: results.filter(r => !r.result.success).length,
      results,
    };
  } catch (error) {
    console.error("Flash sale WhatsApp error:", error);
    return { success: false, error: error.message };
  }
};

/* --------------------------------------------------
   GET WHATSAPP WEBHOOK STATUS
--------------------------------------------------- */
export const handleWhatsAppWebhook = async (webhookData) => {
  try {
    // Handle WhatsApp status updates (delivered, read, etc.)
    const { entry } = webhookData;

    for (const item of entry) {
      const changes = item.changes;
      for (const change of changes) {
        if (change.field === "messages") {
          const statuses = change.value.statuses || [];

          for (const status of statuses) {
            const messageId = status.id;
            const newStatus = status.status; // delivered, read, failed

            // Update notification status
            const notification = await Notification.findOne({
              "whatsapp.messageId": messageId,
            });

            if (notification) {
              notification.whatsapp.status = newStatus;
              await notification.save();
            }
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return { success: false, error: error.message };
  }
};

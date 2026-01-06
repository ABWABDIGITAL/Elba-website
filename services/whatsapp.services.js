import axios from "axios";
import Notification from "../models/notification.model.js";

const HYPERSEND_API_URL = process.env.HYPERSEND_API_URL;
const HYPERSEND_INSTANCE_ID = process.env.HYPERSEND_INSTANCE_ID;
const HYPERSEND_API_KEY = process.env.HYPERSEND_API_KEY;
const WHATSAPP_PHONE_NUMBER_ID= process.env.WHATSAPP_PHONE_NUMBER_ID;
/* --------------------------------------------------
   SEND WHATSAPP MESSAGE
--------------------------------------------------- */
export const sendWhatsAppMessage = async (phoneNumber, message, templateName = null, templateParams = null) => {
  try {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      console.warn("WhatsApp credentials not configured");
      return { success: false, error: "WhatsApp not configured" };
    }

    // Format phone number (remove + and spaces)
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, "");

    let messageData;

    if (templateName && templateParams) {
      // Use WhatsApp Template Message
      messageData = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: templateParams.language || "ar",
          },
          components: templateParams.components || [],
        },
      };
    } else {
      // Use simple text message
      messageData = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          body: message,
        },
      };
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          Authorization: `Bearer ${HYPERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      messageId: response.data.messages[0].id,
      data: response.data,
    };
  } catch (error) {
    console.error("WhatsApp send error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
};

/* --------------------------------------------------
   SEND NEW REGISTRATION NOTIFICATION
--------------------------------------------------- */
export const sendRegistrationWhatsApp = async (user) => {
  try {
    const message = `مرحباً ${user.name}! 🎉\n\nشكراً لتسجيلك في متجرنا للأجهزة المنزلية.\n\nيمكنك الآن تصفح أحدث العروض والمنتجات.\n\nفريق خدمة العملاء`;

    const result = await sendWhatsAppMessage(user.phone, message);

    // Create notification record
    const notification = await Notification.create({
      user: user._id,
      type: "new_register",
      ar: {
        title: "مرحباً بك في متجرنا!",
        message: `مرحباً ${user.name}! شكراً لتسجيلك معنا.`,
      },
      en: {
        title: "Welcome to Our Store!",
        message: `Welcome ${user.name}! Thank you for registering.`,
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

/* --------------------------------------------------
   SEND DISCOUNT/PROMOTION NOTIFICATION
--------------------------------------------------- */
export const sendDiscountWhatsApp = async (users, discount) => {
  try {
    const results = [];

    for (const user of users) {
      const message = `🔥 عرض خاص لك!\n\n${discount.title?.ar || discount.code}\n\nخصم ${discount.discountPercentage || discount.discountAmount}${discount.discountPercentage ? '%' : ' ريال'}\n\nكود الخصم: ${discount.code}\n\nصالح حتى: ${new Date(discount.endDate).toLocaleDateString('ar-SA')}\n\nلا تفوت الفرصة! 🎁`;

      const result = await sendWhatsAppMessage(user.phone, message);

      // Create notification record
      const notification = await Notification.create({
        user: user._id,
        type: "discount_alert",
        ar: {
          title: "عرض خاص لك!",
          message: message,
        },
        en: {
          title: "Special Discount for You!",
          message: `Get ${discount.discountPercentage || discount.discountAmount}${discount.discountPercentage ? '%' : ' SAR'} off with code: ${discount.code}`,
        },
        relatedModel: "Coupon",
        relatedId: discount._id,
        metadata: {
          code: discount.code,
          discountPercentage: discount.discountPercentage,
          discountAmount: discount.discountAmount,
          endDate: discount.endDate,
        },
        whatsapp: {
          sent: result.success,
          sentAt: result.success ? new Date() : null,
          messageId: result.messageId || null,
          status: result.success ? "sent" : "failed",
          error: result.error || null,
        },
        priority: "medium",
        expiresAt: discount.endDate,
      });

      results.push({ user: user._id, notification, result });

      // Add delay to avoid rate limiting (1 second between messages)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      totalSent: results.filter(r => r.result.success).length,
      totalFailed: results.filter(r => !r.result.success).length,
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

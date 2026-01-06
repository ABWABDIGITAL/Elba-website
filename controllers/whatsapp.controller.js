import {
  sendRegistrationWhatsApp,
  sendOrderUpdateWhatsApp,
  sendDiscountWhatsApp,
  sendFlashSaleWhatsApp,
  handleWhatsAppWebhook,
} from "../services/whatsapp.services.js";

/* --------------------------------------------------
   SEND REGISTRATION WHATSAPP
--------------------------------------------------- */
export const sendRegistrationController = async (req, res) => {
  try {
    const { user } = req; // coming from auth middleware

    const result = await sendRegistrationWhatsApp(user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to send registration WhatsApp",
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "Registration WhatsApp sent successfully",
      data: result.notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration WhatsApp error",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   SEND ORDER STATUS UPDATE WHATSAPP
--------------------------------------------------- */
export const sendOrderUpdateController = async (req, res) => {
  try {
    const { order, user } = req; 
    // order fetched via middleware
    // user = order.user or req.user

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Order status is required",
      });
    }

    const result = await sendOrderUpdateWhatsApp(order, user, status);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to send order update WhatsApp",
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      message: "Order update WhatsApp sent successfully",
      data: result.notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Order update WhatsApp error",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   SEND DISCOUNT WHATSAPP
--------------------------------------------------- */
export const sendDiscountController = async (req, res) => {
  try {
    const { users, discount } = req.body;

    if (!users?.length || !discount) {
      return res.status(400).json({
        success: false,
        message: "Users and discount data are required",
      });
    }

    const result = await sendDiscountWhatsApp(users, discount);

    res.status(200).json({
      success: true,
      message: "Discount WhatsApp process completed",
      data: {
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Discount WhatsApp error",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   SEND FLASH SALE WHATSAPP
--------------------------------------------------- */
export const sendFlashSaleController = async (req, res) => {
  try {
    const { users, saleInfo } = req.body;

    if (!users?.length || !saleInfo) {
      return res.status(400).json({
        success: false,
        message: "Users and sale info are required",
      });
    }

    const result = await sendFlashSaleWhatsApp(users, saleInfo);

    res.status(200).json({
      success: true,
      message: "Flash sale WhatsApp process completed",
      data: {
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Flash sale WhatsApp error",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   WHATSAPP WEBHOOK
--------------------------------------------------- */
export const whatsappWebhookController = async (req, res) => {
  try {
    const result = await handleWhatsAppWebhook(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // WhatsApp requires 200 OK
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "WhatsApp webhook error",
      error: error.message,
    });
  }
};

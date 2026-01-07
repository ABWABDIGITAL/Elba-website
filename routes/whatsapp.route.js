import express from "express";
import {
  sendRegistrationController,
  sendOrderUpdateController,
  sendDiscountController,
  sendFlashSaleController,
  whatsappWebhookController,
} from "../controllers/whatsapp.controller.js";

import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";


const router = express.Router();

// User
router.post("/register", protect, sendRegistrationController);

// Order
router.post("/order/update", sendOrderUpdateController);

// Marketing
router.post("/discount", sendDiscountController);
router.post("/flash-sale", sendFlashSaleController);

// Webhook
router.post("/webhook", whatsappWebhookController);

export default router;

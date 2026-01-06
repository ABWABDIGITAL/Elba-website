import express from "express";
import {
  sendRegistrationController,
  sendOrderUpdateController,
  sendDiscountController,
  sendFlashSaleController,
  whatsappWebhookController,
} from "../controllers/whatsapp.controller.js";

import { protect, allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// User
router.post("/register", protect, sendRegistrationController);

// Order
router.post("/order/update", allowTo("admin"), sendOrderUpdateController);

// Marketing
router.post("/discount", allowTo("admin"), sendDiscountController);
router.post("/flash-sale", allowTo("admin"), sendFlashSaleController);

// Webhook
router.post("/webhook", whatsappWebhookController);

export default router;

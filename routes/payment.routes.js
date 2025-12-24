// routes/payment.routes.js
import express from "express";
import {
  initiateEmbeddedPaymentSession,
  myFatoorahWebhookController,
} from "../controllers/payment.controller.js";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
import {
  verifyWebhookSignature,
  verifyWebhookIP,
} from "../middlewares/webhookSecurity.middleware.js";
import {
  webhookRateLimiter,
  paymentRateLimiter,
} from "../middlewares/rateLimiter.middleware.js";
import {
  validateInitiatePayment,
  validateWebhookPayload,
} from "../validators/payment.validator.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// 💳 INITIATE PAYMENT SESSION (Protected - User Only)
// ═══════════════════════════════════════════════════════════════
router.post(
  "/init-session",
  paymentRateLimiter,           // 1. Rate limit: 10 req/min per IP
  protect,                       // 2. Must be logged in
  allowTo("user"),              // 3. Must be a user (not admin)
  validateInitiatePayment,      // 4. Validate request body
  initiateEmbeddedPaymentSession
);

// ═══════════════════════════════════════════════════════════════
// 🔔 MYFATOORAH WEBHOOK (External - Highly Secured)
// ═══════════════════════════════════════════════════════════════
router.post(
  "/myfatoorah/webhook",
  webhookRateLimiter,           // 1. Rate limit: 100 req/min
  express.json({ 
    limit: "10kb",              // 2. Limit payload size
    type: "*/*" 
  }),
  verifyWebhookIP,              // 3. Only allow MyFatoorah IPs
  validateWebhookPayload,       // 4. Validate payload structure
  verifyWebhookSignature,       // 5. Verify HMAC signature
  myFatoorahWebhookController   // 6. Process webhook
);

export default router;
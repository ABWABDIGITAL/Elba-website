import express from "express";
import {
  initiateEmbeddedPaymentSession,
  myFatoorahWebhookController,
} from "../controllers/payment.controller.js";
import { protect , allowTo } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/init-session", protect , allowTo("user"),initiateEmbeddedPaymentSession);
router.post(
  "/myfatoorah/webhook",
  express.json({ type: "*/*" }),
  myFatoorahWebhookController
);
export default router;

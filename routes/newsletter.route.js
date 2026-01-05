import express from "express";
import {
  subscribeController,
  unsubscribeController,
  updatePreferencesController,
  getTopDiscountedProductsController,
  sendNewsletterController,
  getAllSubscribersController,
  deleteSubscriberController,
} from "../controllers/newsletter.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  validateSubscribe,
  validateUnsubscribe,
  validateUpdatePreferences,
  validateDeleteSubscriber,
  validateGetSubscribers,
} from "../validators/newsletter.validators.js";

const router = express.Router();
import { requirePermission } from "../middlewares/permission.middleware.js";

/* --------------------------------------------------
   PUBLIC ROUTES
--------------------------------------------------- */

// Subscribe to newsletter
router.post("/subscribe", validateSubscribe, subscribeController);

// Unsubscribe from newsletter
router.post("/unsubscribe", validateUnsubscribe, unsubscribeController);

// Update newsletter preferences
router.put("/preferences", validateUpdatePreferences, updatePreferencesController);

// Get top discounted products (preview)
router.get("/products/top-discounts", getTopDiscountedProductsController);

/* --------------------------------------------------
   ADMIN ROUTES
--------------------------------------------------- */

// Send newsletter to all subscribers
router.post("/send", protect, requirePermission("newsletters", "create"), sendNewsletterController);

// Get all subscribers
router.get("/subscribers", protect, requirePermission("newsletters", "read"), validateGetSubscribers, getAllSubscribersController);

// Delete subscriber
router.delete("/subscribers/:id", protect, requirePermission("newsletters", "delete"), validateDeleteSubscriber, deleteSubscriberController);

export default router;

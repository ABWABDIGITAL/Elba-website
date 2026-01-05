import express from "express";
import {
  createReviewController,
  getReviewsController,
  getReviewController,
  updateReviewController,
  deleteReviewController,
  toggleReviewActiveController,
} from "../controllers/reviews.controller.js";

import {
  validateCreateReview,
  validateUpdateReview,
  validateDeleteReview,
  validateGetReview,
  validateGetReviews,
} from "../validators/review.validators.js";

import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";  

const router = express.Router();

router
  .route("/")
  .get(validateGetReviews, getReviewsController)
  .post(
    protect,
    requirePermission("reviews", "create"),
    validateCreateReview,
    createReviewController
  );
 router
 .route("/toggle/:id")
 .put(protect , requirePermission("reviews", "update"), toggleReviewActiveController)
router
  .route("/:slug")
  .get(validateGetReview, getReviewController)
  .put(
    protect,
    requirePermission("reviews", "update"),
    validateUpdateReview,
    updateReviewController
  )

  router
  .route("/:id")
  .delete(
    protect,
    requirePermission("reviews", "delete"),
    validateDeleteReview,
    deleteReviewController
  );
export default router;

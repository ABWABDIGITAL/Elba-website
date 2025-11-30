import express from "express";
import {
  createReviewController,
  getReviewsController,
  getReviewController,
  updateReviewController,
  deleteReviewController,
} from "../controllers/reviews.controller.js";

import {
  validateCreateReview,
  validateUpdateReview,
  validateDeleteReview,
  validateGetReview,
  validateGetReviews,
} from "../validators/review.validators.js";

import { protect, allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(validateGetReviews, getReviewsController)
  .post(
    protect,
    allowTo("user", "admin"), // adjust roles as needed
    validateCreateReview,
    createReviewController
  );

router
  .route("/:id")
  .get(validateGetReview, getReviewController)
  .put(
    protect,
    allowTo("user", "admin"),
    validateUpdateReview,
    updateReviewController
  )
  .delete(
    protect,
    allowTo("user", "admin"),
    validateDeleteReview,
    deleteReviewController
  );

export default router;

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

import { protect, allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(validateGetReviews, getReviewsController)
  .post(
    protect,
    allowTo("user", "admin","superAdmin"), // adjust roles as needed
    validateCreateReview,
    createReviewController
  );
 router
 .route("/toggle/:id")
 .put(protect , allowTo("admin","superAdmin"), toggleReviewActiveController)
router
  .route("/:slug")
  .get(validateGetReview, getReviewController)
  .put(
    protect,
    allowTo("user", "admin"),
    validateUpdateReview,
    updateReviewController
  )

  router
  .route("/:id")
  .delete(
    protect,
    allowTo("user", "admin","superAdmin"),
    validateDeleteReview,
    deleteReviewController
  );
export default router;

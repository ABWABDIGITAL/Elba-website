import express from "express";
import {
  createCouponController,
  getCouponController,
  getCouponsController,
  updateCouponController,
  deleteCouponController,
  applyCouponController,
} from "../controllers/coupon.controller.js";

import {
  createCouponValidator,
  getCouponValidator,
  listCouponsValidator,
  updateCouponValidator,
  deleteCouponValidator,
  applyCouponValidator,
} from "../validators/coupon.validators.js";

const router = express.Router();
import { protect, allowTo } from "../middlewares/authMiddleware.js";
// Base path: /api/v1/coupons

router
  .route("/")
  .post(protect, allowTo("admin"), createCouponValidator, createCouponController)
  .get(protect,listCouponsValidator, getCouponsController);

router
  .route("/apply")
  .post(protect,applyCouponValidator, applyCouponController);

router
  .route("/:slug")
  .get(protect,getCouponValidator, getCouponController)
  .patch(protect, allowTo("admin"),updateCouponValidator, updateCouponController)
  .delete(protect, allowTo("admin"),deleteCouponValidator, deleteCouponController);

export default router;

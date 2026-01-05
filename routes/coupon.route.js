import express from "express";
import {
  createCouponController,
  getCouponController,
  getCouponsController,
  updateCouponController,
  deleteCouponController,
  applyCouponController,
} from "../controllers/coupon.controller.js";
import {applyCouponToCartService} from "../services/coupon.services.js";
import {
  createCouponValidator,
  getCouponValidator,
  listCouponsValidator,
  updateCouponValidator,
  deleteCouponValidator,
  applyCouponValidator,
} from "../validators/coupon.validators.js";

const router = express.Router();
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
// Base path: /api/v1/coupons

router
  .route("/")
  .post(protect, requirePermission("coupons", "create"), createCouponValidator, createCouponController)
  .get(protect,listCouponsValidator, getCouponsController);

router
  .post("/apply-coupon", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { couponCode } = req.body;

    const result = await applyCouponToCartService(userId, couponCode);

    res.json(result);
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message,
      details: err
    });
  }
});


router
  .route("/:slug")
  .get(protect,getCouponValidator, getCouponController)
  .patch(protect, requirePermission("coupons", "update"),updateCouponValidator, updateCouponController)
  .delete(protect, requirePermission("coupons", "delete"),deleteCouponValidator, deleteCouponController);

export default router;

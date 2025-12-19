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
import { protect, allowTo } from "../middlewares/authMiddleware.js";
// Base path: /api/v1/coupons

router
  .route("/")
  .post(protect, allowTo("admin","superAdmin"), createCouponValidator, createCouponController)
  .get(protect,listCouponsValidator, getCouponsController);

router
  router.post("/apply-coupon", protect, async (req, res) => {
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
  .patch(protect, allowTo("admin","superAdmin"),updateCouponValidator, updateCouponController)
  .delete(protect, allowTo("admin","superAdmin"),deleteCouponValidator, deleteCouponController);

export default router;

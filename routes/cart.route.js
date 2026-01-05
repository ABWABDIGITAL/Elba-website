import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addToCartController,
  getCartController,
  updateCartItemController,
  removeCartItemController,
  clearCartController,
  applyCouponController,
  removeCouponController,
} from "../controllers/cart.controller.js";
import {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
} from "../validators/cart.validators.js";

const router = express.Router();

// All cart routes require authentication 
router.use(protect);

// Cart operations
router.post("/", addToCartValidator, addToCartController);
router.get("/", getCartController);
router.put("/item", updateCartItemValidator, updateCartItemController);
router.delete("/item", removeCartItemValidator, removeCartItemController);
router.delete("/clear", clearCartController);

// Coupon operations
router.post("/coupon", applyCouponController);
router.delete("/coupon", removeCouponController);

export default router;
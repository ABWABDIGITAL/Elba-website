import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createCartService ,getCartService ,updateCartService ,deleteCartService  } from "../services/cart.services.js";
import { addToCartValidator ,updateCartItemValidator ,removeCartItemValidator  } from "../validators/cart.validators.js";
const router = express.Router();

router.post("/", protect,addToCartValidator,createCartService);
router.get("/:id", protect, getCartService);
router.put("/:id", protect, updateCartItemValidator, updateCartService);
router.delete("/:id", protect,removeCartItemValidator, deleteCartService);
export default router;
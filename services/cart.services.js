import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Coupon from "../models/coupon.model.js";
import ApiError, { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";
import { trackAddToCart, trackRemoveFromCart } from '../services/analytics.services.js';
const calculateCartTotals = (cartItems) => {
  const totalCartPrice = cartItems.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return {
    totalCartPrice: Number(totalCartPrice.toFixed(2)),
    totalPriceAfterDiscount: Number(totalCartPrice.toFixed(2)),
  };
};

/* --------------------------------------------------
   ADD TO CART
--------------------------------------------------- */
export const addToCartService = async (req, userId, slug, quantity = 1, color = null) => {
  try {
    // Validate product exists and has stock
    const product = await Product.findOne({ slug });
    if (!product) throw NotFound("Product not found");

    if (product.status !== "active") {
      throw BadRequest("Product is not available for purchase");
    }

    if (product.stock < quantity) {
      throw BadRequest(`Only ${product.stock} items available in stock`);
    }

    // Calculate price (use discountPrice if available, otherwise use regular price)
    const itemPrice = product.discountPrice > 0 && product.discountPrice < product.price
      ? product.price - product.discountPrice
      : product.price;

    // Find or create cart for user
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: userId,
        cartItems: [
          {
            product: product._id,
            quantity,
            color,
            price: itemPrice,
          },
        ],
      });
    } else {
      // Check if product already exists in cart
      const existingItemIndex = cart.cartItems.findIndex(
        (item) =>
          item.product.toString() === product._id.toString() &&
          item.color === color
      );

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const newQuantity = cart.cartItems[existingItemIndex].quantity + quantity;

        // Check stock availability for new quantity
        if (product.stock < newQuantity) {
          throw BadRequest(`Only ${product.stock} items available in stock`);
        }

        cart.cartItems[existingItemIndex].quantity = newQuantity;
        cart.cartItems[existingItemIndex].price = itemPrice;
      } else {
        // Add new item to cart
        cart.cartItems.push({
          product: product._id,
          quantity,
          color,
          price: itemPrice,
        });
      }
    }

    // Recalculate totals
    const totals = calculateCartTotals(cart.cartItems);
    cart.totalCartPrice = totals.totalCartPrice;
    cart.totalPriceAfterDiscount = totals.totalPriceAfterDiscount;

    await cart.save();

    // Populate cart with product details
    await cart.populate({
      path: "cartItems.product",
      select: "en.name ar.name en.slug ar.slug sku images stock status price discountPrice",
    });
      await trackAddToCart(req, product, quantity, cart);

    return {
      OK: true,
      message: "Product added to cart successfully",
      data: cart,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof ApiError || err instanceof ApiError) {
      throw err;
    }
    throw ServerError("Failed to add product to cart", err.message);
  }
};

/* --------------------------------------------------
   GET USER CART
--------------------------------------------------- */
export const getCartService = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId, isActive: true }).populate({
      path: "cartItems.product",
      select: "en.title ar.title sku slug images stock status price discountPrice",
    });

    if (!cart) {
      // Return empty cart if none exists
      return {
        OK: true,
        message: "Cart is empty",
        data: {
          cartItems: [],
          totalCartPrice: 0,
          totalPriceAfterDiscount: 0,
        },
      };
    }

    // Validate stock availability for all items
    const stockWarnings = [];
    cart.cartItems.forEach((item) => {
      if (item.product.stock < item.quantity) {
        stockWarnings.push({
          product: item.product._id,
          available: item.product.stock,
          requested: item.quantity,
        });
      }
    });

    return {
      OK: true,
      message: "Cart retrieved successfully",
      data: cart,
      stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
    };
  } catch (err) {
    throw ServerError("Failed to get cart", err);
  }
};

/* --------------------------------------------------
   UPDATE CART ITEM QUANTITY
--------------------------------------------------- */
export const updateCartItemService = async (userId, productId, quantity, color = null) => {
  try {
    if (quantity < 1) {
      throw BadRequest("Quantity must be at least 1");
    }

    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) throw NotFound("Cart not found");

    // Find the item in cart
    const itemIndex = cart.cartItems.findIndex(
      (item) =>
        item.product.toString() === productId.toString() &&
        item.color === color
    );

    if (itemIndex === -1) {
      throw NotFound("Product not found in cart");
    }

    // Validate stock
    const product = await Product.findById(productId);
    if (!product) throw NotFound("Product not found");

    if (product.stock < quantity) {
      throw BadRequest(`Only ${product.stock} items available in stock`);
    }

    // Update quantity
    cart.cartItems[itemIndex].quantity = quantity;

    // Update price (in case it changed)
    const itemPrice = product.discountPrice > 0 && product.discountPrice < product.price
      ? product.price - product.discountPrice
      : product.price;
    cart.cartItems[itemIndex].price = itemPrice;

    // Recalculate totals
    const totals = calculateCartTotals(cart.cartItems);
    cart.totalCartPrice = totals.totalCartPrice;
    cart.totalPriceAfterDiscount = totals.totalPriceAfterDiscount;

    await cart.save();

    await cart.populate({
      path: "cartItems.product",
      select: "en.name ar.name en.slug ar.slug sku en.images ar.images stock status",
    });

    return {
      OK: true,
      message: "Cart updated successfully",
      data: cart,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof BadRequest || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to update cart", err);
  }
};

/* --------------------------------------------------
   REMOVE ITEM FROM CART
--------------------------------------------------- */
export const removeCartItemService = async (userId, slug) => {
  try {
    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) throw NotFound("Cart not found");

    // لازم نعمل populate عشان نوصل للـ slug
    await cart.populate("cartItems.product");

    const initialLength = cart.cartItems.length;

    cart.cartItems = cart.cartItems.filter(
      (item) => item.product.slug !== slug
    );

    if (cart.cartItems.length === initialLength) {
      throw NotFound("Product not found in cart");
    }

    // إعادة حساب الأسعار
    const totals = calculateCartTotals(cart.cartItems);
    cart.totalCartPrice = totals.totalCartPrice;
    cart.totalPriceAfterDiscount = totals.totalPriceAfterDiscount;

    await cart.save();

    await cart.populate({
      path: "cartItems.product",
      select: "en.name ar.name en.slug ar.slug sku en.images ar.images stock status",
    });
await trackRemoveFromCart(req, product, quantity, updatedCart);
    return {
      OK: true,
      message: "Product removed from cart successfully",
      data: cart,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof ApiError) {
      throw err;
    }
    throw ServerError("Failed to remove item from cart", err);
  }
};


/* --------------------------------------------------
   CLEAR CART
--------------------------------------------------- */
export const clearCartService = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) throw NotFound("Cart not found");

    cart.cartItems = [];
    cart.totalCartPrice = 0;
    cart.totalPriceAfterDiscount = 0;

    await cart.save();

    return {
      OK: true,
      message: "Cart cleared successfully",
      data: cart,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to clear cart", err);
  }
};

/* --------------------------------------------------
   APPLY COUPON TO CART
--------------------------------------------------- */
export const applyCouponToCartService = async (userId, couponCode) => {
  try {
    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) throw NotFound("Cart not found");

    if (cart.cartItems.length === 0) {
      throw BadRequest("Cart is empty");
    }

    // Find and validate coupon
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon) throw NotFound("Invalid or inactive coupon");

    // Check expiration
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      throw BadRequest("Coupon has expired");
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw BadRequest("Coupon usage limit reached");
    }

    // Check minimum purchase
    if (coupon.minPurchase && cart.totalCartPrice < coupon.minPurchase) {
      throw BadRequest(`Minimum purchase of ${coupon.minPurchase} required to use this coupon`);
    }

    // Apply discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (cart.totalCartPrice * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    }

    cart.totalPriceAfterDiscount = Math.max(0, cart.totalCartPrice - discount);
    cart.appliedCoupon = coupon._id;

    await cart.save();

    await cart.populate({
      path: "cartItems.product",
      select: "en.name ar.name en.slug ar.slug sku en.images ar.images stock status",
    });

    return {
      OK: true,
      message: "Coupon applied successfully",
      data: cart,
      discount: Number(discount.toFixed(2)),
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof ApiError) {
      throw err;
    }
    throw ServerError("Failed to apply coupon", err);
  }
};

/* --------------------------------------------------
   REMOVE COUPON FROM CART
--------------------------------------------------- */
export const removeCouponFromCartService = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) throw NotFound("Cart not found");

    cart.totalPriceAfterDiscount = cart.totalCartPrice;
    cart.appliedCoupon = undefined;

    await cart.save();

    await cart.populate({
      path: "cartItems.product",
      select: "en.name ar.name en.slug ar.slug sku en.images ar.images stock status",
    });

    return {
      OK: true,
      message: "Coupon removed successfully",
      data: cart,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to remove coupon", err);
  }
};

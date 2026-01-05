import Coupon from "../models/coupon.model.js";
import Cart from "../models/cart.model.js";
import ApiError, {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";

/**
 * Utility: generate random coupon code
 */
const generateRandomCode = (prefix = "SALE", length = 5) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let part = "";
  for (let i = 0; i < length; i++) {
    part += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${part}`;
};

const generateUniqueCode = async (prefix = "SALE", length = 5, maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateRandomCode(prefix, length);
    const exists = await Coupon.findOne({ code });
    if (!exists) return code;
  }
  throw ServerError("Failed to generate unique coupon code");
};

/**
 * Create coupon (admin) – ADM-UC-10
 */
export const createCouponService = async ({
  name,
  discount,
  expiredAt,
  code,
  autoGenerateCode = true,
}) => {
  try {
    let finalCode = code;

    if (!finalCode && autoGenerateCode) {
      finalCode = await generateUniqueCode();
    } else if (!finalCode) {
      throw BadRequest("Code is required when autoGenerateCode is false");
    }

    const coupon = await Coupon.create({
      name,
      code: finalCode,
      discount,
      expiredAt,
    });

    // Auto deactivate if already expired (edge case)
    if (coupon.expiredAt <= new Date()) {
      coupon.isActive = false;
      await coupon.save();
    }

    return coupon;
  } catch (err) {
    if (err.code === 11000) {
      throw BadRequest("Coupon code or slug already exists");
    }
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to create coupon", err);
  }
};

/**
 * Get one coupon by slug (admin or internal use)
 */
export const getCouponService = async (slug) => {
  try {
    const coupon = await Coupon.findOne({ slug });
    if (!coupon) throw NotFound("Coupon not found");

    // Auto deactivate if expired
    if (coupon.expiredAt <= new Date() && coupon.isActive) {
      coupon.isActive = false;
      await coupon.save();
    }

    return coupon;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw BadRequest("Invalid coupon slug");
  }
};

/**
 * Get all coupons with filters + pagination
 */
export const getCouponsService = async (query) => {
  try {
    const features = new ApiFeatures(Coupon.find({isActive:true}), query, {
      allowedFilterFields: ["isActive", "discount"],
      searchFields: ["name", "code"],
    });

    features.filter().search().sort().limitFields().paginate();

    const data = await features.mongooseQuery;
    const total = await Coupon.countDocuments(features.getFilter());

    // Auto deactivate any expired coupons we fetched
    await Promise.all(
      data.map(async (coupon) => {
        if (coupon.isActive && coupon.expiredAt <= new Date()) {
          coupon.isActive = false;
          await coupon.save();
        }
      })
    );

    return {
      data,
      pagination: features.buildPaginationResult(total),
    };
  } catch (err) {
    throw ServerError("Failed to fetch coupons", err);
  }
};

/**
 * Update coupon (partial) by slug
 */
export const updateCouponService = async ({
  slug,
  name,
  discount,
  expiredAt,
  code,
}) => {
  const coupon = await Coupon.findOne({ slug });
  if (!coupon) throw NotFound("Coupon not found");

  if (name !== undefined) coupon.name = name;        // slug auto-updates
  if (discount !== undefined) coupon.discount = discount;
  if (expiredAt !== undefined) coupon.expiredAt = expiredAt;
  if (code !== undefined) coupon.code = code;

  try {
    await coupon.save();

    if (coupon.expiredAt <= new Date() && coupon.isActive) {
      coupon.isActive = false;
      await coupon.save();
    }

    return coupon;
  } catch (err) {
    if (err.code === 11000) {
      throw BadRequest("Coupon code or slug already exists");
    }
    throw ServerError("Failed to update coupon", err);
  }
};

/**
 * Delete coupon (soft or hard) by slug
 */
export const deleteCouponService = async ({ slug, softDelete = true }) => {
  const coupon = await Coupon.findOne({ slug });
  if (!coupon) throw NotFound("Coupon not found");

  try {
    if (softDelete) {
      coupon.isActive = !coupon.isActive;
      await coupon.save();
      return { deleted: true, softDeleted: true };
    }

    await Coupon.findOneAndDelete({ slug });
    return { deleted: true, softDeleted: false };
  } catch (err) {
    throw ServerError("Failed to delete coupon", err);
  }
};
export const applyCouponService = async ({ code, subtotal }) => {
  if (subtotal === undefined || subtotal === null) {
    throw BadRequest("Subtotal is required");
  }

  const coupon = await Coupon.findOne({ code });
  if (!coupon) throw NotFound("Invalid coupon code");

  // Check expiry
  if (coupon.expiredAt && coupon.expiredAt <= new Date()) {
    coupon.isActive = false;
    await coupon.save();
    throw BadRequest("Coupon is expired");
  }

  if (!coupon.isActive) {
    throw BadRequest("Coupon is inactive");
  }

  // حساب الخصم
  const discountAmount = (subtotal * coupon.discount) / 100;
  const totalAfterDiscount = subtotal - discountAmount;

  return {
    coupon,
    discountAmount,
    totalAfterDiscount,
  };
};

export const applyCouponToCartService = async (userId, couponCode) => {
  try {
    const cart = await Cart.findOne({ user: userId, isActive: true });
    if (!cart) throw NotFound("Cart not found");

    if (cart.cartItems.length === 0) {
      throw BadRequest("Cart is empty");
    }

    const subtotal = cart.totalCartPrice;

    const { coupon, discountAmount, totalAfterDiscount } =
      await applyCouponService({ code: couponCode, subtotal });

    cart.appliedCoupon = coupon._id;
    cart.totalPriceAfterDiscount = Number(totalAfterDiscount.toFixed(2));

    await cart.save();
    await cart.populate({
      path: "cartItems.product",
      select: "en.name ar.name en.slug ar.slug sku en.images ar.images stock status",
    });

    return {
      OK: true,
      message: "Coupon applied successfully",
      discount: Number(discountAmount.toFixed(2)),
      totalAfterDiscount: cart.totalPriceAfterDiscount,
      data: cart,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to apply coupon", err);
  }
};




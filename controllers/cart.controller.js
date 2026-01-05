import {
  addToCartService,
  getCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
  removeCouponFromCartService,
} from "../services/cart.services.js";
import { StatusCodes } from "http-status-codes";
import {applyCouponToCartService}from "../services/coupon.services.js";

/* --------------------------------------------------
   ADD TO CART
--------------------------------------------------- */
export const addToCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { slug, quantity, color } = req.body;

    const result = await addToCartService(req,userId, slug, quantity, color);

    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET USER CART
--------------------------------------------------- */
export const getCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await getCartService(userId);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE CART ITEM QUANTITY
--------------------------------------------------- */
export const updateCartItemController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { slug, quantity, color } = req.body;

    const result = await updateCartItemService(userId, slug, quantity, color);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   REMOVE ITEM FROM CART
--------------------------------------------------- */
export const removeCartItemController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { slug} = req.body;

    const result = await removeCartItemService(userId, slug);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   CLEAR CART
--------------------------------------------------- */
export const clearCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await clearCartService(userId);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   APPLY COUPON TO CART
--------------------------------------------------- */
export const applyCouponController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { couponCode } = req.body;

    const result = await applyCouponToCartService(userId, couponCode);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   REMOVE COUPON FROM CART
--------------------------------------------------- */
export const removeCouponController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await removeCouponFromCartService(userId);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

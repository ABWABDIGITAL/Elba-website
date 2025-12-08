import {
  createCouponService,
  getCouponService,
  getCouponsService,
  updateCouponService,
  deleteCouponService,
  applyCouponToCartService,
} from "../services/coupon.services.js";

export const createCouponController = async (req, res, next) => {
  try {
    const coupon = await createCouponService({
      name: req.body.name,
      discount: req.body.discount,
      expiredAt: req.body.expiredAt,
      code: req.body.code,
      autoGenerateCode:
        req.body.autoGenerateCode !== undefined
          ? req.body.autoGenerateCode
          : true,
    });

    res.status(201).json({
      success: true,
      data: coupon,
    });
  } catch (err) {
    next(err);
  }
};

export const getCouponController = async (req, res, next) => {
  try {
    const coupon = await getCouponService(req.params.slug);
    res.json({
      success: true,
      data: coupon,
    });
  } catch (err) {
    next(err);
  }
};

export const getCouponsController = async (req, res, next) => {
  try {
    const result = await getCouponsService(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCouponController = async (req, res, next) => {
  try {
    const coupon = await updateCouponService({
      slug: req.params.slug,
      name: req.body.name,
      discount: req.body.discount,
      expiredAt: req.body.expiredAt,
      code: req.body.code,
    });

    res.json({
      success: true,
      data: coupon,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCouponController = async (req, res, next) => {
  try {
    const soft =
      req.query.soft !== undefined
        ? req.query.soft === "true" || req.query.soft === true
        : true;

    const result = await deleteCouponService({
      slug: req.params.slug,
      softDelete: soft,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const applyCouponController = async (req, res, next) => {
  try {
    const result = await applyCouponToCartService({
      code: req.body.code,
      subtotal: req.body.subtotal,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

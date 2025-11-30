import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const createCouponValidator = [
  body("name")
    .notEmpty().withMessage("Name is required")
    .isString().withMessage("Name must be a string"),

  body("autoGenerateCode")
    .optional()
    .isBoolean().withMessage("autoGenerateCode must be a boolean")
    .toBoolean(),

  body("code")
    .optional()
    .isString().withMessage("Code must be a string"),

  body("discount")
    .notEmpty().withMessage("Discount is required")
    .bail()
    .isFloat({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100"),

  body("expiredAt")
    .notEmpty().withMessage("expiredAt is required")
    .bail()
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error("Invalid date format");
      if (date <= new Date()) throw new Error("Expired date must be in the future");
      return true;
    }),

  validatorMiddleware,
];

export const updateCouponValidator = [
  param("slug")
    .notEmpty().withMessage("Slug is required")
    .isString().withMessage("Slug must be a string"),

  body("name")
    .optional()
    .isString().withMessage("Name must be a string")
    .notEmpty().withMessage("Name cannot be empty"),

  body("code")
    .optional()
    .isString().withMessage("Code must be a string")
    .notEmpty().withMessage("Code cannot be empty"),

  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100"),

  body("expiredAt")
    .optional()
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error("Invalid date format");
      if (date <= new Date()) throw new Error("Expired date must be in the future");
      return true;
    }),

  validatorMiddleware,
];

export const getCouponValidator = [
  param("slug")
    .notEmpty().withMessage("Slug is required")
    .isString().withMessage("Slug must be a string"),
  validatorMiddleware,
];

export const deleteCouponValidator = [
  param("slug")
    .notEmpty().withMessage("Slug is required")
    .isString().withMessage("Slug must be a string"),
  query("soft")
    .optional()
    .isBoolean().withMessage("soft must be a boolean")
    .toBoolean(),
  validatorMiddleware,
];

export const listCouponsValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1 }).withMessage("limit must be >= 1"),
  query("isActive")
    .optional()
    .isBoolean().withMessage("isActive must be a boolean")
    .toBoolean(),
  validatorMiddleware,
];

export const applyCouponValidator = [
  body("code")
    .notEmpty().withMessage("Code is required")
    .isString().withMessage("Code must be a string"),
  body("subtotal")
    .notEmpty().withMessage("Subtotal is required")
    .bail()
    .isFloat({ min: 0 }).withMessage("Subtotal must be a positive number"),
  validatorMiddleware,
];

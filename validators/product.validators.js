import { body, param, validationResult } from "express-validator";
import { BadRequest } from "../utlis/apiError.js";

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(BadRequest("Validation error", errors.array()));
  }
  next();
};

const localizedStringRules = (field) => [
  body(`${field}.en`)
    .notEmpty().withMessage(`${field}.en is required`)
    .isString().withMessage(`${field}.en must be string`),

  body(`${field}.ar`)
    .notEmpty().withMessage(`${field}.ar is required`)
    .isString().withMessage(`${field}.ar must be string`),
];

export const validateCreateProduct = [
  ...localizedStringRules("name"),
  ...localizedStringRules("title"),

  body("sku")
    .notEmpty().withMessage("sku is required")
    .isString(),

  body("price")
    .notEmpty().withMessage("price is required")
    .isFloat({ min: 0 }).withMessage("price must be positive"),

  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("discountPrice must be >= 0")
    .custom((value, { req }) => {
      if (req.body.price && value > req.body.price) {
        throw new Error("discountPrice cannot exceed price");
      }
      return true;
    }),

  body("discountPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("discountPercentage must be 0–100"),

  body("currencyCode")
    .optional()
    .isIn(["SAR", "USD", "AED"])
    .withMessage("currencyCode must be SAR|USD|AED"),

  body("warranty.en")
    .optional()
    .isString(),

  body("warranty.ar")
    .optional()
    .isString(),

  body("stock")
    .notEmpty().withMessage("stock is required")
    .isInt({ min: 0 }).withMessage("stock must be a non-negative integer"),

  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock", "coming_soon"])
    .withMessage("Invalid status"),

  body("category")
    .notEmpty().withMessage("category is required")
    .isMongoId().withMessage("Invalid category ID"),

  body("brand")
    .notEmpty().withMessage("brand is required")
    .isMongoId().withMessage("Invalid brand ID"),

  handleValidation,
];

export const validateUpdateProduct = [
  param("productId").isMongoId().withMessage("Invalid productId"),

  body("price")
    .optional()
    .isFloat({ min: 0 }).withMessage("price must be positive"),

  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("discountPrice must be >= 0")
    .custom((value, { req }) => {
      if (req.body.price && value > req.body.price) {
        throw new Error("discountPrice cannot exceed price");
      }
      return true;
    }),

  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock", "coming_soon"])
    .withMessage("Invalid status"),

  handleValidation,
];

export const validateDeleteProduct = [
  param("productId").isMongoId().withMessage("Invalid productId"),
  handleValidation,
];

export const validateGetProduct = [
  param("slug").notEmpty().withMessage("slug is required"),
  handleValidation,
];

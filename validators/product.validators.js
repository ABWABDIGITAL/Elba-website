import { body, param, validationResult } from "express-validator";
import { BadRequest } from "../utlis/apiError.js";

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(BadRequest("Validation error", errors.array()));
  }
  next();
};

// Validation rules for nested localized content under en/ar top-level keys
const localizedFieldRules = (lang, field) => [
  body(`${lang}.${field}`)
    .notEmpty().withMessage(`${lang}.${field} is required`)
    .isString().withMessage(`${lang}.${field} must be string`),
];

export const validateCreateProduct = [
  // English localized fields
  ...localizedFieldRules("en", "name"),
  ...localizedFieldRules("en", "title"),

  // Arabic localized fields
  ...localizedFieldRules("ar", "name"),
  ...localizedFieldRules("ar", "title"),

  // Optional localized fields
  body("en.warranty").optional().isString(),
  body("ar.warranty").optional().isString(),

  // Language-independent fields
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

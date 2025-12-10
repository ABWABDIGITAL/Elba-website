import { body, param, validationResult } from "express-validator";
import { BadRequest } from "../utlis/apiError.js";

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      BadRequest("Validation error", errors.array().map(e => e.msg))
    );
  }
  next();
};

/* ----------------------------------------------------
   REQUIRED LOCALIZED FIELDS (ONLY title + subTitle)
----------------------------------------------------- */
const localizedTitleRules = (lang) => [
  body(`${lang}.title`)
    .notEmpty().withMessage(`${lang}.title is required`)
    .isString().withMessage(`${lang}.title must be a string`),

  body(`${lang}.subTitle`)
    .notEmpty().withMessage(`${lang}.subTitle is required`)
    .isString().withMessage(`${lang}.subTitle must be a string`),
];

/* ----------------------------------------------------
   CREATE PRODUCT VALIDATION
----------------------------------------------------- */
export const validateCreateProduct = [
  // Required localized fields
  ...localizedTitleRules("en"),
  ...localizedTitleRules("ar"),

  // SKU
  body("sku")
    .notEmpty().withMessage("SKU is required")
    .isString().withMessage("SKU must be a string"),

  // Price
  body("price")
    .notEmpty().withMessage("price is required")
    .isFloat({ min: 0 })
    .withMessage("price must be a positive number"),

  // Discount value (optional)
  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("discountPrice must be >= 0")
    .custom((value, { req }) => {
      const price = Number(req.body.price);
      const discount = Number(value);
      if (price && discount > price) {
        throw new Error("discountPrice cannot exceed price");
      }
      return true;
    }),

  // Currency (optional)
  body("currencyCode")
    .optional()
    .isIn(["SAR", "USD", "AED"])
    .withMessage("currencyCode must be one of: SAR, USD, AED"),

  // Stock
  body("stock")
    .notEmpty().withMessage("stock is required")
    .isInt({ min: 0 }).withMessage("stock must be non-negative integer"),

  // Status (optional)
  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock", "coming_soon"])
    .withMessage("Invalid status"),

  // Category
  body("category")
    .notEmpty().withMessage("category is required")
    .isMongoId().withMessage("Invalid category ID"),

  // Brand
  body("brand")
    .notEmpty().withMessage("brand is required")
    .isMongoId().withMessage("Invalid brand ID"),

  handleValidation,
];

/* ----------------------------------------------------
   UPDATE PRODUCT VALIDATION
----------------------------------------------------- */
export const validateUpdateProduct = [
  param("productId").isMongoId().withMessage("Invalid productId"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("price must be positive"),

    body("discountPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("discountPrice must be >= 0")
      .custom((value, { req }) => {
        const price = req.body.price;

        // Validate *only if* price was actually provided and is a clean number
        if (price !== undefined && price !== "" && !isNaN(price)) {
          if (Number(value) > Number(price)) {
            throw new Error("discountPrice cannot exceed price");
          }
        }

    return true;
  }),


  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock", "coming_soon"])
    .withMessage("Invalid status"),

  handleValidation,
];

/* ----------------------------------------------------
   DELETE VALIDATION
----------------------------------------------------- */
export const validateDeleteProduct = [
  param("productId").isMongoId().withMessage("Invalid productId"),
  handleValidation,
];

/* ----------------------------------------------------
   GET PRODUCT BY SKU (NOT slug)
----------------------------------------------------- */
export const validateGetProduct = [
  param("sku").notEmpty().withMessage("SKU is required"),
  handleValidation,
];

// src/validators/home.validators.js
import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import validateSeo from "./seo.validators.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


/* ----------------------------------------------------
   BANNER VALIDATOR (hero, gif, promovideo, popupVideo)
---------------------------------------------------- */
const validateBannerArray = (field) => [
  body(field)
    .optional()
    .isArray().withMessage(`${field} must be an array`),

  body(`${field}.*.imageUrl`)
    .optional()
    .isString().withMessage(`${field}.*.imageUrl must be a string`),

  body(`${field}.*.redirectUrl`)
    .optional()
    .isString().withMessage(`${field}.*.redirectUrl must be a string`),

  body(`${field}.*.sortOrder`)
    .optional()
    .isInt().withMessage(`${field}.*.sortOrder must be a number`),

  body(`${field}.*.isActive`)
    .optional()
    .isBoolean().withMessage(`${field}.*.isActive must be a boolean`),
];


/* ----------------------------------------------------
   OFFER BANNER VALIDATOR
---------------------------------------------------- */
const validateOfferBanner = [
  body("offerBanner")
    .optional()
    .isArray().withMessage("offerBanner must be an array"),

  body("offerBanner.*.url")
    .notEmpty().withMessage("offerBanner.*.url is required")
    .isString().withMessage("offerBanner.*.url must be a string"),

  body("offerBanner.*.discount")
    .notEmpty().withMessage("offerBanner.*.discount is required")
    .isNumeric().withMessage("offerBanner.*.discount must be a number")
    .custom((val) => val >= 0 && val <= 100)
    .withMessage("offerBanner.*.discount must be between 0 and 100"),

  body("offerBanner.*.discountTitle")
    .notEmpty().withMessage("offerBanner.*.discountTitle is required")
    .isString().withMessage("offerBanner.*.discountTitle must be a string"),
];


/* ----------------------------------------------------
   CATEGORY SHORTCUTS
---------------------------------------------------- */
const validateCategoryShortcuts = [
  body("categories.categoryIds")
    .optional()
    .isArray().withMessage("categories.categoryIds must be an array"),

  body("categories.categoryIds.*")
    .optional()
    .custom(async (val) => {
      if (!isValidObjectId(val)) throw new Error("Invalid Category ID");
      const exists = await Category.findById(val);
      if (!exists) throw new Error(`Category not found: ${val}`);
      return true;
    }),
];

/* ----------------------------------------------------
   PRODUCT SECTIONS (bestOffers, Products)
---------------------------------------------------- */
const validateProductIds = (field) => [
  body(`${field}.productIds`)
    .optional()
    .isArray().withMessage(`${field}.productIds must be an array`),

  body(`${field}.productIds.*`)
    .optional()
    .custom(async (val) => {
      if (!isValidObjectId(val)) throw new Error(`Invalid Product ID: ${val}`);
      const exists = await Product.findById(val);
      if (!exists) throw new Error(`Product not found: ${val}`);
      return true;
    }),
];


/* ----------------------------------------------------
   BRANCHES (IDs only)
---------------------------------------------------- */
const validateBranches = [
  body("branches.branchIds")
    .optional()
    .isArray().withMessage("branches.branchIds must be an array"),

  body("branches.branchIds.*")
    .optional()
    .custom((val) => {
      if (!isValidObjectId(val)) throw new Error(`Invalid Branch ID: ${val}`);
      return true;
    }),
];


/* ----------------------------------------------------
   FINAL EXPORT — MATCHES HOME SCHEMA EXACTLY
---------------------------------------------------- */
export const validateUpdateHome = [
  // Banner fields (matching schema)
  ...validateBannerArray("hero"),
  ...validateBannerArray("gif"),
  ...validateBannerArray("promovideo"),
  ...validateBannerArray("popupVideo"),

  // Offer banner
  ...validateOfferBanner,

  // Category shortcuts
  ...validateCategoryShortcuts,

  // Product sections
  ...validateProductIds("bestOffers"),
  ...validateProductIds("Products"),

  // Branches
  ...validateBranches,

  // SEO
  ...validateSeo,

  validatorMiddleware,
];

import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import Brand from "../models/brand.model.js";
import slugify from "slugify";

export const validateCreateBrand = [
  body("en.name")
    .notEmpty().withMessage("English name is required")
    .isLength({ min: 2 }).withMessage("English name must be at least 2 chars")
    .isLength({ max: 50 }).withMessage("English name must be under 50 chars"),

  body("ar.name")
    .notEmpty().withMessage("Arabic name is required")
    .isLength({ min: 2 }).withMessage("Arabic name must be at least 2 chars")
    .isLength({ max: 50 }).withMessage("Arabic name must be under 50 chars"),

  // Custom validation for duplicates
  body("en.name").custom(async (value) => {
    const exists = await Brand.findOne({ "en.name": value });
    if (exists) throw new Error("Brand with this English name already exists");
    return true;
  }),

  body("ar.name").custom(async (value) => {
    const exists = await Brand.findOne({ "ar.name": value });
    if (exists) throw new Error("Brand with this Arabic name already exists");
    return true;
  }),

  // Slug auto-generation
  body("en.name").custom((value, { req }) => {
    req.body.en.slug = slugify(value, { lower: true });
    return true;
  }),
  body("ar.name").custom((value, { req }) => {
    req.body.ar.slug = slugify(value, { lower: true });
    return true;
  }),

  // Image required
  body().custom((_, { req }) => {
    if (!req.file) throw new Error("Brand logo is required");
    return true;
  }),

  validatorMiddleware,
];
export const validateUpdateBrand = [
  param("id").isMongoId().withMessage("Invalid Brand ID"),

  body("en.name")
    .optional()
    .isLength({ min: 2 }).withMessage("English name must be at least 2 chars")
    .isLength({ max: 50 }).withMessage("English name must be under 50 chars")
    .custom(async (value, { req }) => {
      if (!value) return true;

      const exists = await Brand.findOne({
        "en.name": value,
        _id: { $ne: req.params.id }
      });
      if (exists) throw new Error("Another brand with this English name exists");

      req.body.en.slug = slugify(value, { lower: true });
      return true;
    }),

  body("ar.name")
    .optional()
    .isLength({ min: 2 }).withMessage("Arabic name must be at least 2 chars")
    .isLength({ max: 50 }).withMessage("Arabic name must be under 50 chars")
    .custom(async (value, { req }) => {
      if (!value) return true;

      const exists = await Brand.findOne({
        "ar.name": value,
        _id: { $ne: req.params.id }
      });
      if (exists) throw new Error("Another brand with this Arabic name exists");

      req.body.ar.slug = slugify(value, { lower: true });
      return true;
    }),

  validatorMiddleware,
];
export const validateDeleteBrand = [ param("id").isMongoId().withMessage("Invalid Brand ID Please try again with valid ID"), validatorMiddleware, ]; export const validateGetBrand = [ param("id").isMongoId().withMessage("Invalid Brand ID Please try again with valid ID"), validatorMiddleware, ];
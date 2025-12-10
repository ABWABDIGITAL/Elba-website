import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import Category from "../models/category.model.js";
import slugify from "slugify";

export const validateCreateCategory = [

  body("ar.name")
    .notEmpty().withMessage("Arabic name required")
   .custom(async (value) => {
      const exists = await Category.findOne({ name_ar: value });
      if (exists) {
        throw new Error("Arabic name already exists");
      }
      return true;
    })
    .isLength({ min: 2 }),

  body("en.name")
    .notEmpty().withMessage("English name required")
     .custom(async (value) => {
      const exists = await Category.findOne({ name_ar: value });
      if (exists) {
        throw new Error("Arabic name already exists");
      }
      return true;
    })
    .isLength({ min: 2 }),

  body("sizeType")
    .optional()
    .isIn(["Large", "Small"])
    .withMessage("type must be Small or Large"),

  body().custom(async (val, { req }) => {
    if (!req.file) throw new Error("Image is required");

    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(req.file.mimetype))
      throw new Error("Invalid image type");

    req.body.ar.slug = slugify(req.body.ar.name, { lower: true });
    req.body.en.slug = slugify(req.body.en.name, { lower: true });

    return true;
  }),

  validatorMiddleware,
];


export const validateUpdateCategory = [
  param("id").isMongoId().withMessage("Invalid ID"),

  body("ar.name")
    .optional()
    .isLength({ min: 2 }),

  body("en.name")
    .optional()
    .isLength({ min: 2 }),

  body("type")
    .optional()
    .isIn(["Large", "Small"]),

  body().custom(async (val, { req }) => {
    if (req.body.ar?.name)
      req.body.ar.slug = slugify(req.body.ar.name, { lower: true });

    if (req.body.en?.name)
      req.body.en.slug = slugify(req.body.en.name, { lower: true });

    return true;
  }),

  validatorMiddleware,
];
export const validateDeleteCategory = [
  param("id").isMongoId().withMessage("Invalid ID"),
  validatorMiddleware,
 ]
 export const validateGetCategory = [
    param("id").isMongoId().withMessage("Invalid ID"),
  validatorMiddleware,
 ]
import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import Brand from "../models/brand.model.js";
import slugify from "slugify";

export const validateCreateBrand = [
  body("name")
    .trim()
    .notEmpty().withMessage("Please enter brand name.")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters.")
    .isLength({ max: 50 }).withMessage("Name must be 50 characters or less.")
    .custom(async (val, { req }) => {
      val = val.replace(/\s+/g, " ").trim();

      const exists = await Brand.findOne({
        name: { $regex: `^${val}$`, $options: "i" }
      });
      if (exists) {
        throw new Error("Brand name already exists please try again with another name");
      }

      if (!req.file) {
        throw new Error("Please upload an image please try again with valid image");
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error("Only images are allowed (jpeg, png, jpg, webp) Please try again with this extensions.");
      }

      req.body.slug = slugify(val, { lower: true });
      req.body.name = val;

      return true;
    }),
  validatorMiddleware,
];

export const validateUpdateBrand = [
  param("id").isMongoId().withMessage("Invalid Brand ID Please try again with valid ID"),

 body("name")
  .optional({ checkFalsy: true })
  .customSanitizer(val => val ? val.replace(/\s+/g, " ").trim() : undefined)
  .isLength({ min: 3 }).withMessage("Name must be at least 3 characters")
  .isLength({ max: 50 }).withMessage("Name must be less than 50 characters")
  .custom(async (val, { req }) => {
    if (val) {
      const exists = await Brand.findOne({
        name: { $regex: `^${val}$`, $options: "i" },
        _id: { $ne: req.params.id }
      });

      if (exists) {
        throw new Error("Another brand with this name already exists.");
      }

      req.body.slug = slugify(val, { lower: true });
      req.body.name = val;
    }

    if (req.file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error("Only images are allowed (jpeg, png, jpg, webp).");
      }
    }

    return true;
  })

];

export const validateDeleteBrand = [
  param("id").isMongoId().withMessage("Invalid Brand ID Please try again with valid ID"),
  validatorMiddleware,
];

export const validateGetBrand = [
  param("id").isMongoId().withMessage("Invalid Brand ID Please try again with valid ID"),
  validatorMiddleware,
];

import { body , param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import Category from "../models/category.model.js";
import slugify from "slugify";
export const validateCreateCategory = [
  body("name")
    .trim()
    .notEmpty().withMessage("Please enter a category name")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters")
    .isLength({ max: 50 }).withMessage("Name must be less than 50 characters")
    .custom(async (val, { req }) => {
      const exists = await Category.findOne({
        name: { $regex: `^${val}$`, $options: "i" }
      });
      if (exists) {
        throw new Error("Category name already exists Please try again with another name");
      }

      if (!req.file) {
        throw new Error("Image is required Please try again with image");
      }
      
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error("Only images are allowed (jpeg, png, jpg, webp) Please try again with this extensions.");
      }

      req.body.slug = slugify(val, { lower: true });
      return true;
    }),
  validatorMiddleware,
];


export const validateUpdateCategory = [
  param("id").isMongoId().withMessage("Invalid Category ID Please try again with valid ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters")
    .isLength({ max: 50 }).withMessage("Name must be less than 50 characters")
    .custom(async (val, { req }) => {
      if (val) {
        const exists = await Category.findOne({
          name: { $regex: `^${val}$`, $options: "i" },
          _id: { $ne: req.params.id }
        });
        if (exists) {
          throw new Error("Another category with this name already exists Please try again with another name");
        }
        req.body.slug = slugify(val, { lower: true });
      }

      if (req.file) {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new Error("Only images are allowed (jpeg, png, jpg, webp) Please try again with this extensions.");
        }
      }

      return true;
    }),

  validatorMiddleware,
];


export const validateDeleteCategory = [
    param("id").isMongoId().withMessage("Invalid Category ID Please try again with valid ID"),
    validatorMiddleware,
];

export const validateGetCategory = [
    param("id").isMongoId().withMessage("Invalid Category ID Please try again with valid ID"),
    validatorMiddleware,
];

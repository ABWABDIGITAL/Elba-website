import { body , param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import Catalog from "../models/catalog.model.js";
import slugify from "slugify";

export const validateCreateCatalog = [
  body("name")
    .trim()
    .notEmpty().withMessage("Catalog name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters")
    .custom(async (name, { req }) => {
      const cleanName = name.replace(/\s+/g, " ").trim();

      const exists = await Catalog.findOne({
        name: { $regex: `^${cleanName}$`, $options: "i" }
      });
      if (exists) throw new Error("Catalog name already exists");

      req.body.cleanedName = cleanName;

      return true;
    }),

  validatorMiddleware,
];


export const validateUpdateCatalog = [
  param("id").isMongoId().withMessage("Invalid Catalog ID"),

  body("name")
    .optional({ checkFalsy: true })
    .custom(async (name, { req }) => {
      const cleanName = name.replace(/\s+/g, " ").trim();

      const exists = await Catalog.findOne({
        name: { $regex: `^${cleanName}$`, $options: "i" },
        _id: { $ne: req.params.id }
      });

      if (exists) throw new Error("Another catalog with this name already exists.");

      req.body.cleanedName = cleanName;
      return true;
    }),

  validatorMiddleware,
];


export const validateDeleteCatalog = [
  param("id").isMongoId().withMessage("Invalid Catalog ID"),
  validatorMiddleware,
];

export const validateGetCatalog = [
  param("id").isMongoId().withMessage("Invalid Catalog ID"),
  validatorMiddleware,
];

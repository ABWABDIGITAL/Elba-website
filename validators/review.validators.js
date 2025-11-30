import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";


export const validateCreateReview = [
  body("product")
    .notEmpty().withMessage("Product ID is required , Please provide the product ID")
    .isMongoId().withMessage("Invalid product ID"),

  body("rating")
    .notEmpty().withMessage("Rating is required")
    .isFloat({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),

  body("title")
    .optional()
    .isString().withMessage("Title must be a string")
    .isLength({ max: 255 }).withMessage("Title must be less than 255 characters"),

  body("comment")
    .optional()
    .isString().withMessage("Comment must be a string")
    .isLength({ max: 1000 }).withMessage("Comment must be less than 1000 characters"),

  validatorMiddleware,
];


export const validateUpdateReview = [
  param("id").isMongoId().withMessage("Invalid review ID"),

  body("rating")
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),

  body("title")
    .optional()
    .isString().withMessage("Title must be a string")
    .isLength({ max: 255 }).withMessage("Title must be less than 255 characters"),

  body("comment")
    .optional()
    .isString().withMessage("Comment must be a string")
    .isLength({ max: 1000 }).withMessage("Comment must be less than 1000 characters"),

  validatorMiddleware,
];


export const validateDeleteReview = [
  param("id").isMongoId().withMessage("Invalid review ID"),
  validatorMiddleware,
];

export const validateGetReview = [
  param("id").isMongoId().withMessage("Invalid review ID"),
  validatorMiddleware,
];

export const validateGetReviews = [
  query("product")
    .optional()
    .isMongoId().withMessage("Invalid product ID"),

  query("rating_gte")
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage("rating_gte must be between 0 and 5"),

  query("rating_lte")
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage("rating_lte must be between 0 and 5"),

  validatorMiddleware,
];

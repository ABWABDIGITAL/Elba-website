import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";


// --------------------------------------------------
// CREATE REVIEW
// --------------------------------------------------
export const validateCreateReview = [
  body("product")
    .notEmpty().withMessage("Product slug is required")
    .matches(/^[a-zA-Z0-9-]+$/).withMessage("Invalid product slug"),

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


// --------------------------------------------------
// UPDATE REVIEW
// --------------------------------------------------
export const validateUpdateReview = [
  param("id").isMongoId().withMessage("Invalid review ID"),

  body("rating")
    .optional()
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


// --------------------------------------------------
// DELETE REVIEW
// --------------------------------------------------
export const validateDeleteReview = [
  param("id").isMongoId().withMessage("Invalid review ID"),
  validatorMiddleware,
];


// --------------------------------------------------
// GET REVIEW (by product slug)
// --------------------------------------------------
export const validateGetReview = [
  param("slug")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Invalid product slug"),
  validatorMiddleware,
];


// --------------------------------------------------
// GET REVIEWS (filters)
// --------------------------------------------------
export const validateGetReviews = [
  query("product")
    .optional()
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Invalid product slug"),

  query("rating_gte")
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage("rating_gte must be between 0 and 5"),

  query("rating_lte")
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage("rating_lte must be between 0 and 5"),

  validatorMiddleware,
];

import { body, param } from "express-validator";

export const addToCartValidator = [
  body("product").isMongoId().withMessage("Invalid product ID"),
  body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("color").optional().isString().withMessage("Color must be a string"),
];

export const updateCartItemValidator = [
  body("product").isMongoId().withMessage("Invalid product ID"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

export const removeCartItemValidator = [
  param("productId").isMongoId().withMessage("Invalid product ID"),
];

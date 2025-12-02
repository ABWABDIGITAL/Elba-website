import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const validateCreateContact = [

  body("companyName")
    .notEmpty().withMessage("Company name is required")
    .isLength({ min: 3, max: 50 }).withMessage("Company name must be between 3 and 50 characters"),

  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),

  body("phone")
    .notEmpty().withMessage("Phone number is required")
    .isString().withMessage("Phone must be text")
    .isLength({ min: 8, max: 20 }).withMessage("Phone number must be between 8 and 20 characters"),

  body("message")
    .notEmpty().withMessage("Message content is required")
    .isLength({ min: 3, max: 500 }).withMessage("Message must be between 3 and 500 characters"),

  validatorMiddleware,
];

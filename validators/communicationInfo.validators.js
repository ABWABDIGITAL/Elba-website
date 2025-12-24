import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const validateCreateCommunicationInfo = [

  body("firstName")
    .notEmpty().withMessage("First name is required")
    .isLength({ min: 3, max: 50 }),

  body("secondName")
    .notEmpty().withMessage("Second name is required")
    .isLength({ min: 3, max: 50 }),

  body("region")
    .notEmpty().withMessage("Region is required")
    .isString().withMessage("Region must be a string"),

  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),

  body("phone")
    .notEmpty().withMessage("Phone number is required")
    .isLength({ min: 8, max: 20 }),

  validatorMiddleware,
];

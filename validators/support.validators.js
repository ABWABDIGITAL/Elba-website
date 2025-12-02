import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import {SUPPORT_TYPES} from "../models/support.model.js"
export const validateCreateSupport = [
  body("companyName")
    .notEmpty().withMessage("Company name is required")
    .isString().isLength({ min: 3, max: 50 }),

  body("email")
    .notEmpty().isEmail().withMessage("Valid email is required"),

  body("phone")
    .notEmpty()
    .isString().isLength({ min: 8, max: 20 }),

  body("supportType")
    .notEmpty().withMessage("Support type is required")
    .isString()
    .isIn(SUPPORT_TYPES)
    .withMessage("Invalid support type"),

  body("fixDate")
    .optional()
    .isISO8601().withMessage("Invalid date format"),

  body("description")
    .notEmpty()
    .isString().isLength({ min: 5, max: 2000 }),

  validatorMiddleware,
];
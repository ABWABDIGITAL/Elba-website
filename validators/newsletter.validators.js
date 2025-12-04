import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

/* --------------------------------------------------
   SUBSCRIBE VALIDATOR
--------------------------------------------------- */
export const validateSubscribe = [
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phone")
    .optional()
    .isMobilePhone().withMessage("Please provide a valid phone number"),

  body("name")
    .optional()
    .isString().withMessage("Name must be a string")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters")
    .trim(),

  body("preferences.receiveEmail")
    .optional()
    .isBoolean().withMessage("receiveEmail must be a boolean"),

  body("preferences.receiveWhatsApp")
    .optional()
    .isBoolean().withMessage("receiveWhatsApp must be a boolean"),

  body("preferences.language")
    .optional()
    .isIn(["en", "ar"]).withMessage("Language must be either 'en' or 'ar'"),

  body("source")
    .optional()
    .isIn(["website", "mobile_app", "admin", "landing_page"])
    .withMessage("Invalid source"),

  validatorMiddleware,
];

/* --------------------------------------------------
   UNSUBSCRIBE VALIDATOR
--------------------------------------------------- */
export const validateUnsubscribe = [
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  validatorMiddleware,
];

/* --------------------------------------------------
   UPDATE PREFERENCES VALIDATOR
--------------------------------------------------- */
export const validateUpdatePreferences = [
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("preferences")
    .notEmpty().withMessage("Preferences object is required")
    .isObject().withMessage("Preferences must be an object"),

  body("preferences.receiveEmail")
    .optional()
    .isBoolean().withMessage("receiveEmail must be a boolean"),

  body("preferences.receiveWhatsApp")
    .optional()
    .isBoolean().withMessage("receiveWhatsApp must be a boolean"),

  body("preferences.language")
    .optional()
    .isIn(["en", "ar"]).withMessage("Language must be either 'en' or 'ar'"),

  validatorMiddleware,
];

/* --------------------------------------------------
   DELETE SUBSCRIBER VALIDATOR
--------------------------------------------------- */
export const validateDeleteSubscriber = [
  param("id")
    .notEmpty().withMessage("Subscriber ID is required")
    .isMongoId().withMessage("Invalid subscriber ID"),

  validatorMiddleware,
];

/* --------------------------------------------------
   GET SUBSCRIBERS VALIDATOR
--------------------------------------------------- */
export const validateGetSubscribers = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),

  query("isActive")
    .optional()
    .isIn(["true", "false"]).withMessage("isActive must be 'true' or 'false'"),

  validatorMiddleware,
];

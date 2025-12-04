import { body, param } from "express-validator";
import Role from "../models/role.model.js";

// Shared validation handler
const validateRequest = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

// Saudi cities enum
const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Dammam", "Khobar", "Medina",
  "Makkah", "Qassim", "Tabuk", "Abha", "Jazan",
  "Hail", "Najran"
];

// ----------------------------------------------------------
// UPDATE PROFILE VALIDATOR
// ----------------------------------------------------------
export const validateUpdateProfile = [
  // First name
  body("firstName")
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("First name must be between 3 and 50 characters"),

  // Second name
  body("secondName")
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Second name must be between 3 and 50 characters"),

  // Profile name
  body("profileName")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Profile name must be between 3 and 50 characters"),

  // Email
  body("email")
    .notEmpty()
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),

  // Phone
  body("phone")
    .notEmpty()
    .trim()
    .isMobilePhone("ar-SA")
    .withMessage("Invalid Saudi phone number"),

  // Address object
  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),

  // Address.city
  body("address.city")
    .optional()
    .isIn(SAUDI_CITIES)
    .withMessage("Invalid city"),

  // Region
  body("address.region")
    .optional()
    .trim()
    .isString()
    .withMessage("Region must be a string"),

  // Street
  body("address.streetAddress")
    .optional()
    .trim()
    .isString()
    .withMessage("Street address must be a string"),

  // Floor
  body("address.floorAddress")
    .optional()
    .trim()
    .isString()
    .withMessage("Floor must be a string"),

  // Unit number
  body("address.unitNumber")
    .optional()
    .trim()
    .isString()
    .withMessage("Unit number must be a string"),

  // ZIP
  body("address.ZIP")
    .optional()
    .isInt({ min: 1000, max: 99999 })
    .withMessage("ZIP code must be between 1000 and 99999"),

  // Note
  body("address.note")
    .optional()
    .trim()
    .isString()
    .withMessage("Note must be a string"),

  // Company name
  body("address.companyName")
    .optional()
    .trim()
    .isString()
    .withMessage("Company name must be a string"),

  validateRequest,
];

// ----------------------------------------------------------
// ADMIN UPDATE USER VALIDATOR (with role support)
// ----------------------------------------------------------
export const validateAdminUpdateUser = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),

  body("phone")
    .optional()
    .trim()
    .matches(/^((\+9665\d{8})|(05\d{8}))$/)
    .withMessage("Invalid Saudi phone number"),

  body("role")
    .optional()
    .isString()
    .withMessage("Role must be a string")
    .custom(async (roleName) => {
      const role = await Role.findOne({ name: roleName });
      if (!role) throw new Error("Invalid role name");
      if (!role.isActive) throw new Error("Role is not active");
      return true;
    }),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  validateRequest,
];

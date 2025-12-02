import { body, param } from "express-validator";
import { validationResult } from "express-validator";

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      errors: errors.array(),
    });
  }
  next();
};

const allowedCities = [
  "Riyadh", "Jeddah", "Dammam", "Khobar", "Medina", "Makkah",
  "Qassim", "Tabuk", "Abha", "Jazan", "Hail", "Najran"
];

// Create
export const validateCreateAddress = [
  body("city").notEmpty().isIn(allowedCities).withMessage("Invalid city"),

  body("region").notEmpty().withMessage("Region is required"),

  body("street").notEmpty().withMessage("Street is required"),

  body("unitNumber").notEmpty().withMessage("Unit number is required"),

  body("postalCode")
    .matches(/^[0-9]{5}$/)
    .withMessage("Postal code must be 5 digits"),

  body("note").optional(),

  body("isDefault").optional().isBoolean(),

  validateRequest,
];

// Update
export const validateUpdateAddress = [
  param("id").isMongoId().withMessage("Invalid address ID"),

  body("city").optional().isIn(allowedCities),
  body("region").optional(),
  body("street").optional(),
  body("unitNumber").optional(),
  body("postalCode").optional().matches(/^[0-9]{5}$/),
  body("note").optional(),
  body("isDefault").optional().isBoolean(),

  validateRequest,
];

// Validate ID only
export const validateAddressId = [
  param("id").isMongoId().withMessage("Invalid address ID"),
  validateRequest,
];

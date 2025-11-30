import { body } from "express-validator";
export const createBranchValidator = [
  body("name_ar").notEmpty().withMessage("Arabic name is required"),
  body("name_en").notEmpty().withMessage("English name is required"),
  body("region").notEmpty().withMessage("Region is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("address").notEmpty().withMessage("Address is required"),

  body("phones")
    .optional()
    .isArray()
    .withMessage("Phones must be an array"),

  body("location.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be [lng, lat]"),

  body("location.coordinates.*")
    .isFloat()
    .withMessage("Each coordinate must be a number"),

  body("workingHours").notEmpty().withMessage("Working hours required"),

  body("workingHours.*.open")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Open time must be HH:MM"),

  body("workingHours.*.close")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Close time must be HH:MM"),
];

export const updateBranchValidator = [
  body("name_ar").optional().notEmpty(),
  body("name_en").optional().notEmpty(),
  body("region").optional().notEmpty(),
  body("city").optional().notEmpty(),
  body("address").optional().notEmpty(),
];

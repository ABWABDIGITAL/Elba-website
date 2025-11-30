import { body, param, query } from "express-validator";

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

export const validateCreateRole = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Role name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Role name must be between 3 and 50 characters")
    .matches(/^[a-z_]+$/)
    .withMessage("Role name must be lowercase with underscores only"),

  body("displayName.en")
    .trim()
    .notEmpty()
    .withMessage("English display name is required"),

  body("displayName.ar")
    .trim()
    .notEmpty()
    .withMessage("Arabic display name is required"),

  body("description.en").optional().trim(),

  body("description.ar").optional().trim(),

  body("permissions")
    .isArray({ min: 1 })
    .withMessage("At least one permission is required"),

  body("permissions.*.resource")
    .isIn([
      "users",
      "products",
      "categories",
      "brands",
      "orders",
      "reviews",
      "coupons",
      "catalogs",
      "home",
      "branches",
      "cart",
      "analytics",
      "roles",
      "settings",
    ])
    .withMessage("Invalid resource type"),

  body("permissions.*.actions.create").optional().isBoolean(),
  body("permissions.*.actions.read").optional().isBoolean(),
  body("permissions.*.actions.update").optional().isBoolean(),
  body("permissions.*.actions.delete").optional().isBoolean(),
  body("permissions.*.actions.export").optional().isBoolean(),
  body("permissions.*.actions.import").optional().isBoolean(),

  body("priority")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Priority must be between 0 and 100"),

  body("isActive").optional().isBoolean(),

  validateRequest,
];

export const validateUpdateRole = [
  param("id").isMongoId().withMessage("Invalid role ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Role name must be between 3 and 50 characters")
    .matches(/^[a-z_]+$/)
    .withMessage("Role name must be lowercase with underscores only"),

  body("displayName.en").optional().trim().notEmpty(),

  body("displayName.ar").optional().trim().notEmpty(),

  body("description.en").optional().trim(),

  body("description.ar").optional().trim(),

  body("permissions").optional().isArray(),

  body("permissions.*.resource")
    .optional()
    .isIn([
      "users",
      "products",
      "categories",
      "brands",
      "orders",
      "reviews",
      "coupons",
      "catalogs",
      "home",
      "branches",
      "cart",
      "analytics",
      "roles",
      "settings",
    ]),

  body("priority").optional().isInt({ min: 0, max: 100 }),

  body("isActive").optional().isBoolean(),

  validateRequest,
];

export const validateRoleId = [
  param("id").isMongoId().withMessage("Invalid role ID"),
  validateRequest,
];

export const validateAssignRole = [
  body("userId").isMongoId().withMessage("Invalid user ID"),
  body("roleId").isMongoId().withMessage("Invalid role ID"),
  validateRequest,
];

export const validateCloneRole = [
  param("id").isMongoId().withMessage("Invalid role ID"),
  body("newRoleName")
    .trim()
    .notEmpty()
    .withMessage("New role name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Role name must be between 3 and 50 characters")
    .matches(/^[a-z_]+$/)
    .withMessage("Role name must be lowercase with underscores only"),
  validateRequest,
];

export const validateGetRoleUsers = [
  param("id").isMongoId().withMessage("Invalid role ID"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be at least 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  validateRequest,
];

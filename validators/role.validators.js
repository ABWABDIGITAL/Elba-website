import { body, param, query } from "express-validator";
import { validationResult } from "express-validator";

const validateRequest = (req, res, next) => {
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

// Helper to validate permission actions
const validatePermissionActions = () => {
  return [
    body("permissions.*.actions")
      .optional()
      .isObject()
      .withMessage("Actions must be an object"),
    
    body("permissions.*.actions.create")
      .optional()
      .isBoolean()
      .withMessage("Create action must be boolean"),
    
    body("permissions.*.actions.read")
      .optional()
      .isBoolean()
      .withMessage("Read action must be boolean"),
    
    body("permissions.*.actions.update")
      .optional()
      .isBoolean()
      .withMessage("Update action must be boolean"),
    
    body("permissions.*.actions.delete")
      .optional()
      .isBoolean()
      .withMessage("Delete action must be boolean"),
    
    body("permissions.*.actions.export")
      .optional()
      .isBoolean()
      .withMessage("Export action must be boolean"),
    
    body("permissions.*.actions.import")
      .optional()
      .isBoolean()
      .withMessage("Import action must be boolean"),
  ];
};

// Custom validator to ensure at least one action is true
const atLeastOneAction = () => {
  return body("permissions").custom((permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error("At least one permission is required");
    }
    
    for (const permission of permissions) {
      if (!permission.actions || typeof permission.actions !== "object") {
        throw new Error("Each permission must have actions object");
      }
      
      const hasAnyAction = Object.values(permission.actions).some(val => val === true);
      if (!hasAnyAction) {
        throw new Error(`Permission for resource ${permission.resource} must have at least one action enabled`);
      }
    }
    
    return true;
  });
};

/* ============================================================
   CREATE ROLE VALIDATION
============================================================ */
export const validateCreateRole = [
  body("name")
    .trim()
    .notEmpty().withMessage("Role name is required")
    .isLength({ min: 3, max: 50 }).withMessage("Role name must be between 3 and 50 characters")
    .matches(/^[a-z_]+$/).withMessage("Role name must be lowercase with underscores only"),

  body("displayName.en")
    .trim()
    .notEmpty().withMessage("English display name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Display name must be between 2 and 100 characters"),

  body("displayName.ar")
    .trim()
    .notEmpty().withMessage("Arabic display name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Display name must be between 2 and 100 characters"),

  body("description.en").optional().trim().isLength({ max: 500 }).withMessage("Description too long"),
  body("description.ar").optional().trim().isLength({ max: 500 }).withMessage("Description too long"),

  body("permissions")
    .isArray({ min: 1 })
    .withMessage("At least one permission is required"),

  body("permissions.*.resource")
    .isIn([
      "users", "products", "categories", "brands", "orders",
      "reviews", "coupons", "catalogs", "home", "branches",
      "cart", "analytics", "roles", "settings"
    ])
    .withMessage("Invalid resource type"),

  // Validate permission actions
  ...validatePermissionActions(),
  
  // Ensure at least one action is enabled per permission
  atLeastOneAction(),

  body("priority")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Priority must be between 0 and 100"),

  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either 'active' or 'inactive'"),

  // Custom validator to ensure unique resources within permissions
  body("permissions").custom((permissions) => {
    const resources = permissions.map(p => p.resource);
    const uniqueResources = [...new Set(resources)];
    if (resources.length !== uniqueResources.length) {
      throw new Error("Duplicate resources found in permissions");
    }
    return true;
  }),

  validateRequest,
];

/* ============================================================
   UPDATE ROLE VALIDATION
============================================================ */
export const validateUpdateRole = [
  param("id").isMongoId().withMessage("Invalid role ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Role name must be between 3 and 50 characters")
    .matches(/^[a-z_]+$/)
    .withMessage("Role name must be lowercase with underscores only"),

  body("displayName.en")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("English display name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Display name must be between 2 and 100 characters"),
    
  body("displayName.ar")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Arabic display name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Display name must be between 2 and 100 characters"),

  body("description.en").optional().trim().isLength({ max: 500 }),
  body("description.ar").optional().trim().isLength({ max: 500 }),

  body("permissions").optional().isArray(),

  body("permissions.*.resource")
    .optional()
    .isIn([
      "users", "products", "categories", "brands", "orders",
      "reviews", "coupons", "catalogs", "home", "branches",
      "cart", "analytics", "roles", "settings"
    ]),

  ...validatePermissionActions(),

  body("priority").optional().isInt({ min: 0, max: 100 }),

  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either 'active' or 'inactive'"),

  // Custom validator for unique resources if permissions are being updated
  body("permissions").optional().custom((permissions) => {
    if (!permissions) return true;
    const resources = permissions.map(p => p.resource);
    const uniqueResources = [...new Set(resources)];
    if (resources.length !== uniqueResources.length) {
      throw new Error("Duplicate resources found in permissions");
    }
    return true;
  }),

  validateRequest,
];

/* ============================================================
   ROLE ID VALIDATION
============================================================ */
export const validateRoleId = [
  param("id").isMongoId().withMessage("Invalid role ID"),
  validateRequest,
];

/* ============================================================
   ASSIGN ROLE VALIDATION
============================================================ */
export const validateAssignRole = [
  body("userId").isMongoId().withMessage("Invalid user ID"),
  body("roleId").isMongoId().withMessage("Invalid role ID"),
  validateRequest,
];

/* ============================================================
   CLONE ROLE VALIDATION
============================================================ */
export const validateCloneRole = [
  param("id").isMongoId().withMessage("Invalid role ID"),
  body("newRoleName")
    .trim()
    .notEmpty().withMessage("New role name is required")
    .isLength({ min: 3, max: 50 }).withMessage("Role name must be between 3 and 50 characters")
    .matches(/^[a-z_]+$/).withMessage("Role name must be lowercase with underscores only"),
  validateRequest,
];

/* ============================================================
   GET ROLE USERS VALIDATION
============================================================ */
export const validateGetRoleUsers = [
  param("id").isMongoId().withMessage("Invalid role ID"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  validateRequest,
];
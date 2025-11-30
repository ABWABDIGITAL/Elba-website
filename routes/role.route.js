import express from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignRoleToUser,
  getRoleUsers,
  cloneRole,
} from "../controllers/role.controller.js";
import {
  validateCreateRole,
  validateUpdateRole,
  validateRoleId,
  validateAssignRole,
  validateCloneRole,
  validateGetRoleUsers,
} from "../validators/role.validators.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission, isSuperAdmin } from "../middlewares/permission.middleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";

const router = express.Router();

// All role routes require authentication
router.use(protect);

// Create a new role (SuperAdmin or user with roles:create permission)
router.post(
  "/",
  requirePermission("roles", "create"),
  upload({ folder: "roles" }).none(),
  parseNestedJson,
  validateCreateRole,
  createRole
);

// Get all roles (any authenticated user can view roles)
router.get("/", getAllRoles);

// Get specific role by ID
router.get("/:id", validateRoleId, getRoleById);

// Update role
router.put(
  "/:id",
  requirePermission("roles", "update"),
  upload({ folder: "roles" }).none(),
  parseNestedJson,
  validateUpdateRole,
  updateRole
);

// Delete role
router.delete(
  "/:id",
  requirePermission("roles", "delete"),
  validateRoleId,
  deleteRole
);

// Assign role to user
router.post(
  "/assign",
  requirePermission("roles", "update"),
  upload({ folder: "roles" }).none(),
  parseNestedJson,
  validateAssignRole,
  assignRoleToUser
);

// Get users with specific role
router.get(
  "/:id/users",
  requirePermission("roles", "read"),
  validateGetRoleUsers,
  getRoleUsers
);

// Clone a role
router.post(
  "/:id/clone",
  requirePermission("roles", "create"),
  upload({ folder: "roles" }).none(),
  parseNestedJson,
  validateCloneRole,
  cloneRole
);

export default router;

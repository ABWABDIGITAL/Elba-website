import express from "express";
import {
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser,
  adminActivateUser,
  adminLockUser,
  adminUnlockUser,
  adminBulkAction,
  getUserStatistics,
} from "../controllers/user.controller.js";

import { protect, allowTo } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all users (requires users:read permission)
router.get("/", requirePermission("users", "read"), adminGetAllUsers);

// Get user by ID (requires users:read permission)
router.get("/:id", requirePermission("users", "read"), adminGetUserById);

// Get user statistics (requires users:read permission)
router.get("/:id/statistics", requirePermission("users", "read"), getUserStatistics);

// Update user (requires users:update permission)
router.put("/:id", requirePermission("users", "update"), adminUpdateUser);

// Deactivate user (requires users:delete permission)
router.delete("/:id", requirePermission("users", "delete"), adminDeleteUser);

// Activate user (requires users:update permission)
router.patch("/:id/activate", requirePermission("users", "update"), adminActivateUser);

// Lock user account (requires users:update permission)
router.patch("/:id/lock", requirePermission("users", "update"), adminLockUser);

// Unlock user account (requires users:update permission)
router.patch("/:id/unlock", requirePermission("users", "update"), adminUnlockUser);

// Bulk actions on users (requires users:update permission)
router.post("/bulk-action", requirePermission("users", "update"), adminBulkAction);

export default router;

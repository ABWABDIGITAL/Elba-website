import { StatusCodes } from "http-status-codes";
import Role from "../models/role.model.js";

export const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // SuperAdmin bypass (legacy role)
      if (req.user.legacyRole === "superAdmin") {
        return next();
      }

      // Check if user has a role assigned
      if (!req.user.role) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "No role assigned to user",
        });
      }

      // Populate role if not already populated
      let userRole;
      if (typeof req.user.role === "string" || req.user.role instanceof String) {
        userRole = await Role.findById(req.user.role);
      } else {
        userRole = req.user.role;
      }

      if (!userRole) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "Invalid role",
        });
      }

      if (userRole.status !== "active") {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "Role is inactive",
        });
      }

      // Check permission
      if (!userRole.hasPermission(resource, action)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: `You don't have permission to ${action} ${resource}`,
        });
      }

      // Attach role to request for further use
      req.userRole = userRole;
      next();
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "error",
        message: "Error checking permissions",
        error: error.message,
      });
    }
  };
};

export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // SuperAdmin bypass
      if (req.user.legacyRole === "superAdmin") {
        return next();
      }

      if (!req.user.role) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "No role assigned to user",
        });
      }

      let userRole;
      if (typeof req.user.role === "string" || req.user.role instanceof String) {
        userRole = await Role.findById(req.user.role);
      } else {
        userRole = req.user.role;
      }

      if (!userRole || userRole.status !== "active") {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "Invalid or inactive role",
        });
      }

      // Check if user has any of the required permissions
      const hasPermission = permissions.some((perm) =>
        userRole.hasPermission(perm.resource, perm.action)
      );

      if (!hasPermission) {
      return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: `Access denied. Required any of: ${permissions.map(p => `${p.resource}:${p.action}`).join(", ")}`,
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "error",
        message: "Error checking permissions",
        error: error.message,
      });
    }
  };
};

export const requireAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: "error",
          message: "Authentication required",
        });
      }

      if (req.user.legacyRole === "superAdmin") {
        return next();
      }

      if (!req.user.role) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "No role assigned to user",
        });
      }

      let userRole;
      if (typeof req.user.role === "string" || req.user.role instanceof String) {
        userRole = await Role.findById(req.user.role);
      } else {
        userRole = req.user.role;
      }

      if (!userRole || userRole.status !== "active") {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: "Invalid or inactive role",
        });
      }

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every((perm) =>
        userRole.hasPermission(perm.resource, perm.action)
      );

      if (!hasAllPermissions) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: "error",
          message: `Access denied. Required all of: ${permissions.map(p => `${p.resource}:${p.action}`).join(", ")}`,
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: "error",
        message: "Error checking permissions",
        error: error.message,
      });
    }
  };
};

export const isSuperAdmin = (req, res, next) => {
  if (req.user?.legacyRole === "superAdmin") {
    return next();
  }

  return res.status(StatusCodes.FORBIDDEN).json({
    status: "error",
    message: "SuperAdmin access required",
  });
};

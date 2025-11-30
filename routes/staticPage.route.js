import express from "express";
import {
  getPageByType,
  getAllPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
} from "../controllers/staticPage.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";

const router = express.Router();

// PUBLIC ROUTES
// Get all pages
router.get("/", getAllPages);

// Get page by type (e.g., /pages/privacy_policy)
router.get("/:pageType", getPageByType);

// ADMIN ROUTES
// Create page
router.post(
  "/admin/create",
  protect,
  requirePermission("home", "create"),
  upload({ folder: "pages" }).none(),
  parseNestedJson,
  createPage
);

// Get page by ID (admin)
router.get(
  "/admin/:pageId",
  protect,
  requirePermission("home", "read"),
  getPageById
);

// Update page
router.put(
  "/admin/:pageId",
  protect,
  requirePermission("home", "update"),
  upload({ folder: "pages" }).none(),
  parseNestedJson,
  updatePage
);

// Delete page
router.delete(
  "/admin/:pageId",
  protect,
  requirePermission("home", "delete"),
  deletePage
);

export default router;

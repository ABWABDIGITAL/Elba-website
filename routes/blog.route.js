import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  updateBlog,
  deleteBlog,
  getFeaturedBlogs,
  getTrendingBlogs,
  getRecentBlogs,
  getBlogsByCategory,
  getBlogCategories,
  incrementLikes,
  incrementShares,
} from "../controllers/blog.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";

const router = express.Router();

// PUBLIC ROUTES
// Get all blogs with filters
router.get("/", getAllBlogs);

// Get featured blogs
router.get("/featured", getFeaturedBlogs);

// Get trending blogs
router.get("/trending", getTrendingBlogs);

// Get recent blogs
router.get("/recent", getRecentBlogs);

// Get blog categories
router.get("/categories", getBlogCategories);

// Get blogs by category
router.get("/category/:category", getBlogsByCategory);

// Get blog by slug (public)
router.get("/slug/:slug", getBlogBySlug);

// Increment likes (public)
router.post("/:blogId/like", incrementLikes);

// Increment shares (public)
router.post("/:blogId/share", incrementShares);

// ADMIN ROUTES
// Create blog
router.post(
  "/",
  protect,
  requirePermission("home", "create"),
  upload({ folder: "blogs" }).single("featuredImage"),
  parseNestedJson,
  createBlog
);

// Get blog by ID (admin)
router.get(
  "/:blogId/admin",
  protect,
  requirePermission("home", "read"),
  getBlogById
);

// Update blog
router.put(
  "/:blogId",
  protect,
  requirePermission("home", "update"),
  upload({ folder: "blogs" }).single("featuredImage"),
  parseNestedJson,
  updateBlog
);

// Delete blog
router.delete(
  "/:blogId",
  protect,
  requirePermission("home", "delete"),
  deleteBlog
);

export default router;

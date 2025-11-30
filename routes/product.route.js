import express from "express";
import {
  createProductController,
  updateProductController,
  deleteProductController,
  getAllProductsController,
  getProductBySkuController,
  getCompareProductsController,
  getBestSellingByCategoryController,
  getBestOffersController,
  getProductsByCatalogController,
  getProductsByTag,
  getProductsByTags,
  getAvailableTags,
  bulkUpdateProductTags,
} from "../controllers/product.controller.js";
import {
  runTagAutomation,
  cleanupExpiredTags,
  getTagAutomationRules,
  updateTagAutomationRule,
  previewTagAssignment,
} from "../controllers/tagAutomation.controller.js";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";

// import parseNestedJson from "../middlewares/ParseNestedDot.js";

import {
  validateCreateProduct,
  validateUpdateProduct,
} from "../validators/product.validators.js";

const router = express.Router();

// Add express.json() middleware to parse JSON bodies
router.use(express.json());

// CREATE PRODUCT
router.post(
  "/",
  (req, res, next) => {
    // Log the raw body for debugging
    console.log('Raw body:', req.body);
    next();
  },
  validateCreateProduct,
  createProductController
);
/* ---------------------------------------------
   UPDATE PRODUCT
---------------------------------------------- */
router.patch(
  "/:productId",
  validateUpdateProduct,
  updateProductController
);

router.get("/",protect, getAllProductsController);
// by SKU
router.get("/sku/:sku",protect, getProductBySkuController);

// compare by SKU
router.get("/compare", protect,getCompareProductsController);

// best selling by category
router.get(
  "/category/:categoryId/best-selling",
  protect,
  getBestSellingByCategoryController
);


// best offers
router.get("/best-offers", protect, getBestOffersController);
router.get("/catalog/:catalogId", protect, getProductsByCatalogController);

// TAG ROUTES
// Get all available tags with counts (public)
router.get("/tags/available", getAvailableTags);

// Get products by multiple tags (public)
router.get("/tags", getProductsByTags);

// TAG AUTOMATION ROUTES (Admin only)
// Run tag automation job
router.post(
  "/tags/auto-assign",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  runTagAutomation
);

// Cleanup expired tags
router.post(
  "/tags/cleanup",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  cleanupExpiredTags
);

// Get tag automation rules
router.get(
  "/tags/rules",
  protect,
  requirePermission("products", "read"),
  getTagAutomationRules
);

// Update tag automation rule
router.put(
  "/tags/rules/:tag",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  updateTagAutomationRule
);

// Preview tag assignment for a product
router.get(
  "/:productId/tags/preview",
  protect,
  requirePermission("products", "read"),
  previewTagAssignment
);

// Bulk update product tags (admin only)
router.post(
  "/tags/bulk-update",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  bulkUpdateProductTags
);

// Get products by single tag (public) - must be after /tags/available
router.get("/tag/:tag", getProductsByTag);

router.delete("/:productId", protect, deleteProductController);
export default router;

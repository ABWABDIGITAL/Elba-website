// routes/product.routes.js
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

import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import upload, { productMediaUpload } from "../middlewares/uploadMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";

import {
  validateCreateProduct,
  validateUpdateProduct,
} from "../validators/product.validators.js";

const router = express.Router();

// body parser for JSON APIs (للـ non-multipart)
router.use(express.json());

// CREATE PRODUCT
router.post(
  "/",
  productMediaUpload.fields([
    { name: "images", maxCount: 10 },
    { name: "reference", maxCount: 1 },
  ]),
  validateCreateProduct,
  createProductController
);

/* ---------------------------------------------
   UPDATE PRODUCT
---------------------------------------------- */
router.patch(
  "/:productId",
  productMediaUpload.fields([
    { name: "images", maxCount: 10 },
    { name: "reference", maxCount: 1 },
  ]),
  validateUpdateProduct,
  updateProductController
);

// LIST ALL
router.get("/", protect, getAllProductsController);

// by SKU
router.get("/sku/:sku", protect, getProductBySkuController);

// compare by SKU
router.get("/compare", protect, getCompareProductsController);

// best selling by category (including tree)
router.get(
  "/category/:categoryId/best-selling",
  protect,
  getBestSellingByCategoryController
);

// best offers
router.get("/best-offers", protect, getBestOffersController);

// products by catalog
router.get("/catalog/:catalogId", protect, getProductsByCatalogController);

// TAG ROUTES
router.get("/tags/available", getAvailableTags);
router.get("/tags", getProductsByTags);

router.post(
  "/tags/auto-assign",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  runTagAutomation
);

router.post(
  "/tags/cleanup",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  cleanupExpiredTags
);

router.get(
  "/tags/rules",
  protect,
  requirePermission("products", "read"),
  getTagAutomationRules
);

router.put(
  "/tags/rules/:tag",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  updateTagAutomationRule
);

router.get(
  "/:productId/tags/preview",
  protect,
  requirePermission("products", "read"),
  previewTagAssignment
);

router.post(
  "/tags/bulk-update",
  protect,
  requirePermission("products", "update"),
  upload({ folder: "products" }).none(),
  parseNestedJson,
  bulkUpdateProductTags
);

router.get("/tag/:tag", getProductsByTag);

router.delete("/:productId", protect, deleteProductController);

export default router;

import express from "express";
import {
  createProductController,
  updateProductController,
  deleteProductController,
  getAllProductsController,
  getProductBySlugController,
  getCompareProductsController,
  getBestSellingByCategoryController,
  getBestOffersController,
  getProductsByCategoryController,
  getProductsByTag,
  getProductsByTags,
  getAvailableTags,
  bulkUpdateProductTags,
  getCategoryWithProductsController,
  uploadProductManual,
  getProductByCatalogController,
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
import upload, { productMediaUpload } from "../middlewares/uploadMiddleware.js"; // <-- productMediaUpload هنا
import parseNestedJson from "../middlewares/ParseNestedDot.js";

import {
  validateCreateProduct,
  validateUpdateProduct,
} from "../validators/product.validators.js";

const router = express.Router();

// body parser for JSON APIs
router.use(express.json());

// CREATE PRODUCT
router.post(
  "/",
  productMediaUpload.fields([
    { name: "images", maxCount: 10 },
    { name: "catalog", maxCount: 1 },
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
    { name: "catalog", maxCount: 1 },
  ]),
  validateUpdateProduct,
  updateProductController
);

router.get("/", getAllProductsController);


router.get("/catalog/:keyword", getProductByCatalogController);

router.get("/compare", getCompareProductsController);
router.get("/best-offers", getBestOffersController);

router.get("/:slug", getProductBySlugController);
router.get(
  "/category/:categoryId/best-selling",
  getBestSellingByCategoryController
);


router.get("/category/:slug", getProductsByCategoryController);

router.get("/tags/available", getAvailableTags);
router.get("/tags", getProductsByTags);
router.post(
  "/:id/manual",
  productMediaUpload.single("reference"),
  uploadProductManual
);


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

import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  validateCreateBrand,
  validateUpdateBrand,
  validateDeleteBrand,
  validateGetBrand,
} from "../validators/brand.validators.js";
import {
  createBrandController,
  getBrandsController,
  getBrandController,
  updateBrandController,
  deleteBrandController,
} from "../controllers/brand.controller.js";
import upload, { IMG_MIME, IMG_EXT } from "../middlewares/uploadMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get("/", getBrandsController);

router.get("/:id", validateGetBrand, getBrandController);

router.post(
  "/",
  protect,
  requirePermission("brands", "create"),
    upload({
    folder: "brands",
    allowedMime: IMG_MIME,
    allowedExt: IMG_EXT
  }).single("logo"),
  validateCreateBrand,               
  createBrandController
);

router.put(
  "/:id",
  protect,
  requirePermission("brands", "update"),
    upload({
    folder: "brands",
    allowedMime: IMG_MIME,
    allowedExt: IMG_EXT
  }).single("logo"),
  validateUpdateBrand,
  updateBrandController
);

router.delete(
  "/:id",
  protect,
  requirePermission("brands", "delete"),
  validateDeleteBrand,
  deleteBrandController
);

export default router;

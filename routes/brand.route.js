import express from "express";
import { allowTo, protect } from "../middlewares/authMiddleware.js";
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


const router = express.Router();

router.get("/", getBrandsController);

router.get("/:id", validateGetBrand, getBrandController);

router.post(
  "/",
  protect,
  allowTo("admin" , "superAdmin"),
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
  allowTo("admin" , "superAdmin"),
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
  allowTo("admin" , "superAdmin"),
  validateDeleteBrand,
  deleteBrandController
);

export default router;

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
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", getBrandsController);

router.get("/:id", validateGetBrand, getBrandController);

router.post(
  "/",
  protect,
  allowTo("admin"),
  upload({ folder: "brands" }).single("image"),  
  validateCreateBrand,               
  createBrandController
);

router.put(
  "/:id",
  protect,
  allowTo("admin"),
  upload({ folder: "brands" }).single("image"),  
  validateUpdateBrand,
  updateBrandController
);

router.delete(
  "/:id",
  protect,
  allowTo("admin"),
  validateDeleteBrand,
  deleteBrandController
);

export default router;

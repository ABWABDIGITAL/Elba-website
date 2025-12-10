import express from "express";
import {
  createCategoryController,
  getCategoriesController,
  getCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from "../controllers/category.controller.js";

import {
  validateCreateCategory,
  validateUpdateCategory,
  validateDeleteCategory,
  validateGetCategory,
} from "../validators/categories.validators.js";

// import { protect, allowTo } from "../middlewares/authMiddleware.js";
import upload, { IMG_MIME, IMG_EXT } from "../middlewares/uploadMiddleware.js";
import { protect , allowTo} from "../middlewares/authMiddleware.js";



const router = express.Router();

router.post(
  "/",
  protect,
  allowTo("admin","superAdmin"),
  upload({
    folder: "categories",
    allowedMime: IMG_MIME,
    allowedExt: IMG_EXT
  }).single("image"),
  validateCreateCategory,
  createCategoryController
);


router.get("/", getCategoriesController);

router.get("/:id", validateGetCategory, getCategoryController);

router.put(
  "/:id",
  protect,
  allowTo("admin","superAdmin"),
  upload({
    folder: "categories",
    allowedMime: IMG_MIME,
    allowedExt: IMG_EXT
  }).single("image"),
  validateUpdateCategory,
  updateCategoryController
);


router.delete(
  "/:id",
  protect,
  allowTo("admin","superAdmin"),
  validateDeleteCategory,
  deleteCategoryController
);

export default router;

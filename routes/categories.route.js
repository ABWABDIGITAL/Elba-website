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
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/",
//   protect,
//   allowTo("admin"),
  upload({ folder: "categories" }).single("image"),
  validateCreateCategory,
  createCategoryController
);

router.get("/", getCategoriesController);

router.get("/:id", validateGetCategory, getCategoryController);

router.put(
  "/:id",
//   protect,
//   allowTo("admin"),
  upload({ folder: "categories" }).single("image"),
  validateUpdateCategory,
  updateCategoryController
);

router.delete(
  "/:id",
//   protect,
//   allowTo("admin"),
  validateDeleteCategory,
  deleteCategoryController
);

export default router;

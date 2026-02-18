import express from "express";
import {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
} from "../controllers/tag.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import {
  validateCreateTag,
  validateUpdateTag,
} from "../validators/tag.validators.js";

const router = express.Router();

// Public routes
router.get("/", getAllTags);
router.get("/:id", getTagById);

// Protected routes (reuses products permission)
router.use(protect);

router.post(
  "/",
  requirePermission("products", "create"),
  validateCreateTag,
  createTag
);

router.patch(
  "/:id",
  requirePermission("products", "update"),
  validateUpdateTag,
  updateTag
);

router.delete(
  "/:id",
  requirePermission("products", "delete"),
  deleteTag
);

export default router;

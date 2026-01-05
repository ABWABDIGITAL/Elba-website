import express from "express";
import {
  createSettingsController,
  getAllSettingsController,
  getSettingsByIdController,
  updateSettingsController,
  deleteSettingsController
} from "../controllers/settings.controller.js";

import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import { validateSettings, validateSettingsId } from "../validators/settings.validators.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/", getAllSettingsController);
router.get("/:id", validateSettingsId, getSettingsByIdController);

// ADMIN ROUTES
router.post(
  "/",
  protect,
  requirePermission("settings", "create"),
  validateSettings,
  createSettingsController
);

router.put(
  "/:id",
  protect,
  requirePermission("settings", "update"),
  validateSettingsId,
  validateSettings,
  updateSettingsController
);

router.delete(
  "/:id",
  protect,
  requirePermission("settings", "delete"),
  validateSettingsId,
  deleteSettingsController
);

export default router;

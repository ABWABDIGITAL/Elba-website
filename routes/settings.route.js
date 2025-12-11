import express from "express";
import {
  createSettingsController,
  getAllSettingsController,
  getSettingsByIdController,
  updateSettingsController,
  deleteSettingsController
} from "../controllers/settings.controller.js";

import { protect, allowTo } from "../middlewares/authMiddleware.js";
import { validateSettings, validateSettingsId } from "../validators/settings.validators.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/", getAllSettingsController);
router.get("/:id", validateSettingsId, getSettingsByIdController);

// ADMIN ROUTES
router.post(
  "/",
  protect,
  allowTo("admin", "superAdmin"),
  validateSettings,
  createSettingsController
);

router.put(
  "/:id",
  protect,
  allowTo("admin", "superAdmin"),
  validateSettingsId,
  validateSettings,
  updateSettingsController
);

router.delete(
  "/:id",
  protect,
  allowTo("admin", "superAdmin"),
  validateSettingsId,
  deleteSettingsController
);

export default router;

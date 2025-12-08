import { validateUpdateProfile } from "../validators/auth.validators.js";
import { updateProfileController } from "../controllers/profile.controller.js";
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
const router = express.Router();
router.patch(
  "/update-profile",
  protect,
  validateUpdateProfile,
  updateProfileController
);
export default router;
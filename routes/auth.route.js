import express from "express";

import {
  validateRegister,
  validateAdminRegister,
  validateLogin,
  validateForgetPassword,
  validateVerifyReset,
  validateResetPassword,
} from "../validators/auth.validators.js";

import {
  registerController,
  adminRegisterController,
  loginController,
  logoutController,
  forgetPasswordController,
  verifyResetPasswordController,
  resetPasswordController
} from "../controllers/auth.controller.js";

import { protect, allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ------------------------------
    AUTH ROUTES
------------------------------ */

// Public registration (optional role)
router.post("/register", validateRegister, registerController);

// Admin-only registration (required role)
router.post("/admin/register", protect, allowTo("admin", "superAdmin"), validateAdminRegister, adminRegisterController);

router.post("/login", validateLogin, loginController);

router.post("/logout", logoutController);

// RESET PASSWORD ROUTES
router.post("/forget-password", validateForgetPassword, forgetPasswordController);

router.post("/verify-reset-password", validateVerifyReset, verifyResetPasswordController);

router.post("/reset-password", validateResetPassword, resetPasswordController);

export default router;

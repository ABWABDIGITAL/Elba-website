import express from "express";

import {
  validateRegister,
  validateAdminRegister,
  validateLogin,
  validateForgetPassword,
  validateVerifyReset,
  validateResetPassword,
  validateResetPasswordWithToken,
} from "../validators/auth.validators.js";

import {
  registerController,
  adminRegisterController,
  loginController,
  logoutController,
  forgetPasswordController,
  verifyResetPasswordController,
  resetPasswordController,
  verifyResetLinkController,
  resetPasswordWithTokenController
} from "../controllers/auth.controller.js";

import { protect, allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ------------------------------
    AUTH ROUTES
------------------------------ */

// User registration
router.post("/register", validateRegister, registerController);

// Admin-only registration
router.post(
  "/admin/register",
  protect,
  allowTo("admin", "superAdmin"),
  validateAdminRegister,
  adminRegisterController
);

// Login
router.post("/login", validateLogin, loginController);

// Logout
router.post("/logout", logoutController);

/* ------------------------------
    PASSWORD RESET (OTP)
------------------------------ */

// Send OTP + Reset Link
router.post("/forget-password", validateForgetPassword, forgetPasswordController);

// Verify OTP
router.post("/verify-reset-password", validateVerifyReset, verifyResetPasswordController);

// Reset using OTP
router.post("/reset-password", validateResetPassword, resetPasswordController);

/* ------------------------------
    PASSWORD RESET VIA LINK
------------------------------ */

// Verify reset link token
router.get("/reset-password/:token", verifyResetLinkController);

// Reset using link token
router.post(
  "/reset-password/:token",
  validateResetPasswordWithToken,
  resetPasswordWithTokenController
);

export default router;

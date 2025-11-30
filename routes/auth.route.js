import express from "express";

import {
  validateRegister,
  validateLogin,
  validateForgetPassword,
  validateVerifyReset,
  validateResetPassword,
} from "../validators/auth.validators.js";

import { 
  registerController,
  loginController,
  logoutController,
  forgetPasswordController,
  verifyResetPasswordController,
  resetPasswordController
} from "../controllers/auth.controller.js";

const router = express.Router();

/* ------------------------------
    AUTH ROUTES
------------------------------ */

router.post("/register", validateRegister, registerController);

router.post("/login", validateLogin, loginController);

router.post("/logout", logoutController);

// RESET PASSWORD ROUTES
router.post("/forget-password", validateForgetPassword, forgetPasswordController);

router.post("/verify-reset-password", validateVerifyReset, verifyResetPasswordController);

router.post("/reset-password", validateResetPassword, resetPasswordController);

export default router;

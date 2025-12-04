import {
  registerService,
  adminRegisterService,
  loginService,
  logoutService,
  forgetPassword,
  verifyResetPassword,
  resetPassword
} from "../services/auth.services.js";

import { StatusCodes } from "http-status-codes";

/* ==========================================================
   REGISTER CONTROLLER (FIXED)
========================================================== */
export const registerController = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      phone,
      address
    } = req.body;

    const result = await registerService({
      name,
      email,
      password,
      confirmPassword,
      role,
      phone,
      address
    });

    return res.status(StatusCodes.CREATED).json({
      status: "success",
      message: "User registered successfully",
      data: result.data,
    });

  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   ADMIN REGISTER CONTROLLER (With Required Role)
========================================================== */
export const adminRegisterController = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      phone,
      address
    } = req.body;

    const result = await adminRegisterService({
      name,
      email,
      password,
      confirmPassword,
      role,
      phone,
      address,
      adminRole: req.user.legacyRole
    });

    return res.status(StatusCodes.CREATED).json({
      status: "success",
      message: "User registered successfully by admin",
      data: result.data,
    });

  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   LOGIN CONTROLLER (PHONE ONLY — FIXED)
========================================================== */
export const loginController = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const result = await loginService({ phone, password });

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "User logged in successfully",
      data: result.data,
    });

  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   LOGOUT CONTROLLER
========================================================== */
export const logoutController = async (req, res, next) => {
  try {
    await logoutService();

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "User logged out successfully",
    });

  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   FORGET PASSWORD CONTROLLER
========================================================== */
export const forgetPasswordController = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await forgetPassword(email);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: result.data.message,
    });

  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   VERIFY RESET PASSWORD CONTROLLER
========================================================== */
export const verifyResetPasswordController = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    await verifyResetPassword(email, code);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "Reset code verified successfully",
    });

  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   RESET PASSWORD CONTROLLER
========================================================== */
export const resetPasswordController = async (req, res, next) => {
  try {
    const { email, newPassword , confirmPassword} = req.body;

    await resetPassword(email, newPassword , confirmPassword);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "Password reset successfully",
    });

  } catch (err) {
    next(err);
  }
};

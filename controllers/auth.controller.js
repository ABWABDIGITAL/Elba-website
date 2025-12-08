import {
  registerService,
  adminRegisterService,
  loginService,
  logoutService,
  forgetPassword,
  verifyResetPassword,
  resetPassword,
  verifyResetLink,
  resetPasswordWithToken
} from "../services/auth.services.js";

import { StatusCodes } from "http-status-codes";

/* ==========================================================
   REGISTER
========================================================== */
export const registerController = async (req, res, next) => {
  try {
    const result = await registerService(req.body);

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
   ADMIN REGISTER
========================================================== */
export const adminRegisterController = async (req, res, next) => {
  try {
    const body = req.body;
    body.adminRole = req.user.legacyRole;

    const result = await adminRegisterService(body);

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
   LOGIN
========================================================== */
export const loginController = async (req, res, next) => {
  try {
    const result = await loginService(req.body);

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
   LOGOUT
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
   FORGET PASSWORD (SEND OTP + RESET LINK)
========================================================== */
export const forgetPasswordController = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await forgetPassword(email);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: result.message || "Reset code and reset link sent to email",
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   VERIFY OTP CODE
========================================================== */
export const verifyResetPasswordController = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    await verifyResetPassword(email, code);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "OTP verified successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   RESET PASSWORD USING OTP
========================================================== */
export const resetPasswordController = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    await resetPassword(email, newPassword, confirmPassword);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "Password reset successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   VERIFY RESET LINK TOKEN
========================================================== */
export const verifyResetLinkController = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await verifyResetLink(token);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "Reset link verified",
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================
   RESET PASSWORD USING TOKEN
========================================================== */
export const resetPasswordWithTokenController = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    await resetPasswordWithToken(token, newPassword, confirmPassword);

    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "Password reset successfully via link",
    });
  } catch (err) {
    next(err);
  }
};

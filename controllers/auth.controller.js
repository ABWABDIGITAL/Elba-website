import { 
  registerService,
  loginService,
  logoutService,
  forgetPassword,
  verifyResetPassword,
  resetPassword
} from "../services/auth.services.js";

import { StatusCodes } from "http-status-codes";


export const registerController = async (req, res) => {
  const { name, email, password, role } = req.body;

  const result = await registerService({ name, email, password, role });

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "User registered successfully",
    token: result.data.token,
    user: result.data.user,
  });
};


export const loginController = async (req, res) => {
  const { email, password } = req.body;

  const result = await loginService({ email, password });

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "User logged in successfully",
    user: result.data.user,
    token: result.data.token,
  });
};


export const logoutController = async (req, res) => {
  const result = await logoutService();

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "User logged out successfully",
  });
};


export const forgetPasswordController = async (req, res) => {
  const { email } = req.body;
  const result = await forgetPassword(email);

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: result.data.message,
  });
};


export const verifyResetPasswordController = async (req, res) => {
  const { email, code } = req.body;

  const result = await verifyResetPassword(email, code);

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Password reset code verified successfully",
  });
};


export const resetPasswordController = async (req, res) => {
  const { email, newPassword } = req.body;

  const result = await resetPassword(email, newPassword);

  if (!result.OK) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Password reset successfully",
  });
};

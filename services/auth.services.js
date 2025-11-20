import User from "../models/user.model.js";
import sendEmail from "../utlis/sendEmail.js";
import crypto from "crypto";

const buildUserDTO = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const registerService = async ({ name, email, password, role }) => {
  if (!name || !email || !password) {
    return { OK: false, error: "All fields are required" };
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return { OK: false, error: "Email is already in use" };
  }

  const newUser = await User.create({ name, email: normalizedEmail, password, role });
  const token = newUser.generateToken();

  return {
    OK: true,
    data: {
      user: buildUserDTO(newUser),
      token,
    },
  };
};

export const loginService = async ({ email, password }) => {
  if (!email || !password) {
    return { OK: false, error: "All fields are required" };
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!existingUser) {
    return { OK: false, error: "Invalid email or password" };
  }

  const isMatch = await existingUser.comparePassword(password);
  if (!isMatch) {
    return { OK: false, error: "Invalid email or password" };
  }

  const token = existingUser.generateToken();

  return {
    OK: true,
    data: {
      user: buildUserDTO(existingUser),
      token,
    },
  };
};

export const logoutService = async () => {
  return {
    OK: true,
    data: {
      message: "Logged out successfully",
    },
  };
};

export const forgetPassword = async (email) => {
  if (!email) return { OK: false, error: "Email is required" };

  const user = await User.findOne({ email });
  if (!user) return { OK: false, error: "User not found" };

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash("sha256").update(resetCode).digest("hex");

  user.resetPasswordCode = hashedCode;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  user.passwordVerified = false;

  await user.save();
  console.log("REAL CODE:", resetCode);
  console.log("HASHED CODE:", hashedCode);

  const msg = `Hi ${user.name}, your password reset code is: ${resetCode}`;

  try {
    await sendEmail({
      email,
      subject: "Reset Password",
      message: msg,
    });

    return { OK: true, data: { message: "Password reset code sent successfully" } };
  } catch (error) {
    return { OK: false, error: "Failed to send password reset code" };
  }
};

export const verifyResetPassword = async (email, code) => {
  if (!email || !code) return { OK: false, error: "Email and code are required" };

  const user = await User.findOne({ email });
  if (!user) return { OK: false, error: "User not found" };

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  console.log("USER HASH:", user.resetPasswordCode);
  console.log("VERIFIED HASH:", hashedCode);

  if (user.resetPasswordCode !== hashedCode) {
    return { OK: false, error: "Invalid reset password code" };
  }

  if (user.resetPasswordExpire < Date.now()) {
    return { OK: false, error: "Reset password code expired" };
  }

  user.passwordVerified = true;
  await user.save();


  return { OK: true, data: { message: "Password reset code verified successfully" } };
};

export const resetPassword = async (email, newPassword) => {
  if (!email || !newPassword) return { OK: false, error: "Email and password are required" };

  const user = await User.findOne({ email });
  if (!user) return { OK: false, error: "User not found" };

  if (!user.passwordVerified) {
    return { OK: false, error: "Password reset code not verified" };
  }

  user.password = newPassword;
  user.resetPasswordCode = null;
  user.resetPasswordExpire = null;
  user.passwordVerified = false;

  await user.save();

  return { OK: true, data: { message: "Password reset successfully" } };
};

import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendCodeEmail } from "../utlis/sendEmail.js";
import {
  BadRequest,
  NotFound,
  ServerError,
} from "../utlis/apiError.js";
import crypto from "crypto";
import { sendRegistrationWhatsApp } from "./whatsapp.services.js";
import { trackUserRegistration, trackUserLogin } from '../services/analytics.services.js';

/* ==========================================================
   USER DTO
========================================================== */
const buildUserDTO = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
});


export const registerService = async ({
  firstName,
  lastName,
  gender,
  BirthDate,
  email,
  password,
  phone,
  address,
  role, // Passed from validator middleware!
  req, // Request object for tracking
}) => {
  // Validator already checked everything, just get role if not passed
  let roleId = role;
  
  if (!roleId) {
    const defaultRole = await Role.findOne({ name: "user" }).select('_id').lean();
    roleId = defaultRole?._id;
    if (!roleId) throw BadRequest("User role not found");
  }
  const roleDoc = await Role.findOne({ name: role });
  if (!roleDoc) {
    throw BadRequest("Invalid role");
  }


  // Create user directly - no duplicate checks!
  const newUser = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    gender,
    dateOfBirth: BirthDate,
    email: email.toLowerCase().trim(),
    password,
    phone: phone.trim(),
    role: roleDoc._id,
    address: address?.trim(),
  });

  const token = newUser.generateToken();

  // Fire-and-forget
  sendRegistrationWhatsApp(newUser).catch(console.error);
  
  // Only track if req is provided
  if (req) {
    await trackUserRegistration(req, newUser).catch(console.error);
  }
  
  return {
    OK: true,
    message: "User registered successfully",
    data: {
      user: buildUserDTO(newUser),
      token,
    },
  };
};

/* ==========================================================
   ADMIN REGISTER SERVICE
========================================================== */
export const adminRegisterService = async ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  role,
  phone,
  address,
  adminRole
}) => {
  if (adminRole !== "admin" && adminRole !== "superAdmin") {
    throw BadRequest("Unauthorized: Only admins can register users with specific roles");
  }

  if (!firstName ||! lastName|| !email || !password || !confirmPassword || !phone || !role) {
    throw BadRequest("All fields including role are required");
  }

  if (password !== confirmPassword) {
    throw BadRequest("Passwords do not match");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.trim();
  const normalizedAddress = address?.trim();

  const emailExists = await User.findOne({ email: normalizedEmail });
  if (emailExists) throw BadRequest("Email already registered");

  const phoneExists = await User.findOne({ phone: normalizedPhone });
  if (phoneExists) throw BadRequest("Phone already registered");

  const roleDoc = await Role.findOne({ name: role });
  if (!roleDoc) {
    throw BadRequest("Invalid role name");
  }

  if (roleDoc.status !== "active") {
    throw BadRequest("Role is not active");
  }

  if (roleDoc.name === "superAdmin" && adminRole !== "superAdmin") {
    throw BadRequest("Only superAdmins can create superAdmin users");
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password,
    phone: normalizedPhone,
    role: roleDoc._id,
    address: normalizedAddress,
  });

  sendRegistrationWhatsApp(newUser).catch(err => {
    console.error("Failed to send registration WhatsApp:", err);
  });

  return {
    OK: true,
    message: "User registered successfully by admin",
    data: {
      user: buildUserDTO(newUser),
    },
  };
};

/* ==========================================================
   LOGIN SERVICE
========================================================== */
export const loginService = async (req, { phone, password }) => {
  if (!phone || !password) {
    throw BadRequest("Phone and password are required");
  }

  const normalizedPhone = phone.trim();
  const user = await User.findOne({ phone: normalizedPhone }).select("+password");

  if (!user) throw NotFound("User not found");

  if (user.status !== "active") {
    throw BadRequest("Account is deactivated");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw BadRequest("Invalid phone or password");

  const token = user.generateToken();
  
  // Only track login if analytics is enabled
  if (process.env.ANALYTICS_ENABLED === 'true') {
    await trackUserLogin(req, user);
  }
  return {
    OK: true,
    message: "User logged in successfully",
    data: {
      user: buildUserDTO(user),
      token,
    },
  };
};

/* ==========================================================
   LOGOUT SERVICE
========================================================== */
export const logoutService = async () => {
  return {
    OK: true,
    message: "Logged out successfully",
  };
};

/* ==========================================================
   FORGET PASSWORD
========================================================== */
export const forgetPassword = async (email) => {
  if (!email) throw BadRequest("Email is required");

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw NotFound("User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const resetLink = `${process.env.FRONTEND_URL}/ar/reset-password/${resetToken}`;

  user.resetPasswordCode = hashedOtp;
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  user.passwordVerified = false;

  await user.save();

  try {
    await sendCodeEmail({
      email: user.email,
      name: user.firstName || user.name,
      resetLink
    });

    return { OK: true, message: "Reset OTP and reset link sent to email" };

  } catch (err) {
    throw ServerError("Email sending failed");
  }
};

/* ==========================================================
   VERIFY RESET PASSWORD
========================================================== */
export const verifyResetPassword = async (email, code) => {
  if (!email || !code) throw BadRequest("Email and code are required");

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw NotFound("User not found");

  const hashed = crypto.createHash("sha256").update(code).digest("hex");

  if (user.resetPasswordCode !== hashed)
    throw BadRequest("Invalid reset code");

  if (user.resetPasswordExpire < Date.now())
    throw BadRequest("Reset code expired");

  user.passwordVerified = true;
  await user.save();

  return { OK: true, data: { message: "Reset code verified" } };
};

export const verifyResetLink = async (token) => {
  if (!token) throw BadRequest("Token is required");

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) throw BadRequest("Invalid or expired reset link");

  return {
    OK: true,
    message: "Reset link verified",
    data: { email: user.email }
  };
};

/* ==========================================================
   RESET PASSWORD WITH TOKEN
========================================================== */
export const resetPasswordWithToken = async (token, newPassword, confirmPassword) => {
  if (!token || !newPassword || !confirmPassword)
    throw BadRequest("Token and passwords required");

  if (newPassword !== confirmPassword)
    throw BadRequest("Passwords do not match");

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) throw BadRequest("Invalid or expired reset link");

  user.password = newPassword;
  user.resetPasswordCode = null;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  user.passwordVerified = false;

  await user.save();

  return { OK: true, message: "Password reset successful" };
};

/* ==========================================================
   RESET PASSWORD
========================================================== */
export const resetPassword = async (token, newPassword, confirmPassword) => {
  if (!token || !newPassword || !confirmPassword)
    throw BadRequest("Token and passwords are required");

  if (newPassword !== confirmPassword)
    throw BadRequest("Passwords do not match");

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) throw BadRequest("Invalid or expired reset link");

  user.password = newPassword;
  user.resetPasswordCode = null;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  user.passwordVerified = false;

  await user.save();

  return { OK: true, message: "Password reset successful" };
};

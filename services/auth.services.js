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

/* ==========================================================
   REGISTER SERVICE (FIXED)
========================================================== */
export const registerService = async ({
  firstName,
  lastName,
  gender,
  BirthDate,
  email,
  password,
  confirmPassword,
  role,
  phone,
  address
}) => {
  if (!firstName ||!lastName||!gender||!BirthDate||!email || !password || !confirmPassword || !phone) {
    throw BadRequest("All fields are required");
  }

  if (password !== confirmPassword) {
    throw BadRequest("Passwords do not match");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.trim();
  const normalizedAddress = address?.trim();

  // Double check for duplicates
  const emailExists = await User.findOne({ email: normalizedEmail });
  if (emailExists) throw BadRequest("Email already registered");

  const phoneExists = await User.findOne({ phone: normalizedPhone });
  if (phoneExists) throw BadRequest("Phone already registered");

  // Determine role: For public registration, only allow "user" role for security
  // If you want to allow other roles in public registration, add them to allowedPublicRoles array
  const allowedPublicRoles = ["user"]; // Only "user" role allowed for public registration

  let assignedRoleId;
  if (role) {
    // Check if the provided role is in the allowed list for public registration
    if (!allowedPublicRoles.includes(role)) {
      throw BadRequest("You can only register as a 'user'. Contact admin for other roles.");
    }

    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc || !roleDoc.isActive) {
      throw BadRequest("Invalid or inactive role");
    }
    assignedRoleId = roleDoc._id;
  } else {
    // Default to "user" role if no role is provided
    const defaultRole = await Role.findOne({ name: "user" });
    assignedRoleId = defaultRole?._id;

    if (!assignedRoleId) {
      throw BadRequest("User role not found in the system");
    }
  }

  // NEVER save confirmPassword to DB
  const newUser = await User.create({
    firstName,
    lastName,
    gender,
    BirthDate,
    email: normalizedEmail,
    password,
    phone: normalizedPhone,
    role: assignedRoleId,
    address: normalizedAddress,
  });

  const token = newUser.generateToken();

  // Send WhatsApp welcome notification (async, don't wait)
  sendRegistrationWhatsApp(newUser).catch(err => {
    console.error("Failed to send registration WhatsApp:", err);
  });

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
   ADMIN REGISTER SERVICE (With Required Role)
========================================================== */
export const adminRegisterService = async ({
  name,
  email,
  password,
  confirmPassword,
  role,
  phone,
  address,
  adminRole
}) => {
  // Only admin and superAdmin can create users with specific roles
  if (adminRole !== "admin" && adminRole !== "superAdmin") {
    throw BadRequest("Unauthorized: Only admins can register users with specific roles");
  }

  if (!name || !email || !password || !confirmPassword || !phone || !role) {
    throw BadRequest("All fields including role are required");
  }

  if (password !== confirmPassword) {
    throw BadRequest("Passwords do not match");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.trim();
  const normalizedAddress = address?.trim();

  // Double check for duplicates
  const emailExists = await User.findOne({ email: normalizedEmail });
  if (emailExists) throw BadRequest("Email already registered");

  const phoneExists = await User.findOne({ phone: normalizedPhone });
  if (phoneExists) throw BadRequest("Phone already registered");

  // Validate role by name
  const roleDoc = await Role.findOne({ name: role });
  if (!roleDoc) {
    throw BadRequest("Invalid role name");
  }

  if (!roleDoc.isActive) {
    throw BadRequest("Role is not active");
  }

  // Prevent non-superAdmins from creating superAdmins
  if (roleDoc.name === "superAdmin" && adminRole !== "superAdmin") {
    throw BadRequest("Only superAdmins can create superAdmin users");
  }

  // Create user with specified role
  const newUser = await User.create({
    name,
    email: normalizedEmail,
    password,
    phone: normalizedPhone,
    role: roleDoc._id,
    address: normalizedAddress,
  });

  // Send WhatsApp welcome notification (async, don't wait)
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
   LOGIN SERVICE (PHONE ONLY — FIXED)
========================================================== */
export const loginService = async ({ phone, password }) => {
  console.log('Login attempt with:', { phone });
  if (!phone || !password) {
    throw BadRequest("Phone and password are required");
  }

  const normalizedPhone = phone.trim();
 console.log('Normalized phone:', normalizedPhone);
  const user = await User.findOne({ phone: normalizedPhone }).select("+password");
  console.log('Found user:', user ? user.email : 'Not found'); // Debug log

   if (!user) {
    console.log('No user found with phone:', normalizedPhone); // Debug log
    throw NotFound("User not found");
  }
  // check user active
   if (!user.isActive) {
    console.log('User is inactive:', user.email); // Debug log
    throw BadRequest("Account is deactivated");
  }

  const isMatch = await user.comparePassword(password);
   console.log('Password match:', isMatch);
  if (!isMatch) throw BadRequest("Invalid phone or password");

  const token = user.generateToken();
 console.log('Login successful for user:', user.email);
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
   FORGET PASSWORD (EMAIL BASED) — FIXED
========================================================== */
export const forgetPassword = async (email) => {
  if (!email) throw BadRequest("Email is required");

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw NotFound("User not found");

  /* ==========================
     1. Generate OTP (6 digits)
  =========================== */
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  /* ==========================
     2. Generate Reset Link Token
  =========================== */
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const resetLink = `${process.env.FRONTEND_URL}/${resetToken}`;


  /* ==========================
     3. Save BOTH OTP + Link
  =========================== */
  user.resetPasswordCode = hashedOtp;
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.passwordVerified = false;

  await user.save();

  /* ==========================
     4. Send your custom TEMPLATE email
  =========================== */
  try {
    await sendCodeEmail({
      email: user.email,
      name: user.firstName || user.name,
      resetLink     // Reset link
    });

    return { OK: true, message: "Reset OTP and reset link sent to email" };

  } catch (err) {
    throw ServerError("Email sending failed");
  }
};

/* ==========================================================
   VERIFY RESET PASSWORD (FIXED)
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
   RESET PASSWORD (FIXED)
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


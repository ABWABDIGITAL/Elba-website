import User from "../models/user.model.js";
import { BadRequest, NotFound } from "../utlis/apiError.js";
export const updateProfileService = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw NotFound("User not found");

  // --- Remove forbidden fields ---
  const forbidden = [
    "password",
    "role",
    "resetPasswordCode",
    "resetPasswordToken",
    "isActive",
    "legacyRole",
    "favorites"
  ];
  forbidden.forEach((f) => delete data[f]);

  // --- Email update ---
  if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) throw BadRequest("Email already taken");
    data.email = data.email.toLowerCase();
  }

  // --- Phone update ---
  if (data.phone && data.phone !== user.phone) {
    const exists = await User.findOne({ phone: data.phone });
    if (exists) throw BadRequest("Phone number already in use");
  }

  // --- Auto-generate profileName if not provided ---
  if (data.firstName || data.lastName) {
    data.profileName = `${data.firstName || user.firstName} ${data.lastName || user.lastName}`;
  }

  // --- Remove deprecated name field automatically ---
  data.name = undefined;

  // --- Update user ---
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: data, $unset: { name: "" } }, // ensure name is removed
    { new: true, runValidators: true }
  );

  return {
    OK: true,
    message: "Profile updated successfully",
    data: updatedUser
  };
};


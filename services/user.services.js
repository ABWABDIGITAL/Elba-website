import User from "../models/user.model.js";
import { BadRequest, Forbidden, NotFound } from "../utlis/apiError.js";
import ApiFeatures from "../utlis/apiFeatures.js";

const buildAdminUserDTO = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export const adminGetAllUsersService = async (query) => {
  const features = new ApiFeatures(User.find({}), query)
    .filter()
    .sort()
    .paginate()
    .limitFields();

  const users = await features.mongooseQuery;

  // Correct total count after filter
  const total = await User.countDocuments(features.getFilter());

  return {
    OK: true,
    message: "Users fetched successfully",
    data: users.map(buildAdminUserDTO),
    pagination: features.buildPaginationResult(total),
  };
};


export const adminGetUserByIdService = async (id) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  return {
    OK: true,
    message: "User fetched successfully",
    data: buildAdminUserDTO(user),
  };
};

export const adminUpdateUserService = async (id, data, adminRole, file = null) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  // Prevent password change from admin
  if (data.password) {
    throw Forbidden("Admin cannot change user password");
  }

  // Prevent role escalation unless superAdmin
  if (data.role && adminRole !== "superAdmin") {
    throw Forbidden("Only superAdmin can change roles");
  }

  // Email update check
  if (data.email) {
    data.email = data.email.toLowerCase().trim();
    const exists = await User.findOne({ email: data.email });

    if (exists && exists._id.toString() !== id.toString()) {
      throw BadRequest("Email already used by another user");
    }
  }

  // Handle profile image upload
  if (file) {
    data.profileImage = `/${file.path.replace(/\\/g, "/")}`;
  }

  // Prevent direct manipulation of sensitive fields
  delete data.resetPasswordCode;
  delete data.resetPasswordExpire;
  delete data.passwordVerified;
  delete data.createdAt;
  delete data.password;

  const updated = await User.findByIdAndUpdate(id, data, { new: true });

  return {
    OK: true,
    message: "User updated successfully",
    data: buildAdminUserDTO(updated),
  };
};
export const adminDeleteUserService = async (id) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  user.isActive = false;
  await user.save();

  return {
    OK: true,
    message: "User deactivated successfully",
    data: buildAdminUserDTO(user),
  };
};

export const adminActivateUserService = async (id) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  user.isActive = true;
  user.lockUntil = null;
  user.loginAttempts = 0;
  await user.save();

  return {
    OK: true,
    message: "User activated successfully",
    data: buildAdminUserDTO(user),
  };
};

export const adminLockUserService = async (id, lockDuration = 24) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  user.lockUntil = new Date(Date.now() + lockDuration * 60 * 60 * 1000);
  await user.save();

  return {
    OK: true,
    message: `User locked for ${lockDuration} hours`,
    data: buildAdminUserDTO(user),
  };
};

export const adminUnlockUserService = async (id) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  user.lockUntil = null;
  user.loginAttempts = 0;
  await user.save();

  return {
    OK: true,
    message: "User unlocked successfully",
    data: buildAdminUserDTO(user),
  };
};

export const adminBulkActionService = async (action, userIds) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw BadRequest("User IDs array is required");
  }

  let updateData = {};
  let message = "";

  switch (action) {
    case "activate":
      updateData = { isActive: true, lockUntil: null, loginAttempts: 0 };
      message = "Users activated successfully";
      break;
    case "deactivate":
      updateData = { isActive: false };
      message = "Users deactivated successfully";
      break;
    case "unlock":
      updateData = { lockUntil: null, loginAttempts: 0 };
      message = "Users unlocked successfully";
      break;
    default:
      throw BadRequest("Invalid action");
  }

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: updateData }
  );

  return {
    OK: true,
    message,
    data: {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    },
  };
};

export const getUserStatisticsService = async (userId) => {
  if (!userId) throw BadRequest("User ID is required");

  const user = await User.findById(userId);
  if (!user) throw NotFound("User not found");

  // Import Order model here to avoid circular dependency
  const Order = (await import("../models/order.model.js")).default;

  const [totalOrders, completedOrders, totalSpent] = await Promise.all([
    Order.countDocuments({ user: userId }),
    Order.countDocuments({ user: userId, status: "delivered" }),
    Order.aggregate([
      { $match: { user: user._id, status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  return {
    OK: true,
    data: {
      user: buildAdminUserDTO(user),
      statistics: {
        totalOrders,
        completedOrders,
        totalSpent: totalSpent[0]?.total || 0,
        accountAge: Math.floor(
          (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)
        ),
        lastLogin: user.lastLogin,
      },
    },
  };
};


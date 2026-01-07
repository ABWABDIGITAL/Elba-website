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
  status: user.status,   // <-- status instead of isActive
  createdAt: user.createdAt,
});

/* ============================================================
   GET ALL USERS
============================================================ */
export const adminGetAllUsersService = async (query) => {
  const features = new ApiFeatures(User.find({}), query)
    .filter()
    .sort()
    .paginate()
    .limitFields();

  const users = await features.mongooseQuery;
  const total = await User.countDocuments(features.getFilter());

  return {
    OK: true,
    message: "Users fetched successfully",
    data: users.map(buildAdminUserDTO),
    pagination: features.buildPaginationResult(total),
  };
};

/* ============================================================
   GET USER BY ID
============================================================ */
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

/* ============================================================
   UPDATE USER
============================================================ */
export const adminUpdateUserService = async (id, data, adminRole, file = null) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id).populate("role");
  if (!user) throw NotFound("User not found");

  // Prevent password change from admin
  if (data.password) {
    throw Forbidden("Admin cannot change user password");
  }

  /* ==========================================================
     ROLE UPDATE (ONLY IF CHANGED)
  ========================================================== */
  if (data.role && data.role.toString() !== user.role._id.toString()) {

    const RoleModel = (await import("../models/role.model.js")).default;
    let newRole;

    // Check if roleId or roleName is provided
    if (/^[0-9a-fA-F]{24}$/.test(data.role)) {
      newRole = await RoleModel.findById(data.role);
    } else {
      newRole = await RoleModel.findOne({ name: data.role });
    }

    if (!newRole) throw BadRequest("Invalid role");

    if (newRole.status !== "active") {
      throw BadRequest("Role is not active");
    }

    // Only superAdmin can update roles
    if (adminRole !== "superAdmin") {
      throw Forbidden("Only superAdmin can change roles");
    }

    // Prevent assigning superAdmin unless requester is superAdmin
    if (newRole.name === "superAdmin" && adminRole !== "superAdmin") {
      throw Forbidden("Only superAdmins can assign superAdmin role");
    }

    // Prevent demoting a superAdmin unless requester is superAdmin
    if (user.role?.name === "superAdmin" && adminRole !== "superAdmin") {
      throw Forbidden("Only superAdmins can change superAdmin users");
    }

    // Save role ID
    data.role = newRole._id;
  } else {
    // If same role → do NOT update it
    delete data.role;
  }

  /* ==========================================================
     EMAIL UPDATE
  ========================================================== */
  if (data.email) {
    data.email = data.email.toLowerCase().trim();
    const exists = await User.findOne({ email: data.email });

    if (exists && exists._id.toString() !== id.toString()) {
      throw BadRequest("Email already used by another user");
    }
  }

  /* ==========================================================
     PHONE UPDATE
  ========================================================== */
  if (data.phone) {
    data.phone = data.phone.trim();
    const exists = await User.findOne({ phone: data.phone });

    if (exists && exists._id.toString() !== id.toString()) {
      throw BadRequest("Phone already used by another user");
    }
  }

  /* ==========================================================
     PROFILE IMAGE
  ========================================================== */
  if (file) {
    data.profileImage = `/${file.path.replace(/\\/g, "/")}`;
  }

  /* ==========================================================
     REMOVE FORBIDDEN FIELDS
  ========================================================== */
  delete data.resetPasswordCode;
  delete data.resetPasswordExpire;
  delete data.passwordVerified;
  delete data.createdAt;
  delete data.password;

  /* ==========================================================
     UPDATE USER
  ========================================================== */
  const updated = await User.findByIdAndUpdate(id, data, {
    new: true,
  }).populate("role");

  return {
    OK: true,
    message: "User updated successfully",
    data: buildAdminUserDTO(updated),
  };
};

export const createUserWithSpecificRole = async (data) => {
  const user = await User.create(data);
  return {
    OK: true,
    message: "User created successfully",
    data: buildAdminUserDTO(user),
  };
};

/* ============================================================
   DEACTIVATE USER  (REPLACED isActive → status)
============================================================ */
export const adminDeleteUserService = async (id) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  user.status = "inactive";      // ⬅ REPLACED
  await user.save();

  return {
    OK: true,
    message: "User deactivated successfully",
    data: buildAdminUserDTO(user),
  };
};

/* ============================================================
   ACTIVATE USER
============================================================ */
export const adminActivateUserService = async (id) => {
  if (!id) throw BadRequest("User ID is required");

  const user = await User.findById(id);
  if (!user) throw NotFound("User not found");

  user.status = "active";        // ⬅ REPLACED
  user.lockUntil = null;
  user.loginAttempts = 0;
  await user.save();

  return {
    OK: true,
    message: "User activated successfully",
    data: buildAdminUserDTO(user),
  };
};

/* ============================================================
   LOCK USER
============================================================ */
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

/* ============================================================
   UNLOCK USER
============================================================ */
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

/* ============================================================
   BULK ACTIONS (activate/deactivate/unlock)
============================================================ */
export const adminBulkActionService = async (action, userIds) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw BadRequest("User IDs array is required");
  }

  let updateData = {};
  let message = "";

  switch (action) {
    case "activate":
      updateData = { status: "active", lockUntil: null, loginAttempts: 0 };
      message = "Users activated successfully";
      break;

    case "deactivate":
      updateData = { status: "inactive" };
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

/* ============================================================
   USER STATISTICS
============================================================ */
export const getUserStatisticsService = async (userId) => {
  if (!userId) throw BadRequest("User ID is required");

  const user = await User.findById(userId);
  if (!user) throw NotFound("User not found");

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

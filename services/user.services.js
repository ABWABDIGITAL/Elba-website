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

export const adminUpdateUserService = async (id, data, adminRole) => {
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


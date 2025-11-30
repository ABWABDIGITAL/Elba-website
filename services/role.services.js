import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import { BadRequest, NotFound, ServerError } from "../utlis/apiError.js";
import { redis } from "../config/redis.js";

const ROLE_CACHE_PREFIX = "role:";
const ROLES_LIST_CACHE_KEY = "roles:all";
const CACHE_TTL = 3600; // 1 hour

export const createRoleService = async (roleData) => {
  try {
    const existing = await Role.findOne({ name: roleData.name });
    if (existing) {
      throw BadRequest("Role with this name already exists");
    }

    const role = await Role.create(roleData);

    // Clear cache
    await redis.del(ROLES_LIST_CACHE_KEY);

    return role;
  } catch (err) {
    throw ServerError("Failed to create role", err);
  }
};

export const getAllRolesService = async (filters = {}) => {
  try {
    // Try to get from cache
    const cacheKey = filters.isActive !== undefined
      ? `${ROLES_LIST_CACHE_KEY}:${filters.isActive}`
      : ROLES_LIST_CACHE_KEY;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return { fromCache: true, data: cached };
    }

    const query = {};
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const roles = await Role.find(query).sort({ priority: -1, name: 1 }).lean();

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(roles), { ex: CACHE_TTL });

    return { fromCache: false, data: roles };
  } catch (err) {
    throw ServerError("Failed to fetch roles", err);
  }
};

export const getRoleByIdService = async (roleId) => {
  try {
    const cacheKey = `${ROLE_CACHE_PREFIX}${roleId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return { fromCache: true, data: cached };
    }

    const role = await Role.findById(roleId).lean();
    if (!role) {
      throw NotFound("Role not found");
    }

    await redis.set(cacheKey, JSON.stringify(role), { ex: CACHE_TTL });

    return { fromCache: false, data: role };
  } catch (err) {
    if (err.name === "CastError") {
      throw NotFound("Invalid role ID");
    }
    throw ServerError("Failed to fetch role", err);
  }
};

export const updateRoleService = async (roleId, updateData) => {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      throw NotFound("Role not found");
    }

    if (role.isSystemRole && updateData.isSystemRole === false) {
      throw BadRequest("Cannot change system role status");
    }

    if (updateData.name && updateData.name !== role.name) {
      const existing = await Role.findOne({ name: updateData.name });
      if (existing) {
        throw BadRequest("Role with this name already exists");
      }
    }

    const updated = await Role.findByIdAndUpdate(
      roleId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Clear cache
    await redis.del(`${ROLE_CACHE_PREFIX}${roleId}`);
    await redis.del(ROLES_LIST_CACHE_KEY);
    await redis.del(`${ROLES_LIST_CACHE_KEY}:true`);
    await redis.del(`${ROLES_LIST_CACHE_KEY}:false`);

    return updated;
  } catch (err) {
    throw ServerError("Failed to update role", err);
  }
};

export const deleteRoleService = async (roleId) => {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      throw NotFound("Role not found");
    }

    if (role.isSystemRole) {
      throw BadRequest("Cannot delete system roles");
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: roleId });
    if (usersWithRole > 0) {
      throw BadRequest(
        `Cannot delete role. ${usersWithRole} user(s) currently have this role`
      );
    }

    await Role.findByIdAndDelete(roleId);

    // Clear cache
    await redis.del(`${ROLE_CACHE_PREFIX}${roleId}`);
    await redis.del(ROLES_LIST_CACHE_KEY);
    await redis.del(`${ROLES_LIST_CACHE_KEY}:true`);
    await redis.del(`${ROLES_LIST_CACHE_KEY}:false`);

    return { message: "Role deleted successfully" };
  } catch (err) {
    throw ServerError("Failed to delete role", err);
  }
};

export const assignRoleToUserService = async (userId, roleId) => {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      throw NotFound("Role not found");
    }

    if (!role.isActive) {
      throw BadRequest("Cannot assign inactive role");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: roleId },
      { new: true, select: "-password" }
    ).populate("role");

    if (!user) {
      throw NotFound("User not found");
    }

    return user;
  } catch (err) {
    throw ServerError("Failed to assign role", err);
  }
};

export const getRoleUsersService = async (roleId, page = 1, limit = 20) => {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      throw NotFound("Role not found");
    }

    const skip = (page - 1) * limit;

    const users = await User.find({ role: roleId })
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments({ role: roleId });

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    throw ServerError("Failed to fetch role users", err);
  }
};

export const cloneRoleService = async (roleId, newRoleName) => {
  try {
    const originalRole = await Role.findById(roleId);
    if (!originalRole) {
      throw NotFound("Role not found");
    }

    const existing = await Role.findOne({ name: newRoleName });
    if (existing) {
      throw BadRequest("Role with this name already exists");
    }

    const clonedRole = await Role.create({
      name: newRoleName,
      displayName: {
        en: `${originalRole.displayName.en} (Copy)`,
        ar: `${originalRole.displayName.ar} (نسخة)`,
      },
      description: originalRole.description,
      permissions: originalRole.permissions,
      isSystemRole: false,
      priority: originalRole.priority,
    });

    // Clear cache
    await redis.del(ROLES_LIST_CACHE_KEY);

    return clonedRole;
  } catch (err) {
    throw ServerError("Failed to clone role", err);
  }
};

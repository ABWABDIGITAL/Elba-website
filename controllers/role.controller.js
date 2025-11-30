import {
  createRoleService,
  getAllRolesService,
  getRoleByIdService,
  updateRoleService,
  deleteRoleService,
  assignRoleToUserService,
  getRoleUsersService,
  cloneRoleService,
} from "../services/role.services.js";

export const createRole = async (req, res, next) => {
  try {
    const role = await createRoleService(req.body);

    res.status(201).json({
      status: "success",
      message: "Role created successfully",
      data: role,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllRoles = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === "true";
    }

    const result = await getAllRolesService(filters);

    res.status(200).json({
      status: "success",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

export const getRoleById = async (req, res, next) => {
  try {
    const result = await getRoleByIdService(req.params.id);

    res.status(200).json({
      status: "success",
      fromCache: result.fromCache,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const role = await updateRoleService(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      message: "Role updated successfully",
      data: role,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const result = await deleteRoleService(req.params.id);

    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const assignRoleToUser = async (req, res, next) => {
  try {
    const { userId, roleId } = req.body;
    const user = await assignRoleToUserService(userId, roleId);

    res.status(200).json({
      status: "success",
      message: "Role assigned successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const getRoleUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await getRoleUsersService(req.params.id, page, limit);

    res.status(200).json({
      status: "success",
      data: result.users,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const cloneRole = async (req, res, next) => {
  try {
    const { newRoleName } = req.body;
    const role = await cloneRoleService(req.params.id, newRoleName);

    res.status(201).json({
      status: "success",
      message: "Role cloned successfully",
      data: role,
    });
  } catch (err) {
    next(err);
  }
};

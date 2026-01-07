import {
  adminGetAllUsersService,
  adminGetUserByIdService,
  adminUpdateUserService,
  adminDeleteUserService,
  adminActivateUserService,
  adminLockUserService,
  adminUnlockUserService,
  adminBulkActionService,
  getUserStatisticsService,
  createUserWithSpecificRole,
} from "../services/user.services.js";
import Role from "../models/role.model.js";
import { StatusCodes } from "http-status-codes";

export const adminGetAllUsers = async (req, res, next) => {
  try {
    const result = await adminGetAllUsersService(req.query);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
export const createUserWithSpecificRoleController = async (req, res, next) => {
  try {
    if (req.body.role && typeof req.body.role === "string") {
    const role = await Role.findOne({ name: req.body.role });
    if (!role) {
      throw new Error("Invalid role");
    }
    req.body.role = role._id;
  }

    const result = await createUserWithSpecificRole(req.body);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};
export const adminGetUserById = async (req, res, next) => {
  try {
    const result = await adminGetUserByIdService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const adminUpdateUser = async (req, res, next) => {
  try {
    const result = await adminUpdateUserService(
      req.params.id,
      req.body,
      req.user.legacyRole,
      req.file
    );
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const adminDeleteUser = async (req, res, next) => {
  try {
    const result = await adminDeleteUserService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const adminActivateUser = async (req, res, next) => {
  try {
    const result = await adminActivateUserService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const adminLockUser = async (req, res, next) => {
  try {
    const lockDuration = parseInt(req.body.lockDuration) || 24;
    const result = await adminLockUserService(req.params.id, lockDuration);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const adminUnlockUser = async (req, res, next) => {
  try {
    const result = await adminUnlockUserService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const adminBulkAction = async (req, res, next) => {
  try {
    const { action, userIds } = req.body;
    const result = await adminBulkActionService(action, userIds);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

export const getUserStatistics = async (req, res, next) => {
  try {
    const result = await getUserStatisticsService(req.params.id);
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

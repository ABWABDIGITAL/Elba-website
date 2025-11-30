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
} from "../services/user.services.js";

import { StatusCodes } from "http-status-codes";

export const adminGetAllUsers = async (req, res, next) => {
  try {
    const result = await adminGetAllUsersService(req.query);
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
    const result = await adminUpdateUserService(req.params.id, req.body, req.user.role);
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

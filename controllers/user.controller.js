import {
  adminGetAllUsersService,
  adminGetUserByIdService,
  adminUpdateUserService,
  adminDeleteUserService
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

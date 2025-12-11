import { StatusCodes } from "http-status-codes";
import {
  createSettingsService,
  getAllSettingsService,
  getSettingsByIdService,
  updateSettingsService,
  deleteSettingsService,
} from "../services/settings.services.js";

// CREATE
export const createSettingsController = async (req, res, next) => {
  try {
    const settings = await createSettingsService(req.body);
    res.status(StatusCodes.CREATED).json({
      status: "success",
      message: "Settings created successfully",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getAllSettingsController = async (req, res, next) => {
  try {
    const settings = await getAllSettingsService();
    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE
export const getSettingsByIdController = async (req, res, next) => {
  try {
    const settings = await getSettingsByIdService(req.params.id);
    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Settings record found",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateSettingsController = async (req, res, next) => {
  try {
    const updated = await updateSettingsService(req.params.id, req.body);
    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteSettingsController = async (req, res, next) => {
  try {
    const deleted = await deleteSettingsService(req.params.id);
    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Settings deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

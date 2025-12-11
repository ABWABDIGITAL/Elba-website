import Settings from "../models/settings.model.js";
import { NotFound, BadRequest, ServerError } from "../utlis/apiError.js";

// Create
export const createSettingsService = async (data) => {
  const exists = await Settings.findOne();
  if (exists) throw BadRequest("Settings already exist");
  const settings = await Settings.create(data);
  return settings;
};

// Get All
export const getAllSettingsService = async () => {
  const settings = await Settings.find();
  return settings;
};

// Get One
export const getSettingsByIdService = async (id) => {
  const settings = await Settings.findById(id);
  if (!settings) throw NotFound("Settings record not found");
  return settings;
};

// Update
export const updateSettingsService = async (id, data) => {
  const settings = await Settings.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!settings) throw NotFound("Settings record not found");
  return settings;
};

// Delete
export const deleteSettingsService = async (id) => {
  const deleted = await Settings.findByIdAndDelete(id);
  if (!deleted) throw NotFound("Settings record not found");
  return deleted;
};

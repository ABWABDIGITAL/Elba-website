import Address from "../models/address.model.js";
import { NotFound, ServerError } from "../utlis/apiError.js";

export const createAddressService = async (userId, payload) => {
  try {
    return await Address.create({ user: userId, ...payload });
  } catch (err) {
    throw ServerError("Failed to create address", err);
  }
};

export const getUserAddressesService = async (userId) => {
  return await Address.find({ user: userId }).sort({ isDefault: -1 });
};

export const updateAddressService = async (id, userId, payload) => {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw NotFound("Address not found");

  Object.assign(address, payload);
  await address.save();
  return address;
};

export const deleteAddressService = async (id, userId) => {
  const removed = await Address.findOneAndDelete({ _id: id, user: userId });
  if (!removed) throw NotFound("Address not found");

  return removed;
};

export const setDefaultAddressService = async (id, userId) => {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw NotFound("Address not found");

  address.isDefault = true;
  await address.save();
  return address;
};

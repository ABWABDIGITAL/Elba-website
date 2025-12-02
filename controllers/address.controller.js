import {
  createAddressService,
  getUserAddressesService,
  updateAddressService,
  deleteAddressService,
  setDefaultAddressService,
} from "../services/address.services.js";

export const createAddressController = async (req, res, next) => {
  try {
    const address = await createAddressService(req.user._id, req.body);
    res.status(201).json({ success: true,msg:"Address created successfully", data: address });
  } catch (err) {
    next(err);
  }
};

export const getUserAddressesController = async (req, res, next) => {
  try {
    const addresses = await getUserAddressesService(req.user._id);
    res.json({ success: true,msg:"Addresses retrieved successfully", data: addresses });
  } catch (err) {
    next(err);
  }
};

export const updateAddressController = async (req, res, next) => {
  try {
    const updated = await updateAddressService(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteAddressController = async (req, res, next) => {
  try {
    await deleteAddressService(req.params.id, req.user._id);
    res.json({ success: true, message: "Address deleted" });
  } catch (err) {
    next(err);
  }
};

export const setDefaultAddressController = async (req, res, next) => {
  try {
    const updated = await setDefaultAddressService(req.params.id, req.user._id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

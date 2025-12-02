import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import multer from "multer";

import {
  validateCreateAddress,
  validateUpdateAddress,
  validateAddressId,
} from "../validators/address.validators.js";

import {
  createAddressController,
  getUserAddressesController,
  updateAddressController,
  deleteAddressController,
  setDefaultAddressController,
} from "../controllers/address.controller.js";

const router = express.Router();
const formData = multer().none(); // accept form-data

router.use(protect);

// Create
router.post("/", formData, validateCreateAddress, createAddressController);

// List
router.get("/", getUserAddressesController);

// Update
router.put("/:id", formData, validateUpdateAddress, updateAddressController);

// Delete
router.delete("/:id", validateAddressId, deleteAddressController);

// Set default
router.patch("/:id/default", validateAddressId, setDefaultAddressController);

export default router;

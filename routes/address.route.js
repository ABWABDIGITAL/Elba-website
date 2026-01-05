import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import multer from "multer";
import { requirePermission } from "../middlewares/permission.middleware.js";
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
router.post("/", requirePermission("addresses", "create"), formData, validateCreateAddress, createAddressController);

// List
router.get("/", requirePermission("addresses", "read"), getUserAddressesController);

// Update
router.put("/:id", requirePermission("addresses", "update"), formData, validateUpdateAddress, updateAddressController);

// Delete
router.delete("/:id", requirePermission("addresses", "delete"), validateAddressId, deleteAddressController);

// Set default
router.patch("/:id/default", requirePermission("addresses", "update"), validateAddressId, setDefaultAddressController);

export default router;

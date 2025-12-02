import express from "express";
import {
  createContactController,
  getAllContactMessagesController
} from "../controllers/contactUs.controller.js";

import { validateCreateContact } from "../validators/contactUs.validators.js";
import { protect } from "../middlewares/authMiddleware.js";


const router = express.Router();

// POST /api/contact-us
router.post("/", protect , validateCreateContact, createContactController);

// GET /api/contact-us (admin only)
router.get("/", protect, getAllContactMessagesController);

export default router;

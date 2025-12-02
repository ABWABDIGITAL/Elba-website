import express from "express";
import {
  createCommunicationInfoController,
  getMyCommunicationInfoController
} from "../controllers/communicationInfo.controller.js";

import { validateCreateCommunicationInfo } from "../validators/communicationInfo.Validators.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "",
  protect,
  validateCreateCommunicationInfo,
  createCommunicationInfoController
);

router.get(
  "/my",
  protect,
  getMyCommunicationInfoController
);

export default router;

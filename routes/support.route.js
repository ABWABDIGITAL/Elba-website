import express from "express";
import { createSupportController, getMySupportRequestsController ,getAllSupportRequestsController} from "../controllers/support.controller.js";
import { validateCreateSupport } from "../validators/support.validators.js";
import { protect } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/", protect, validateCreateSupport, createSupportController);

router.get("/my-requests", protect, getMySupportRequestsController);

router.get("/",protect, getAllSupportRequestsController)

export default router;

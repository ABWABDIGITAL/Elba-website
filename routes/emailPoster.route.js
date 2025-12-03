import express from "express";
import { createEmailPosterController, getEmailPostersController } from "../controllers/emailPoster.controller.js";
import { protect} from "../middlewares/authMiddleware.js";
    
const router = express.Router();

router.post("/", protect, createEmailPosterController);
router.get("/", getEmailPostersController);

export default router;
// routes/home.routes.js
import express from "express";
import { homeUpload } from "../middlewares/uploadMiddleware.js";

import {
  createHome,
  getHome,
  updateHome,
} from "../controllers/home.controller.js";

const router = express.Router();

router.post("/", homeUpload, createHome);
router.put("/", homeUpload, updateHome);
router.get("/", getHome);




export default router;

// routes/home.routes.js
import express from "express";
import { imageUpload } from "../middlewares/uploadMiddleware.js";
import {
  createHome,
  getHome,
  updateHome,
  uploadHomeBanners,
} from "../controllers/home.controller.js";
import { protect, allowTo } from "../middlewares/authMiddleware.js";
const router = express.Router();

const upload = imageUpload("home");

router.post("/", protect, allowTo("admin","superAdmin"),createHome);
router.get("/", getHome);
router.put("/", protect, upload.fields([
    { name: "hero", maxCount: 20 },
    { name: "gif", maxCount: 20 },
    { name: "promovideo", maxCount: 20 },
    { name: "popupVideo", maxCount: 20 },
    { name: "offerBanner", maxCount: 20 }
  ]),updateHome);

// Only include fields that actually exist in your schema & controller
router.post(
  "/banners",protect, allowTo("admin","superAdmin"),
  upload.fields([
    { name: "hero", maxCount: 10 },
    { name: "gif", maxCount: 10 },
    { name: "promovideo", maxCount: 10 },
    { name: "popupVideo", maxCount: 10 },
    { name: "offerBanner", maxCount: 10 },
  ]),
  uploadHomeBanners
);

export default router;

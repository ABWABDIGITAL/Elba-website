import express from "express";
import { createHome, getHome, updateHome } from "../controllers/home.controller.js";
import { validateUpdateHome } from "../validators/home.validators.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";
import upload from "../middlewares/uploadMiddleware.js";
import { allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
//   allowTo("admin"),
  upload({ folder: "home" }).any(),
  parseNestedJson,
  validateUpdateHome,
  createHome
);
           // create only once
router.get("/", getHome);                   // cached get
router.put("/:id", validateUpdateHome, updateHome);   // update only

export default router;

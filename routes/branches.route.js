import express from "express";
import {
  createBranch,
  getBranch,
  getBranches,
  updateBranch,
  deleteBranch,
} from "../controllers/branch.controller.js";

import {
  createBranchValidator,
  updateBranchValidator,
} from "../validators/branch.validator.js";
import { allowTo, protect } from "../middlewares/authMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";
import upload from "../middlewares/uploadMiddleware.js";
const router = express.Router();

router
  .route("/").post(
  protect,
  allowTo("admin","superAdmin"),
  upload({ folder: "branches" }).fields([
    { name: "images", maxCount: 5 }
  ]),
  parseNestedJson,
  createBranchValidator,
  createBranch
)

  .get(protect,getBranches);

router
  .route("/:id")
  .get(protect ,getBranch)
  .put(
  protect,
  allowTo("admin","superAdmin"),
  upload({ folder: "branches" }).fields([{ name: "images", maxCount: 5 }]),
  parseNestedJson,
  updateBranchValidator,
  updateBranch
)
  .delete(protect , allowTo("admin","superAdmin"), deleteBranch);

export default router;

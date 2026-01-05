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
import { protect } from "../middlewares/authMiddleware.js";
import parseNestedJson from "../middlewares/ParseNestedDot.js";
import upload from "../middlewares/uploadMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router
  .route("/").post(
  protect,
  requirePermission("branches", "create"),
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
  requirePermission("branches", "update"),
  upload({ folder: "branches" }).fields([{ name: "images", maxCount: 5 }]),
  parseNestedJson,
  updateBranchValidator,
  updateBranch
)
  .delete(protect , requirePermission("branches", "delete"), deleteBranch);

export default router;

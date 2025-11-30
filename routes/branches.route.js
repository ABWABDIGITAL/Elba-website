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

const router = express.Router();

router
  .route("/")
  .post(protect, allowTo("admin"),createBranchValidator, createBranch)
  .get(protect,getBranches);

router
  .route("/:id")
  .get(protect ,getBranch)
  .put(protect, allowTo("admin"),updateBranchValidator, updateBranch)
  .delete(protect , allowTo("admin"), deleteBranch);

export default router;

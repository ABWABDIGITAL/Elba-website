import express from "express";
import {
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser
} from "../controllers/user.controller.js";

import { protect,allowTo } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/", protect,allowTo("admin","superAdmin"),adminGetAllUsers);
router.get("/:id",  protect,allowTo("admin","superAdmin"),adminGetUserById);
router.put("/:id",  protect,allowTo("admin","superAdmin"),adminUpdateUser);
router.delete("/:id",  protect,allowTo("admin","superAdmin"),adminDeleteUser);

export default router;

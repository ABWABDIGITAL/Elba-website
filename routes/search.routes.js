import express from "express";
import { vectorSearchController } from "../controllers/search.controller.js";

const router = express.Router();

router.post("/search", vectorSearchController);

export default router;

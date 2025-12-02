// routes/favorite.route.js
import express from "express";
import { toggleFavoriteController, getUserFavoritesController } from "../controllers/favorite.controller.js";
import { protect} from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /favorites/:sku/toggle
router.post("/favorites/:sku/toggle", protect, toggleFavoriteController);

// GET /favorites
router.get("/favorites", protect, getUserFavoritesController);

export default router;

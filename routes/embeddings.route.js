import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import {
  statusController,
  syncAllController,
  embedSingleController,
  forceSyncController,
} from "../controllers/embeddings.controller.js";

const router = express.Router();

// All endpoints require admin authentication

// Get embedding coverage stats
router.get(
  "/status",
  protect,
  requirePermission("embeddings", "read"),
  statusController
);

// Sync embeddings for products without them
router.post(
  "/sync-all",
  protect,
  requirePermission("embeddings", "create"),
  syncAllController
);

// Re-embed a single product
router.post(
  "/products/:productId",
  protect,
  requirePermission("embeddings", "update"),
  embedSingleController
);

// Force re-embed all active products
router.post(
  "/force-sync",
  protect,
  requirePermission("embeddings", "create"),
  forceSyncController
);

export default router;

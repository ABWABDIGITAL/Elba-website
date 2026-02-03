import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import {
  getStatsController,
  getTicketsController,
  getTicketByIdController,
  updateTicketController,
  confirmResolutionController,
  addAgentNoteController,
  getMyTicketsController,
} from "../controllers/ticket.controller.js";

const router = express.Router();

// =================== USER ROUTES (require authentication) ===================

// Get user's own tickets
router.get("/my", protect, getMyTicketsController);

// Customer confirms resolution
router.post("/:ticketId/confirm", protect, confirmResolutionController);

// =================== ADMIN ROUTES (require auth + permissions) ===================

// Dashboard stats
router.get(
  "/stats",
  protect,
  requirePermission("tickets", "read"),
  getStatsController
);

// Get all tickets (paginated with filters)
router.get(
  "/",
  protect,
  requirePermission("tickets", "read"),
  getTicketsController
);

// Get single ticket
router.get(
  "/:ticketId",
  protect,
  requirePermission("tickets", "read"),
  getTicketByIdController
);

// Update ticket (status, priority, assignment)
router.patch(
  "/:ticketId",
  protect,
  requirePermission("tickets", "update"),
  updateTicketController
);

// Add agent note
router.post(
  "/:ticketId/notes",
  protect,
  requirePermission("tickets", "update"),
  addAgentNoteController
);

export default router;

import express from "express";
import { getTicketsController, getTicketByIdController, updateTicketController, confirmResolutionController, getStatsController } from "../controllers/ticket.controller.js";

const router = express.Router();

// Get dashboard stats
router.get("/stats", getStatsController);

// Get tickets
router.get("/", getTicketsController);
// Get single ticket
router.get("/:ticketId", getTicketByIdController);

// Update ticket
router.patch("/:ticketId", updateTicketController);       

// Customer confirms resolution
router.post("/:ticketId/confirm", confirmResolutionController);

export default router;
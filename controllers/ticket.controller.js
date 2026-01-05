import {
  getTickets,
  getTicketById,
  updateTicket,
  confirmResolution,
  getStats
} from "../services/ticket.services.js";

// Get dashboard stats
export const getStatsController = async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, msg: "Dashboard stats retrieved", data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get tickets
export const getTicketsController = async (req, res) => {
  try {
    const tickets = await getTickets({
      status: req.query.status,
      priority: req.query.priority,
      aiResolved: req.query.aiResolved === "true" ? true : req.query.aiResolved === "false" ? false : undefined,
      isRepeatIssue: req.query.repeat === "true"
    });
    res.json({ success: true, msg: "Tickets retrieved", data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single ticket
export const getTicketByIdController = async (req, res) => {
  try {
    const ticket = await getTicketById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, msg: "Ticket retrieved", data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update ticket
export const updateTicketController = async (req, res) => {
  try {
    const ticket = await updateTicket(req.params.ticketId, req.body);
    res.json({ success: true, msg: "Ticket updated", data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Customer confirms resolution
export const confirmResolutionController = async (req, res) => {
  try {
    const { resolved, feedback } = req.body;
    const ticket = await confirmResolution(req.params.ticketId, resolved, feedback);
    res.json({ success: true, msg: "Resolution confirmed", data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

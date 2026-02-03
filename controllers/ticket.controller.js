import {
  getTickets,
  getTicketById,
  updateTicket,
  confirmResolution,
  getStats,
  getCustomerTicketsWithPagination,
  addAgentNote,
} from "../services/ticket.services.js";

// ============================================================
// USER ENDPOINTS
// ============================================================

// GET /api/v1/tickets/my
export const getMyTicketsController = async (req, res, next) => {
  try {
    const { tickets, pagination } = await getCustomerTicketsWithPagination(
      req.user._id,
      req.query
    );
    res.json({
      status: "success",
      message: "Your tickets",
      data: { tickets, pagination },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/tickets/:ticketId/confirm
export const confirmResolutionController = async (req, res, next) => {
  try {
    const { resolved, feedback } = req.body;
    const ticket = await confirmResolution(
      req.params.ticketId,
      resolved,
      feedback
    );
    if (!ticket) {
      return res.status(404).json({
        status: "error",
        message: "Ticket not found",
      });
    }
    res.json({
      status: "success",
      message: "Resolution confirmed",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// GET /api/v1/tickets/stats
export const getStatsController = async (req, res, next) => {
  try {
    const stats = await getStats();
    res.json({
      status: "success",
      message: "Dashboard stats retrieved",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/tickets
export const getTicketsController = async (req, res, next) => {
  try {
    const { tickets, pagination } = await getTickets(
      {
        status: req.query.status,
        priority: req.query.priority,
        category: req.query.category,
        aiResolved:
          req.query.aiResolved === "true"
            ? true
            : req.query.aiResolved === "false"
            ? false
            : undefined,
        isRepeatIssue: req.query.repeat === "true",
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      },
      req.query
    );
    res.json({
      status: "success",
      message: "Tickets retrieved",
      data: { tickets, pagination },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/tickets/:ticketId
export const getTicketByIdController = async (req, res, next) => {
  try {
    const ticket = await getTicketById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({
        status: "error",
        message: "Ticket not found",
      });
    }
    res.json({
      status: "success",
      message: "Ticket retrieved",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/tickets/:ticketId
export const updateTicketController = async (req, res, next) => {
  try {
    const ticket = await updateTicket(req.params.ticketId, req.body);
    if (!ticket) {
      return res.status(404).json({
        status: "error",
        message: "Ticket not found",
      });
    }
    res.json({
      status: "success",
      message: "Ticket updated",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/tickets/:ticketId/notes
export const addAgentNoteController = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({
        status: "error",
        message: "Note content is required",
      });
    }
    const ticket = await addAgentNote(
      req.params.ticketId,
      content,
      req.user._id
    );
    res.json({
      status: "success",
      message: "Note added",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

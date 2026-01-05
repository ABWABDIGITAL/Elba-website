import SupportTicket from "../models/ticket.model.js";

// ============================================================
// HELPERS
// ============================================================

function generateTicketId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

function detectPriority(query, supportType) {
  const q = query.toLowerCase();
  
  if ([/عاجل/, /ضروري/, /مستعجل/].some(p => p.test(q))) return "urgent";
  if ([/ما يشتغل/, /خربان/, /فلوسي/, /ما وصل/].some(p => p.test(q))) return "high";
  if (supportType === "complaint") return "high";
  
  return "medium";
}

function extractOrderNumber(query) {
  const match = query.match(/(?:رقم|طلب|#)\s*(\d{4,10})/i) || query.match(/\b(\d{6,10})\b/);
  return match ? match[1] : null;
}

function calculateSLA(priority) {
  const hours = { urgent: 2, high: 4, medium: 24, low: 48 };
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + (hours[priority] || 24));
  return deadline;
}

const CATEGORY_MAP = {
  order_tracking: "orders",
  complaint: "complaints",
  return_exchange: "returns",
  payment_issue: "billing",
  warranty: "technical",
  general_support: "general"
};

const SUBJECT_MAP = {
  order_tracking: "استفسار عن الطلب",
  complaint: "شكوى",
  return_exchange: "استرجاع/استبدال",
  payment_issue: "مشكلة دفع",
  warranty: "ضمان",
  general_support: "استفسار عام"
};

// ============================================================
// CHECK FOR REPEAT ISSUES
// ============================================================

export async function checkRepeatIssue(customerId, supportType, description) {
  if (!customerId) return { isRepeat: false, relatedTickets: [] };

  // Find similar tickets from same customer in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const similarTickets = await SupportTicket.find({
    "customer.userId": customerId,
    supportType: supportType,
    createdAt: { $gte: thirtyDaysAgo }
  })
  .sort({ createdAt: -1 })
  .limit(5)
  .select("ticketId subject status aiResolved createdAt");

  if (similarTickets.length === 0) {
    return { isRepeat: false, relatedTickets: [] };
  }

  // Check if same issue
  const relatedTickets = similarTickets.map(t => t.ticketId);
  
  return {
    isRepeat: true,
    relatedTickets,
    lastTicket: similarTickets[0],
    totalOccurrences: similarTickets.length
  };
}

// ============================================================
// CREATE TICKET (Always - for tracking)
// ============================================================

export async function createTicket({
  userQuery,
  supportType,
  customerInfo = {},
  threadId,
  conversationHistory = [],
  aiResponse,
  aiResolved = false,
  aiConfidenceLevel = "medium",
  escalationReason = null
}) {
  const priority = detectPriority(userQuery, supportType);
  const customerId = customerInfo.userId || null;

  // Check for repeat issues
  const repeatCheck = await checkRepeatIssue(customerId, supportType, userQuery);

  const ticket = new SupportTicket({
    ticketId: generateTicketId(),

    customer: {
      userId: customerId,
      name: customerInfo.name || null,
      email: customerInfo.email || null,
      phone: customerInfo.phone || null
    },

    category: CATEGORY_MAP[supportType] || "general",
    supportType,
    subject: SUBJECT_MAP[supportType] || "طلب دعم",
    description: userQuery,
    orderNumber: extractOrderNumber(userQuery),

    // AI Resolution Info
    aiResolved,
    aiResponse,
    aiConfidenceLevel,
    needsHumanReview: !aiResolved,
    escalationReason,

    // Status based on AI resolution
    status: aiResolved ? "ai_resolved" : "open",
    priority: aiResolved ? "low" : priority,
    slaDeadline: aiResolved ? null : calculateSLA(priority),

    // Resolution info if AI solved
    resolvedAt: aiResolved ? new Date() : null,
    resolvedBy: aiResolved ? "ai" : null,

    // Chat context
    chatHistory: conversationHistory.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date()
    })),
    chatThreadId: threadId,

    // Repeat issue tracking
    isRepeatIssue: repeatCheck.isRepeat,
    relatedTickets: repeatCheck.relatedTickets,
    originalTicketId: repeatCheck.isRepeat ? repeatCheck.lastTicket?.ticketId : null
  });

  // If repeat issue and not resolved before, increase priority
  if (repeatCheck.isRepeat && repeatCheck.totalOccurrences >= 2) {
    ticket.priority = "high";
    ticket.needsHumanReview = true;
    ticket.escalationReason = `مشكلة متكررة - ${repeatCheck.totalOccurrences} مرات في آخر 30 يوم`;
  }

  await ticket.save();

  console.log(`✅ Ticket created: ${ticket.ticketId} | AI Resolved: ${aiResolved} | Repeat: ${repeatCheck.isRepeat}`);

  return {
    ticketId: ticket.ticketId,
    status: ticket.status,
    priority: ticket.priority,
    aiResolved: ticket.aiResolved,
    isRepeatIssue: ticket.isRepeatIssue,
    relatedTickets: ticket.relatedTickets
  };
}

// ============================================================
// CUSTOMER CONFIRMS RESOLUTION
// ============================================================

export async function confirmResolution(ticketId, isResolved, feedback = null) {
  const update = {
    customerConfirmedResolved: isResolved,
    updatedAt: new Date()
  };

  if (feedback) {
    update.customerFeedback = feedback;
  }

  // If customer says NOT resolved, reopen ticket
  if (!isResolved) {
    update.status = "open";
    update.needsHumanReview = true;
    update.escalationReason = "العميل أكد أن المشكلة لم تُحل";
    update.priority = "high";
    update.slaDeadline = calculateSLA("high");
  } else {
    update.status = "closed";
  }

  return await SupportTicket.findOneAndUpdate(
    { ticketId },
    { $set: update },
    { new: true }
  );
}

// ============================================================
// GET CUSTOMER TICKET HISTORY
// ============================================================

export async function getCustomerTickets(customerId, limit = 10) {
  return await SupportTicket.find({ "customer.userId": customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("ticketId subject status aiResolved createdAt resolvedAt");
}

// ============================================================
// DASHBOARD FUNCTIONS
// ============================================================

export async function getTickets(filters = {}) {
  const query = {};

  if (filters.status) {
    if (filters.status === "needs_review") {
      query.needsHumanReview = true;
      query.status = { $nin: ["resolved", "closed"] };
    } else {
      query.status = filters.status;
    }
  }
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.aiResolved !== undefined) query.aiResolved = filters.aiResolved;
  if (filters.isRepeatIssue) query.isRepeatIssue = true;

  return await SupportTicket
    .find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(filters.limit || 50)
    .lean();
}

export async function getTicketById(ticketId) {
  return await SupportTicket.findOne({ ticketId });
}

export async function updateTicket(ticketId, updates) {
  const updateData = { updatedAt: new Date() };

  if (updates.status) updateData.status = updates.status;
  if (updates.priority) updateData.priority = updates.priority;
  if (updates.assignedTo) {
    updateData.assignedTo = updates.assignedTo;
    updateData.assignedAt = new Date();
  }
  if (updates.agentResponse) {
    updateData.agentResponse = updates.agentResponse;
    updateData.respondedAt = new Date();
    updateData.resolvedBy = "human";
  }
  if (updates.status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  return await SupportTicket.findOneAndUpdate(
    { ticketId },
    { $set: updateData },
    { new: true }
  );
}

export async function getStats() {
  const [stats] = await SupportTicket.aggregate([
    {
      $facet: {
        total: [{ $count: "count" }],
        aiResolved: [{ $match: { aiResolved: true } }, { $count: "count" }],
        needsHumanReview: [
          { $match: { needsHumanReview: true, status: { $nin: ["resolved", "closed"] } } },
          { $count: "count" }
        ],
        repeatIssues: [{ $match: { isRepeatIssue: true } }, { $count: "count" }],
        open: [{ $match: { status: "open" } }, { $count: "count" }],
        urgent: [{ $match: { priority: "urgent", status: "open" } }, { $count: "count" }]
      }
    }
  ]);

  return {
    total: stats.total[0]?.count || 0,
    aiResolved: stats.aiResolved[0]?.count || 0,
    needsHumanReview: stats.needsHumanReview[0]?.count || 0,
    repeatIssues: stats.repeatIssues[0]?.count || 0,
    open: stats.open[0]?.count || 0,
    urgent: stats.urgent[0]?.count || 0
  };
}
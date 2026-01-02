// services/alerts.service.js

import Event from "../models/event.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import { redis } from "../config/redis.js";
import { sendEmail } from "../utlis/sendEmail.js";
import { sendWhatsAppMessage } from "../services/whatsapp.services.js";

const ALERTS_CACHE_KEY = "alerts:active";
const ALERT_HISTORY_KEY = "alerts:history";
const ALERT_RECIPIENTS = {
  ceo: process.env.CEO_EMAIL,
  marketing_head: process.env.MARKETING_HEAD_EMAIL,
  operations_head: process.env.OPERATIONS_HEAD_EMAIL,
  tech_lead: process.env.TECH_LEAD_EMAIL,
  sales_team: process.env.SALES_TEAM_EMAIL,
  customer_success: process.env.CUSTOMER_SUCCESS_EMAIL,
  finance_head: process.env.FINANCE_HEAD_EMAIL,
  procurement: process.env.PROCUREMENT_EMAIL
};

const SLACK_CHANNELS = {
  revenue: '#alerts-revenue',
  conversion: '#alerts-marketing',
  inventory: '#alerts-operations',
  customer: '#alerts-customer-success',
  operations: '#alerts-operations',
  technical: '#alerts-engineering',
  marketing: '#alerts-marketing'
};

// ============================================
// ALERT RULES CONFIGURATION
// ============================================

export const ALERT_RULES = {
  // Revenue Alerts
  revenue_drop: {
    name: "Revenue Drop Alert",
    description: "Revenue significantly below expected",
    category: "revenue",
    checkInterval: 3600000, // 1 hour
    check: async () => {
      const today = await getRevenueForPeriod('today');
      const avgLast7Days = await getRevenueForPeriod('avg_7d');
      const dropPercentage = ((avgLast7Days - today) / avgLast7Days) * 100;

      return {
        triggered: dropPercentage > 30,
        severity: dropPercentage > 50 ? 'critical' : 'warning',
        data: {
          todayRevenue: today,
          expectedRevenue: avgLast7Days,
          dropPercentage: dropPercentage.toFixed(2)
        },
        message: `Revenue is down ${dropPercentage.toFixed(1)}% compared to 7-day average`,
        actions: [
          "Check marketing campaigns",
          "Review website for technical issues",
          "Analyze traffic sources"
        ]
      };
    },
    notifications: ['slack', 'email'],
    recipients: ['ceo', 'marketing_head']
  },

  // Cart Abandonment Alerts
  high_cart_abandonment: {
    name: "High Cart Abandonment",
    description: "Cart abandonment rate above threshold",
    category: "conversion",
    checkInterval: 1800000, // 30 minutes
    check: async () => {
      const last24h = await getCartAbandonmentRate('24h');
      const avg7Days = await getCartAbandonmentRate('7d');

      return {
        triggered: last24h > 75 || (last24h - avg7Days) > 10,
        severity: last24h > 85 ? 'critical' : 'warning',
        data: {
          currentRate: last24h,
          avgRate: avg7Days,
          increase: (last24h - avg7Days).toFixed(2)
        },
        message: `Cart abandonment at ${last24h.toFixed(1)}% (avg: ${avg7Days.toFixed(1)}%)`,
        actions: [
          "Check checkout flow for issues",
          "Review payment gateway status",
          "Analyze exit points in funnel",
          "Consider sending cart recovery emails"
        ]
      };
    },
    notifications: ['slack', 'email'],
    recipients: ['marketing_head', 'tech_lead']
  },

  // Inventory Alerts
  low_stock: {
    name: "Low Stock Alert",
    description: "Products running low on inventory",
    category: "inventory",
    checkInterval: 3600000, // 1 hour
    check: async () => {
      const lowStockProducts = await Product.find({
        stock: { $lte: 10, $gt: 0 },
        status: 'active'
      }).select('en.name ar.name sku stock salesCount').lean();

      const urgentProducts = lowStockProducts.filter(p => {
        const daysOfStock = p.stock / (p.salesCount / 30 || 1);
        return daysOfStock < 7;
      });

      return {
        triggered: urgentProducts.length > 0,
        severity: urgentProducts.length > 5 ? 'critical' : 'warning',
        data: {
          totalLowStock: lowStockProducts.length,
          urgentCount: urgentProducts.length,
          products: urgentProducts.slice(0, 10)
        },
        message: `${urgentProducts.length} products critically low on stock`,
        actions: [
          "Initiate restocking orders",
          "Consider temporary deactivation if can't restock soon"
        ]
      };
    },
    notifications: ['slack', 'email'],
    recipients: ['operations_head', 'procurement']
  },

  // Customer Alerts
  vip_at_risk: {
    name: "VIP Customer At Risk",
    description: "High-value customer showing churn signals",
    category: "customer",
    checkInterval: 86400000, // Daily
    check: async () => {
      const atRiskVIPs = await identifyAtRiskVIPs();

      return {
        triggered: atRiskVIPs.length > 0,
        severity: 'critical',
        data: {
          count: atRiskVIPs.length,
          customers: atRiskVIPs.map(c => ({
            id: c._id,
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            phone: c.phone,
            tier: c.vipTier,
            totalSpent: c.totalSpent,
            lastOrderDays: c.daysSinceLastOrder
          }))
        },
        message: `${atRiskVIPs.length} VIP customers showing churn risk`,
        actions: [
          "Personal outreach recommended",
          "Consider exclusive offer",
          "Investigate any recent issues"
        ]
      };
    },
    notifications: ['slack', 'email'],
    recipients: ['sales_head', 'customer_success'],
    automations: ['vip_winback_campaign']
  },

  // Operational Alerts
  orders_pending_too_long: {
    name: "Orders Pending Too Long",
    description: "Orders not processed within SLA",
    category: "operations",
    checkInterval: 1800000, // 30 minutes
    check: async () => {
      const slaHours = 24;
      const overdueOrders = await Order.find({
        status: 'pending',
        createdAt: {
          $lt: new Date(Date.now() - slaHours * 60 * 60 * 1000)
        }
      }).select('orderNumber totalAmount createdAt user').populate('user', 'firstName lastName email');

      return {
        triggered: overdueOrders.length > 0,
        severity: overdueOrders.length > 10 ? 'critical' : 'warning',
        data: {
          count: overdueOrders.length,
          orders: overdueOrders.slice(0, 10).map(o => ({
            orderNumber: o.orderNumber,
            customer: `${o.user?.firstName} ${o.user?.lastName}`,
            amount: o.totalAmount,
            hoursOverdue: Math.round((Date.now() - o.createdAt) / 3600000)
          }))
        },
        message: `${overdueOrders.length} orders pending over ${slaHours} hours`,
        actions: [
          "Investigate processing bottleneck",
          "Prioritize oldest orders",
          "Consider customer communication"
        ]
      };
    },
    notifications: ['slack', 'email'],
    recipients: ['operations_head', 'fulfillment_team']
  },

  // Marketing Alerts
  conversion_rate_drop: {
    name: "Conversion Rate Drop",
    description: "Significant drop in conversion rate",
    category: "marketing",
    checkInterval: 3600000, // 1 hour
    check: async () => {
      const today = await getConversionRate('today');
      const avg7Days = await getConversionRate('7d');
      const dropPercentage = ((avg7Days - today) / avg7Days) * 100;

      return {
        triggered: dropPercentage > 25,
        severity: dropPercentage > 50 ? 'critical' : 'warning',
        data: {
          currentRate: today,
          avgRate: avg7Days,
          dropPercentage
        },
        message: `Conversion rate down ${dropPercentage.toFixed(1)}% (${today.toFixed(2)}% vs ${avg7Days.toFixed(2)}%)`,
        actions: [
          "Check website for technical issues",
          "Review traffic quality",
          "Analyze funnel for new drop-offs"
        ]
      };
    },
    notifications: ['slack'],
    recipients: ['marketing_head', 'tech_lead']
  }
};

// ============================================
// ALERT PROCESSING ENGINE
// ============================================

export const processAlerts = async () => {
  const results = [];

  for (const [alertId, rule] of Object.entries(ALERT_RULES)) {
    try {
      const result = await rule.check();

      if (result.triggered) {
        const alert = {
          id: `${alertId}_${Date.now()}`,
          alertType: alertId,
          name: rule.name,
          category: rule.category,
          severity: result.severity,
          message: result.message,
          data: result.data,
          actions: result.actions,
          createdAt: new Date(),
          acknowledged: false
        };

        // Store alert
        await storeAlert(alert);

        // Send notifications
        await sendAlertNotifications(alert, rule);

        // Trigger automations
        if (rule.automations) {
          await triggerAutomations(rule.automations, result.data);
        }

        results.push(alert);
      }
    } catch (error) {
      console.error(`Error processing alert ${alertId}:`, error);
    }
  }

  return results;
};

// ============================================
// ALERT STORAGE
// ============================================

const storeAlert = async (alert) => {
  // Add to active alerts
  await redis.zadd(ALERTS_CACHE_KEY, Date.now(), JSON.stringify(alert));

  // Keep only last 100 alerts
  await redis.zremrangebyrank(ALERTS_CACHE_KEY, 0, -101);

  // Add to history
  await redis.lpush(ALERT_HISTORY_KEY, JSON.stringify(alert));
  await redis.ltrim(ALERT_HISTORY_KEY, 0, 999);
};

// ============================================
// NOTIFICATION HANDLERS
// ============================================

const sendAlertNotifications = async (alert, rule) => {
  const notifications = rule.notifications || ['slack'];

  for (const channel of notifications) {
    try {
      switch (channel) {
        case 'slack':
          await sendSlackNotification({
            channel: getSlackChannel(alert.category),
            text: formatSlackAlert(alert)
          });
          break;

        case 'email':
          const recipients = await getRecipientEmails(rule.recipients);
          await sendEmail({
            to: recipients,
            subject: `[${alert.severity.toUpperCase()}] ${alert.name}`,
            html: formatEmailAlert(alert)
          });
          break;

        case 'sms':
          const phones = await getRecipientPhones(rule.recipients);
          for (const phone of phones) {
            await sendWhatsAppMessage(phone, formatSMSAlert(alert));
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
    }
  }
};

// ============================================
// FORMATTERS
// ============================================

const formatSlackAlert = (alert) => {
  const severityEmoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${severityEmoji[alert.severity]} ${alert.name}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: alert.message
        }
      },
      {
        type: "section",
        fields: Object.entries(alert.data).slice(0, 6).map(([key, value]) => ({
          type: "mrkdwn",
          text: `*${key}:*\n${typeof value === 'object' ? JSON.stringify(value) : value}`
        }))
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Recommended Actions:*\n${alert.actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Category: ${alert.category} | Time: ${new Date().toISOString()}`
          }
        ]
      }
    ]
  };
};

const formatEmailAlert = (alert) => {
  const severityColors = {
    critical: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8'
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${alert.name}</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">${alert.severity.toUpperCase()} Alert</p>
      </div>

      <div style="padding: 20px; background: #f9f9f9; border: 1px solid #ddd;">
        <p style="font-size: 16px; color: #333;">${alert.message}</p>

        <h3 style="color: #555;">Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${Object.entries(alert.data)
            .filter(([_, v]) => typeof v !== 'object')
            .map(([k, v]) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${k}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${v}</td>
              </tr>
            `).join('')}
        </table>

        <h3 style="color: #555;">Recommended Actions</h3>
        <ol style="color: #333;">
          ${alert.actions.map(a => `<li style="margin-bottom: 8px;">${a}</li>`).join('')}
        </ol>
      </div>

      <div style="padding: 15px; background: #333; color: #aaa; text-align: center; border-radius: 0 0 8px 8px;">
        <small>Alert generated at ${new Date().toISOString()}</small>
      </div>
    </div>
  `;
};

const formatSMSAlert = (alert) => {
  return `${alert.severity.toUpperCase()} ALERT: ${alert.name}\n\n${alert.message}\n\n${alert.actions[0]}`;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getSlackChannel = (category) => {
  return SLACK_CHANNELS[category] || '#alerts-general';
};

const getRecipientEmails = async (roles) => {
  return roles.map(r => ALERT_RECIPIENTS[r]).filter(Boolean);
};

const getRecipientPhones = async (roles) => {
  // In a real implementation, you would fetch phone numbers from user profiles
  // For now, return empty array
  return [];
};

// ============================================
// AUTOMATION TRIGGERS
// ============================================

const triggerAutomations = async (automationIds, data) => {
  // This would integrate with your automation service
  // For now, just log the automation trigger
  console.log(`Triggering automations: ${automationIds.join(', ')} with data:`, data);
};

// ============================================
// METRIC HELPERS
// ============================================

const getRevenueForPeriod = async (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    case 'avg_7d':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $nin: ["cancelled", "refunded"] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalAmount" }
      }
    }
  ]);

  return result[0]?.total || 0;
};

const getCartAbandonmentRate = async (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const [cartsCreated, ordersPlaced] = await Promise.all([
    Event.distinct("sessionId", {
      eventName: "product_added_to_cart",
      timestamp: { $gte: startDate }
    }),
    Event.distinct("sessionId", {
      eventName: "order_placed",
      timestamp: { $gte: startDate }
    })
  ]);

  const abandoned = cartsCreated.filter(s => !ordersPlaced.includes(s)).length;
  const rate = cartsCreated.length > 0 ? (abandoned / cartsCreated.length) * 100 : 0;

  return rate;
};

const getConversionRate = async (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const [sessions, orders] = await Promise.all([
    Event.distinct("sessionId", {
      eventName: "session_start",
      timestamp: { $gte: startDate }
    }),
    Event.distinct("sessionId", {
      eventName: "order_placed",
      timestamp: { $gte: startDate }
    })
  ]);

  return sessions.length > 0 ? ((orders.length / sessions.length) * 100).toFixed(2) : 0;
};

const identifyAtRiskVIPs = async () => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const oneEightyDaysAgo = new Date();
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  const atRiskVIPs = await User.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders"
      }
    },
    {
      $match: {
        "orders.0": { $exists: true }
      }
    },
    {
      $addFields: {
        lastOrderDate: { $max: "$orders.createdAt" },
        orderCount: { $size: "$orders" },
        totalSpent: { $sum: "$orders.totalAmount" }
      }
    },
    {
      $match: {
        $or: [
          { totalSpent: { $gte: 10000 } },
          { totalSpent: { $gte: 5000 } },
          { totalSpent: { $gte: 2000 } },
          { orderCount: { $gte: 15 } },
          { orderCount: { $gte: 8 } },
          { orderCount: { $gte: 4 } }
        ],
        lastOrderDate: { $lt: sixtyDaysAgo, $gte: oneEightyDaysAgo }
      }
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        lastOrderDate: 1,
        orderCount: 1,
        totalSpent: 1,
        daysSinceLastOrder: {
          $divide: [
            { $subtract: [new Date(), "$lastOrderDate"] },
            1000 * 60 * 60 * 24
          ]
        },
        vipTier: {
          $switch: {
            branches: [
              {
                case: { $or: [{ $gte: ["$totalSpent", 10000] }, { $gte: ["$orderCount", 15] }] },
                then: "platinum"
              },
              {
                case: { $or: [{ $gte: ["$totalSpent", 5000] }, { $gte: ["$orderCount", 8] }] },
                then: "gold"
              },
              {
                case: { $or: [{ $gte: ["$totalSpent", 2000] }, { $gte: ["$orderCount", 4] }] },
                then: "silver"
              },
              {
                case: { $or: [{ $gte: ["$totalSpent", 500] }, { $gte: ["$orderCount", 2] }] },
                then: "bronze"
              }
            ],
            default: "none"
          }
        }
      }
    },
    { $sort: { daysSinceLastOrder: -1 } },
    { $limit: 50 }
  ]);

  return atRiskVIPs;
};
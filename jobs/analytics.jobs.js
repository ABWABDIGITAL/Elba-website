// jobs/analytics.jobs.js

import cron from 'node-cron';
import { processAlerts } from '../services/alerts.service.js';
import { automationEngine } from '../services/automation.service.js';
import { calculateRFMScores } from '../services/rfm.service.js';
import { redis } from '../config/redis.js';
import Event from '../models/event.model.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';

/**
 * Initialize all scheduled jobs
 */
export const initializeJobs = () => {
  // Process alerts every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running alert processing...');
    try {
      const alerts = await processAlerts();
      console.log(`Processed ${alerts.length} alerts`);
    } catch (error) {
      console.error('Alert processing failed:', error);
    }
  });

  // Process scheduled automations every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = Date.now();

      // Get due jobs from Redis
      const dueJobs = await redis.zrangebyscore(
        'automation:scheduled_jobs',
        0,
        now
      );

      for (const jobData of dueJobs) {
        try {
          const { workflow, automationId } = JSON.parse(jobData);
          const automation = AUTOMATIONS[automationId];

          // Check stop conditions
          const shouldStop = await automationEngine.checkStopConditions(workflow, automation);

          if (!shouldStop) {
            await automationEngine.executeStep(workflow, automation);
          } else {
            await automationEngine.completeWorkflow(workflow);
          }

          // Remove processed job
          await redis.zrem('automation:scheduled_jobs', jobData);
        } catch (error) {
          console.error('Error processing scheduled job:', error);
        }
      }
    } catch (error) {
      console.error('Automation scheduler failed:', error);
    }
  });

  // Check for abandoned carts every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find sessions with cart activity but no purchase
      const cartSessions = await Event.aggregate([
        {
          $match: {
            eventName: "product_added_to_cart",
            timestamp: { $gte: oneDayAgo, $lte: oneHourAgo }
          }
        },
        {
          $group: {
            _id: "$sessionId",
            userId: { $first: "$userId" },
            lastActivity: { $max: "$timestamp" },
            cartValue: { $max: "$cart.totalValue" },
            itemCount: { $max: "$cart.itemCount" }
          }
        },
        {
          $lookup: {
            from: "events",
            let: { sessionId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$sessionId", "$$sessionId"] },
                      { $eq: ["$eventName", "order_placed"] }
                    ]
                  }
                }
              }
            ],
            as: "orders"
          }
        },
        {
          $match: {
            orders: { $size: 0 }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user"
          }
        },
        {
          $unwind: { path: "$user", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            sessionId: "$_id",
            userId: 1,
            email: "$user.email",
            phone: "$user.phone",
            firstName: "$user.firstName",
            lastActivity: 1,
            cartValue: 1,
            itemCount: 1,
            hoursSinceActivity: {
              $divide: [{ $subtract: [new Date(), "$lastActivity"] }, 3600000]
            }
          }
        },
        { $sort: { cartValue: -1 } },
        { $limit: 100 }
      ]);

      // Trigger cart recovery for high-value abandoned carts
      for (const cart of cartSessions) {
        if (cart.cartValue >= 100) {
          await automationEngine.triggerWorkflow('cart_recovery_email', cart.userId, {
            cartId: cart.sessionId,
            cartItems: cart.itemCount,
            cartTotal: cart.cartValue
          });
        }
      }
    } catch (error) {
      console.error('Abandoned cart check failed:', error);
    }
  });

  // Calculate RFM scores every Sunday at 2 AM
  cron.schedule('0 2 * * 0', async () => {
    console.log('Recalculating RFM scores...');
    try {
      const scores = await calculateRFMScores();
      console.log(`Updated RFM scores for ${scores.length} customers`);
    } catch (error) {
      console.error('RFM scoring failed:', error);
    }
  });

  // Check for VIP at risk users daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      const atRiskVIPs = await identifyAtRiskVIPs();
      if (atRiskVIPs.length > 0) {
        console.log(`Found ${atRiskVIPs.length} at-risk VIPs`);
      }
    } catch (error) {
      console.error('VIP at-risk check failed:', error);
    }
  });

  console.log('✅ All analytics jobs initialized');
};

// Helper function to identify at-risk VIPs
const identifyAtRiskVIPs = async () => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const oneEightyDaysAgo = new Date();
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  return await User.aggregate([
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
};
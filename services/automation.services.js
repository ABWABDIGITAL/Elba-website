// services/automation.service.js

import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Event from "../models/event.model.js";
import { sendEmail } from "../utlis/sendEmail.js";
import { sendWhatsAppMessage } from "../services/whatsapp.services.js";
import { redis } from "../config/redis.js";

/**
 * AUTOMATION WORKFLOWS
 */
export const AUTOMATIONS = {
  // Cart Recovery
  cart_recovery_email: {
    name: "Cart Recovery Email Sequence",
    trigger: "cart_abandoned",
    conditions: {
      cartValue: { $gte: 100 },
      userHasEmail: true,
      notPurchasedWithin: 3600000 // 1 hour
    },
    sequence: [
      {
        delay: 3600000, // 1 hour
        action: "send_email",
        template: "cart_reminder_1",
        subject: "You left something behind! 🛒",
        variables: ["firstName", "cartItems", "cartTotal", "cartLink"]
      },
      {
        delay: 86400000, // 24 hours
        action: "send_email",
        template: "cart_reminder_2",
        subject: "Your cart is waiting - 10% off inside!",
        variables: ["firstName", "cartItems", "cartTotal", "discountCode", "cartLink"],
        offerDiscount: 10
      },
      {
        delay: 259200000, // 72 hours
        action: "send_email",
        template: "cart_reminder_final",
        subject: "Last chance: Items selling fast!",
        variables: ["firstName", "cartItems", "urgencyMessage", "cartLink"]
      }
    ],
    stopConditions: ["order_placed", "cart_updated", "unsubscribed"]
  },

  // Welcome Sequence
  welcome_sequence: {
    name: "New User Welcome Sequence",
    trigger: "user_registered",
    sequence: [
      {
        delay: 0, // Immediate
        action: "send_email",
        template: "welcome_email",
        subject: "Welcome to [Store Name]! 🎉",
        variables: ["firstName", "welcomeDiscount"]
      },
      {
        delay: 86400000, // Day 1
        action: "send_email",
        template: "onboarding_browse",
        subject: "Discover our top categories",
        variables: ["firstName", "topCategories", "personalizedProducts"]
      },
      {
        delay: 259200000, // Day 3
        condition: { hasNotPurchased: true },
        action: "send_email",
        template: "onboarding_first_purchase",
        subject: "Your exclusive first-order discount! 15% off",
        variables: ["firstName", "discountCode"],
        offerDiscount: 15
      },
      {
        delay: 604800000, // Day 7
        condition: { hasNotPurchased: true },
        action: "send_email",
        template: "onboarding_last_chance",
        subject: "Don't miss out - your discount expires soon!",
        variables: ["firstName", "discountCode", "expiryDate"]
      }
    ],
    stopConditions: ["order_placed", "unsubscribed"]
  },

  // VIP Winback
  vip_winback_campaign: {
    name: "VIP Winback Campaign",
    trigger: "vip_at_risk",
    conditions: {
      daysSinceLastOrder: { $gte: 60 },
      vipTier: { $in: ["platinum", "gold"] }
    },
    sequence: [
      {
        delay: 0,
        action: "send_email",
        template: "vip_miss_you",
        subject: "We miss you! Here's something special...",
        variables: ["firstName", "lastPurchaseDate", "exclusiveOffer"],
        offerDiscount: 25
      },
      {
        delay: 259200000, // 3 days
        condition: { hasNotPurchased: true },
        action: "send_whatsapp",
        template: "vip_personal_outreach",
        message: "Hi {{firstName}}, this is {{agentName}} from [Store]. We noticed you haven't shopped with us lately. Is there anything I can help with? Your exclusive 25% discount is waiting!"
      }
    ],
    stopConditions: ["order_placed"]
  }
};

/**
 * Automation Engine
 */
export class AutomationEngine {
  constructor() {
    this.runningWorkflows = new Map();
  }

  /**
   * Trigger automation workflow
   */
  async triggerWorkflow(automationId, userId, contextData = {}) {
    const automation = AUTOMATIONS[automationId];
    if (!automation) {
      console.error(`Automation ${automationId} not found`);
      return;
    }

    // Check if user already in this workflow
    const workflowKey = `automation:${automationId}:${userId}`;
    const existing = await redis.get(workflowKey);
    if (existing) {
      console.log(`User ${userId} already in workflow ${automationId}`);
      return;
    }

    // Check conditions
    if (automation.conditions) {
      const meetsConditions = await this.checkConditions(userId, automation.conditions);
      if (!meetsConditions) return;
    }

    // Start workflow
    const workflow = {
      automationId,
      userId,
      startedAt: new Date(),
      currentStep: 0,
      contextData
    };

    await redis.set(workflowKey, JSON.stringify(workflow), { ex: 2592000 }); // 30 days TTL

    // Execute first step
    await this.executeStep(workflow, automation);
  }

  /**
   * Execute workflow step
   */
  async executeStep(workflow, automation) {
    const step = automation.sequence[workflow.currentStep];
    if (!step) {
      // Workflow complete
      await this.completeWorkflow(workflow);
      return;
    }

    // Check step conditions
    if (step.condition) {
      const meetsCondition = await this.checkStepCondition(workflow.userId, step.condition);
      if (!meetsCondition) {
        // Skip to next step
        workflow.currentStep++;
        await this.executeStep(workflow, automation);
        return;
      }
    }

    // Schedule or execute action
    if (step.delay > 0) {
      await this.scheduleStep(workflow, automation, step.delay);
    } else {
      await this.executeAction(workflow, step);

      // Move to next step
      workflow.currentStep++;
      const workflowKey = `automation:${workflow.automationId}:${workflow.userId}`;
      await redis.set(workflowKey, JSON.stringify(workflow), { ex: 2592000 });

      // Continue to next step
      await this.executeStep(workflow, automation);
    }
  }

  /**
   * Execute action (send email, WhatsApp, etc.)
   */
  async executeAction(workflow, step) {
    const user = await User.findById(workflow.userId);
    if (!user) return;

    const variables = await this.resolveVariables(step.variables, user, workflow.contextData);

    switch (step.action) {
      case 'send_email':
        await sendEmail({
          to: user.email,
          subject: this.interpolate(step.subject, variables),
          template: step.template,
          data: variables
        });
        break;

      case 'send_whatsapp':
        await sendWhatsAppMessage(
          user.phone,
          this.interpolate(step.message, variables)
        );
        break;
    }

    // Log action
    await this.logAction(workflow, step);
  }

  /**
   * Schedule step for later execution
   */
  async scheduleStep(workflow, automation, delay) {
    const executeAt = Date.now() + delay;
    const jobData = {
      workflow,
      automationId: workflow.automationId
    };

    // Use Redis sorted set for job scheduling
    await redis.zadd(
      'automation:scheduled_jobs',
      executeAt,
      JSON.stringify(jobData)
    );
  }

  /**
   * Check stop conditions
   */
  async checkStopConditions(workflow, automation) {
    const stopConditions = automation.stopConditions || [];

    for (const condition of stopConditions) {
      switch (condition) {
        case 'order_placed':
          const recentOrder = await Order.findOne({
            user: workflow.userId,
            createdAt: { $gte: workflow.startedAt }
          });
          if (recentOrder) return true;
          break;

        case 'cart_updated':
          const cartEvent = await Event.findOne({
            userId: workflow.userId,
            eventName: 'product_added_to_cart',
            timestamp: { $gte: workflow.startedAt }
          });
          if (cartEvent) return true;
          break;

        case 'unsubscribed':
          const user = await User.findById(workflow.userId);
          if (!user?.preferences?.emailNotifications) return true;
          break;

        case 'session_started':
          const sessionEvent = await Event.findOne({
            userId: workflow.userId,
            eventName: 'session_start',
            timestamp: { $gte: new Date(Date.now() - 86400000) } // Last 24h
          });
          if (sessionEvent) return true;
          break;
      }
    }

    return false;
  }

  /**
   * Resolve template variables
   */
  async resolveVariables(variableNames, user, contextData) {
    const variables = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      ...contextData
    };

    // Add dynamic variables
    if (variableNames?.includes('cartItems')) {
      variables.cartItems = await this.getUserCartItems(user._id);
    }
    if (variableNames?.includes('cartTotal')) {
      variables.cartTotal = await this.getUserCartTotal(user._id);
    }
    if (variableNames?.includes('lastOrderDate')) {
      const lastOrder = await Order.findOne({ user: user._id }).sort({ createdAt: -1 });
      variables.lastOrderDate = lastOrder?.createdAt;
    }
    if (variableNames?.includes('personalizedProducts')) {
      variables.personalizedProducts = await this.getPersonalizedProducts(user._id);
    }

    return variables;
  }

  /**
   * Interpolate template string
   */
  interpolate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * Complete workflow
   */
  async completeWorkflow(workflow) {
    const workflowKey = `automation:${workflow.automationId}:${workflow.userId}`;
    await redis.del(workflowKey);

    // Log completion
    console.log(`Workflow ${workflow.automationId} completed for user ${workflow.userId}`);
  }

  /**
   * Log action for analytics
   */
  async logAction(workflow, step) {
    await Event.create({
      eventName: 'automation_action_executed',
      eventCategory: 'system',
      userId: workflow.userId,
      properties: {
        automationId: workflow.automationId,
        step: workflow.currentStep,
        action: step.action,
        template: step.template
      }
    });
  }

  /**
   * Check conditions for workflow
   */
  async checkConditions(userId, conditions) {
    const user = await User.findById(userId);
    if (!user) return false;

    // Check cart value condition
    if (conditions.cartValue) {
      const cart = await this.getUserCart(userId);
      if (!cart || cart.totalValue < conditions.cartValue.$gte) {
        return false;
      }
    }

    // Check user has email
    if (conditions.userHasEmail && !user.email) {
      return false;
    }

    // Check VIP tier
    if (conditions.vipTier) {
      const segment = await calculateUserSegment(userId);
      if (!conditions.vipTier.$in.includes(segment.vipTier?.id)) {
        return false;
      }
    }

    // Check days since last order
    if (conditions.daysSinceLastOrder) {
      const lastOrder = await Order.findOne({ user: userId }).sort({ createdAt: -1 });
      if (!lastOrder) return false;

      const daysSinceLastOrder = (new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24);
      if (daysSinceLastOrder < conditions.daysSinceLastOrder.$gte) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check step conditions
   */
  async checkStepCondition(userId, condition) {
    if (condition.hasNotPurchased) {
      const recentOrder = await Order.findOne({
        user: userId,
        createdAt: { $gte: new Date(Date.now() - 86400000) } // Last 24h
      });
      return !recentOrder;
    }

    return true;
  }

  /**
   * Helper: Get user cart
   */
  async getUserCart(userId) {
    // In a real implementation, you would fetch the user's cart
    // This is a simplified version
    const cartEvent = await Event.findOne({
      userId,
      eventName: 'product_added_to_cart'
    }).sort({ timestamp: -1 });

    return cartEvent?.cart || null;
  }

  /**
   * Helper: Get user cart items
   */
  async getUserCartItems(userId) {
    const cartEvents = await Event.find({
      userId,
      eventName: 'product_added_to_cart'
    }).sort({ timestamp: -1 }).limit(10);

    return cartEvents.map(e => ({
      productId: e.product.productId,
      name: e.product.name,
      quantity: e.product.quantity,
      price: e.product.price
    }));
  }

  /**
   * Helper: Get user cart total
   */
  async getUserCartTotal(userId) {
    const cartEvent = await Event.findOne({
      userId,
      eventName: 'product_added_to_cart'
    }).sort({ timestamp: -1 });

    return cartEvent?.cart?.totalValue || 0;
  }

  /**
   * Helper: Get personalized products
   */
  async getPersonalizedProducts(userId) {
    // In a real implementation, you would use recommendation algorithms
    // This is a simplified version
    const viewedProducts = await Event.find({
      userId,
      eventName: 'product_viewed'
    }).sort({ timestamp: -1 }).limit(5);

    return viewedProducts.map(e => ({
      productId: e.product.productId,
      name: e.product.name,
      price: e.product.price
    }));
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine();
// validators/payment.validator.js
import Joi from "joi";
import mongoose from "mongoose";
import { BadRequest } from "../utlis/apiError.js";

// ═══════════════════════════════════════════════════════════════
// 📝 VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Custom ObjectId validator
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

// Initiate payment request schema
const initiatePaymentSchema = Joi.object({
  orderId: Joi.string()
    .required()
    .custom(objectIdValidator)
    .messages({
      "any.required": "Order ID is required",
      "any.invalid": "Invalid order ID format",
      "string.empty": "Order ID cannot be empty",
    }),
});

// Webhook payload schema (based on MyFatoorah structure)
const webhookPayloadSchema = Joi.object({
  Event: Joi.string()
    .required()
    .messages({
      "any.required": "Event type is required",
    }),
  
  EventId: Joi.number().optional(),
  
  Data: Joi.object({
    InvoiceId: Joi.number()
      .required()
      .messages({
        "any.required": "Invoice ID is required",
      }),
    
    InvoiceStatus: Joi.string()
      .required()
      .valid("Paid", "Pending", "Failed", "Expired", "Canceled")
      .messages({
        "any.required": "Invoice status is required",
        "any.only": "Invalid invoice status",
      }),
    
    UserDefinedField: Joi.string()
      .required()
      .messages({
        "any.required": "User defined field (Order ID) is required",
      }),
    
    InvoiceValue: Joi.number()
      .positive()
      .optional(),
    
    TransactionId: Joi.string().optional(),
    CustomerReference: Joi.string().optional(),
    CreatedDate: Joi.string().optional(),
    PaidDate: Joi.string().optional(),
    
  }).required().unknown(true), // Allow additional fields
  
}).unknown(true); // Allow additional top-level fields

// ═══════════════════════════════════════════════════════════════
// 🔍 VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

export const validateInitiatePayment = (req, res, next) => {
  const { error, value } = initiatePaymentSchema.validate(req.body, {
    abortEarly: false,    // Return all errors
    stripUnknown: true,   // Remove unknown fields
  });
  
  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    
    return next(BadRequest(errorMessage));
  }
  
  // Replace body with validated/sanitized values
  req.body = value;
  next();
};

export const validateWebhookPayload = (req, res, next) => {
  const { error, value } = webhookPayloadSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,  // Keep all fields for processing
  });
  
  if (error) {
    console.error("Webhook validation failed:", error.details);
    
    // Don't reveal validation details to external caller
    return res.status(400).json({ message: "Invalid payload" });
  }
  
  next();
};

// ═══════════════════════════════════════════════════════════════
// 🔧 ADDITIONAL VALIDATORS (Optional)
// ═══════════════════════════════════════════════════════════════

export const validateRefundRequest = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string()
      .required()
      .custom(objectIdValidator),
    
    reason: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        "string.min": "Refund reason must be at least 10 characters",
        "string.max": "Refund reason must be less than 500 characters",
      }),
    
    amount: Joi.number()
      .positive()
      .optional(), // If not provided, full refund
  });
  
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  
  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    
    return next(BadRequest(errorMessage));
  }
  
  req.body = value;
  next();
};
import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const sendMessageValidator = [
  param("sessionId").notEmpty().withMessage("Session ID is required"),
  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .isString()
    .withMessage("Message must be a string")
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message must be between 1 and 2000 characters"),
  validatorMiddleware,
];

export const sessionIdValidator = [
  param("sessionId")
    .notEmpty()
    .withMessage("Session ID is required")
    .matches(/^CHAT-/)
    .withMessage("Invalid session ID format"),
  validatorMiddleware,
];

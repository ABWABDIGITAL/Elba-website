// validators/auth.validators.js

import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import User from "../models/user.model.js";

/* ---------------------------------------
   REGISTER VALIDATOR (Correct)
---------------------------------------- */
export const validateRegister = [
  body("name")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3, max: 50 }),

  body("email")
    .notEmpty().isEmail()
    .withMessage("Valid email required")
    .bail()
    .custom(async (email) => {
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) throw new Error("Email already registered");
      return true;
    }),

  body("password")
    .notEmpty().isLength({ min: 6 }),

  body("confirmPassword")
    .notEmpty()
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Passwords do not match");
      return true;
    }),

  body("phone")
    .notEmpty()
    .matches(/^((\+9665\d{8})|(05\d{8}))$/)
    .withMessage("Invalid Saudi phone number")
    .bail()
    .custom(async (phone) => {
      const exists = await User.findOne({ phone });
      if (exists) throw new Error("Phone already registered");
      return true;
    }),

  validatorMiddleware,
];

/* ---------------------------------------
   LOGIN VALIDATOR (PHONE ONLY)
---------------------------------------- */
export const validateLogin = [
  body("phone")
    .notEmpty().withMessage("Phone is required")
    .matches(/^((\+9665\d{8})|(05\d{8}))$/)
    .withMessage("Invalid Saudi phone number"),

  body("password")
    .notEmpty().withMessage("Password is required"),

  validatorMiddleware,
];
export const validateForgetPassword = [
  body("email")
    .notEmpty().isEmail()
    .withMessage("Valid email required"),
  validatorMiddleware,
];

export const validateVerifyReset = [
  body("email")
    .notEmpty().isEmail(),
  body("code")
    .notEmpty().isLength({ min: 6, max: 6 }),
  validatorMiddleware,
];

export const validateResetPassword = [
  body("email")
    .notEmpty().isEmail(),
  body("newPassword")
    .notEmpty().isLength({ min: 6 }),
  body("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  validatorMiddleware,
];

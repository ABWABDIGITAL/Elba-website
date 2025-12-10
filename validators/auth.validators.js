// validators/auth.validators.js

import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

/* ---------------------------------------
   REGISTER VALIDATOR (Correct)
---------------------------------------- */
export const validateRegister = [
  body("firstName")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3, max: 50 }),
  body("lastName")
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

  body("role")
    .optional()
    .isString()
    .withMessage("Role must be a string")
    .custom(async (roleName) => {
      const role = await Role.findOne({ name: roleName });
      if (!role) throw new Error("Invalid role name");
      if (!role.isActive) throw new Error("Role is not active");
      return true;
    }),

  validatorMiddleware,
];

/* ---------------------------------------
   ADMIN REGISTER VALIDATOR (With Required Role)
---------------------------------------- */
export const validateAdminRegister = [
    body("firstName")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3, max: 50 }),
  body("lastName")
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

  body("legacyRole")
    .notEmpty().withMessage("legacyRole is required")
    .isString()
    .withMessage("legacyRole must be a string")
    .custom(async (roleName) => {
      const role = await Role.findOne({ name: roleName });
      if (!role) throw new Error("Invalid role name");
      if (!role.isActive) throw new Error("Role is not active");
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
export const validateResetPasswordWithToken = [
  body("newPassword").isLength({ min: 6 }).withMessage("Password too short"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
];
export const validateUpdateProfile = [
  body("firstName")
    .optional()
    .isString()
    .withMessage("First name must be a string"),

  body("lastName")
    .optional()
    .isString()
    .withMessage("Last name must be a string"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email"),

  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be a string"),

  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string"),

  body("gender")
    .optional()
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),

  body("BirthDate")
    .optional()
    .isISO8601()
    .withMessage("Birth date must be a valid date"),

  // ❌ Prevent updating passwords or role from UI
  body("password").not().exists().withMessage("Password cannot be updated here"),
  body("role").not().exists().withMessage("Role cannot be updated"),
];
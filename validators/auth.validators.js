import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import User from "../models/user.model.js";
export const validateRegister = [
    body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters")
    .isLength({ max: 50 }).withMessage("Name must be less than 50 characters"),

    body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Email is invalid")
    .bail()
    .custom(async (value) => {
      const normalizedEmail = value.toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (user) throw new Error("Email is already in use");
      return true;
    }),

    body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

    body("confirm_password")
    .notEmpty().withMessage("Confirm password is required")
    .custom((value , { req }) => {
        if (value !== req.body.password) throw new Error("Passwords do not match");
        return true;
    }),

    body("role")
    .isIn(["user", "admin" , "manager"]).withMessage("Role is invalid"),
    validatorMiddleware,
];

export const validateLogin = [
    body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Email is invalid"),

    body("password")
    .notEmpty().withMessage("Password is required"),

    validatorMiddleware,
];

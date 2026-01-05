import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import User from "../models/user.model.js";

export const validateCreateCommunicationInfo = [

  body("firstName")
    .notEmpty().withMessage("First name is required")
    .isLength({ min: 3, max: 50 }),

  body("secondName")
    .notEmpty().withMessage("Second name is required")
    .isLength({ min: 3, max: 50 }),

  body("region")
    .notEmpty().withMessage("Region is required")
    .isString().withMessage("Region must be a string"),

  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),

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

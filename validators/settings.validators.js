import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const validateSettings = [
  body("officialEmail").optional().isEmail().withMessage("Invalid email"),

  body("socialmediaLinks").optional().isArray(),

  body("socialmediaLinks.*.platform")
    .optional()
    .isIn(["facebook", "twitter", "instagram", "linkedin", "youtube"])
    .withMessage("Invalid platform"),

  body("socialmediaLinks.*.link")
    .optional()
    .isURL()
    .withMessage("Invalid URL"),

  validatorMiddleware,
];

export const validateSettingsId = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  validatorMiddleware,
];

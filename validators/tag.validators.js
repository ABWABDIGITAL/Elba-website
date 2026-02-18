import { body, param, validationResult } from "express-validator";

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      OK: false,
      message: "Validation error",
      errors: errors.array().map((e) => e.msg),
    });
  }
  next();
};

export const validateCreateTag = [
  body("name.en")
    .notEmpty()
    .withMessage("English name is required")
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("English name must be 2-100 characters"),
  body("name.ar")
    .notEmpty()
    .withMessage("Arabic name is required")
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("Arabic name must be 2-100 characters"),
  body("type")
    .optional()
    .isIn(["manual", "automatic", "both"])
    .withMessage("type must be manual, automatic, or both"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("status must be active or inactive"),
  body("icon").optional().isString(),
  handleValidation,
];

export const validateUpdateTag = [
  param("id").isMongoId().withMessage("Invalid tag ID"),
  body("name.en")
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("English name must be 2-100 characters"),
  body("name.ar")
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("Arabic name must be 2-100 characters"),
  body("type")
    .optional()
    .isIn(["manual", "automatic", "both"])
    .withMessage("type must be manual, automatic, or both"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("status must be active or inactive"),
  handleValidation,
];

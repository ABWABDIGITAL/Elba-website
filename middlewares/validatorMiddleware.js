// middlewares/validatorMiddleware.js
import { validationResult } from "express-validator";

const validatorMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed please try again with valid data",
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

export default validatorMiddleware;

import { validationResult } from "express-validator";
import { StatusCodes } from "http-status-codes";

const validatorMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return res.status(StatusCodes.BAD_REQUEST).json({
    status: "error",
    message: "Validation failed please try again with valid data",
    errors: formatted,
  });
};

export default validatorMiddleware;
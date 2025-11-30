export default class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const BadRequest = (msg, details) => new ApiError(400, msg, details);
export const Forbidden = (msg, details) => new ApiError(403, msg, details);
export const NotFound = (msg, details) => new ApiError(404, msg, details);
export const ServerError = (msg, details) => new ApiError(500, msg, details);


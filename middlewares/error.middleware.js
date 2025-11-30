// middleware/errorMiddleware.js
import ApiError from "../utlis/apiError.js";

const errorMiddleware = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      details: err.details || undefined,
    });
  }

  console.error(err);
  return res.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
};

export default errorMiddleware;

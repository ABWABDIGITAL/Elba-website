import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1_000_000_000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1_000_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, try again later.",
  },
});

export const sensitiveRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 500_000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests on sensitive endpoint.",
  },
});

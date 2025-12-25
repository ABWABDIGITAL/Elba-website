// middlewares/rateLimiter.middleware.js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

// ═══════════════════════════════════════════════════════════════
// 📦 REDIS CLIENT (Optional but recommended for production)
// ═══════════════════════════════════════════════════════════════

let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
  redisClient.on("error", (err) => console.error("Redis error:", err));
}

// ═══════════════════════════════════════════════════════════════
// 🔒 WEBHOOK RATE LIMITER (Lenient - Allow Retries)
// ═══════════════════════════════════════════════════════════════

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100,            // 100 requests per minute
  
  // Use Redis in production for distributed systems
  store: redisClient
    ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: "rl:webhook:",
      })
    : undefined, // Falls back to memory store
  
  message: { 
    success: false, 
    message: "Too many requests, please try again later" 
  },
  
  // Don't count successful requests
  skipSuccessfulRequests: false,
  
  // Custom key generator (by IP) - using ipKeyGenerator for proper IPv6 handling
  keyGenerator: (req) => ipKeyGenerator(req),
  
  // Handler for rate limit exceeded
  handler: (req, res, next, options) => {
    console.warn(`⚠️ Webhook rate limit exceeded: ${req.ip}`);
    res.status(429).json(options.message);
  },
  
  // Standard headers
  standardHeaders: true,
  legacyHeaders: false,
});

// ═══════════════════════════════════════════════════════════════
// 💳 PAYMENT INITIATION RATE LIMITER (Strict)
// ═══════════════════════════════════════════════════════════════

export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10,             // 10 requests per minute per IP
  
  store: redisClient
    ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: "rl:payment:",
      })
    : undefined,
  
  message: {
    success: false,
    message: "Too many payment attempts. Please wait a moment.",
  },
  
  // Custom key: combine IP + user ID for more precise limiting
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const userId = req.user?._id?.toString() || "anonymous";
    return `${ip}:${userId}`;
  },
  
  handler: (req, res, next, options) => {
    console.warn(`⚠️ Payment rate limit: ${req.ip} - User: ${req.user?._id}`);
    res.status(429).json(options.message);
  },
  
  standardHeaders: true,
  legacyHeaders: false,
});

// ═══════════════════════════════════════════════════════════════
// 🌐 GENERAL API RATE LIMITER
// ═══════════════════════════════════════════════════════════════

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per 15 minutes
  
  message: {
    success: false,
    message: "Too many requests from this IP",
  },
  
  standardHeaders: true,
  legacyHeaders: false,
});
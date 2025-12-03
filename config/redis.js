// src/config/redisClient.js
import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Upstash Redis environment variables are missing");
}

// Create Upstash Redis HTTP client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// OPTIONAL: Simple helper wrapper for consistent logging
export const RedisHelper = {
  async get(key) {
    try {
      return await redis.get(key);
    } catch (err) {
      console.error("Redis GET Error:", err.message);
      return null;
    }
  },

  async set(key, value, ttl = null) {
    try {
      if (ttl) {
        // EX → expire in seconds
        return await redis.set(key, value, { ex: ttl });
      }
      return await redis.set(key, value);
    } catch (err) {
      console.error("Redis SET Error:", err.message);
    }
  },

  async del(key) {
    try {
      return await redis.del(key);
    } catch (err) {
      console.error("Redis DEL Error:", err.message);
    }
  },
};

export default RedisHelper;
// src/config/redisClient.js
import { Redis } from "@upstash/redis";

// Validate env variables (optional for development)
const REDIS_ENABLED = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_ENABLED) {
  console.warn("⚠️  Redis disabled: Upstash Redis environment variables are missing");
}

// Create Upstash client only if credentials are provided
export const redis = REDIS_ENABLED
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Helper wrapper
export const RedisHelper = {
  async get(key) {
    if (!redis) return null;
    try {
      return await redis.get(key);
    } catch (err) {
      console.error("Redis GET Error:", err.message);
      return null;
    }
  },

  async set(key, value, ttl = null) {
    if (!redis) return null;
    try {
      if (ttl) {
        return await redis.set(key, value, { ex: ttl });
      }
      return await redis.set(key, value);
    } catch (err) {
      console.error("Redis SET Error:", err.message);
    }
  },

  async del(key) {
    if (!redis) return null;
    try {
      return await redis.del(key);
    } catch (err) {
      console.error("Redis DEL Error:", err.message);
    }
  },

  /**
   * Delete all keys matching a pattern (e.g., "notifications:user:123:*")
   */
  async delByPattern(pattern) {
    if (!redis) return null;
    try {
      let cursor = 0;
      let deletedCount = 0;
      do {
        const result = await redis.scan(cursor, { match: pattern, count: 100 });
        // Upstash returns cursor as string, convert to number
        cursor = parseInt(result[0], 10);
        const keys = result[1];
        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);
      return deletedCount;
    } catch (err) {
      console.error("Redis DEL Pattern Error:", err.message);
      return 0;
    }
  },
};

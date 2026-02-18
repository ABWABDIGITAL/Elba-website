import { redis } from "../config/redis.js";

const EMBEDDING_QUEUE_KEY = "embedding:pending_products";
const EMBEDDING_FAILED_KEY = "embedding:failed_products";
const MAX_RETRIES = 3;

/**
 * Queue a single product for embedding generation.
 * Uses Redis sorted set with timestamp as score for FIFO ordering.
 */
export async function queueProductForEmbedding(productId) {
  if (!redis) return;
  try {
    const jobData = JSON.stringify({
      productId: productId.toString(),
      attempts: 0,
      queuedAt: Date.now(),
    });
    await redis.zadd(EMBEDDING_QUEUE_KEY, Date.now(), jobData);
  } catch (err) {
    console.error(`[EmbeddingQueue] Failed to queue product ${productId}:`, err.message);
  }
}

/**
 * Queue multiple products for embedding (for bulk import/update).
 */
export async function queueProductsForEmbedding(productIds) {
  if (!redis || !productIds?.length) return;
  try {
    const now = Date.now();
    for (let i = 0; i < productIds.length; i++) {
      const jobData = JSON.stringify({
        productId: productIds[i].toString(),
        attempts: 0,
        queuedAt: now + i,
      });
      await redis.zadd(EMBEDDING_QUEUE_KEY, now + i, jobData);
    }
    console.log(`[EmbeddingQueue] Queued ${productIds.length} products for embedding`);
  } catch (err) {
    console.error("[EmbeddingQueue] Failed to queue batch:", err.message);
  }
}

/**
 * Fetch and remove up to `batchSize` items from the queue.
 */
export async function dequeueProducts(batchSize = 5) {
  if (!redis) return [];
  try {
    const items = await redis.zrangebyscore(EMBEDDING_QUEUE_KEY, 0, Date.now());
    if (!items || items.length === 0) return [];

    const batch = items.slice(0, batchSize);
    const results = [];

    for (const item of batch) {
      await redis.zrem(EMBEDDING_QUEUE_KEY, item);
      const parsed = typeof item === "string" ? JSON.parse(item) : item;
      results.push(parsed);
    }
    return results;
  } catch (err) {
    console.error("[EmbeddingQueue] Dequeue error:", err.message);
    return [];
  }
}

/**
 * Re-queue a failed product with incremented attempt count.
 * If max retries exceeded, move to failed set.
 */
export async function requeueOrFail(job) {
  if (!redis) return;
  try {
    const attempts = (job.attempts || 0) + 1;
    if (attempts >= MAX_RETRIES) {
      await redis.zadd(
        EMBEDDING_FAILED_KEY,
        Date.now(),
        JSON.stringify({ ...job, attempts, failedAt: Date.now() })
      );
      console.warn(`[EmbeddingQueue] Product ${job.productId} moved to failed after ${attempts} attempts`);
      return;
    }
    // Exponential backoff: 30s, 60s, 120s
    const delay = 30000 * Math.pow(2, attempts - 1);
    await redis.zadd(
      EMBEDDING_QUEUE_KEY,
      Date.now() + delay,
      JSON.stringify({ ...job, attempts })
    );
  } catch (err) {
    console.error("[EmbeddingQueue] Requeue error:", err.message);
  }
}

/**
 * Get queue status (pending count + failed count).
 */
export async function getQueueStatus() {
  if (!redis) return { pending: 0, failed: 0 };
  try {
    const [pending, failed] = await Promise.all([
      redis.zcard(EMBEDDING_QUEUE_KEY),
      redis.zcard(EMBEDDING_FAILED_KEY),
    ]);
    return { pending: pending || 0, failed: failed || 0 };
  } catch (err) {
    console.error("[EmbeddingQueue] Status error:", err.message);
    return { pending: 0, failed: 0 };
  }
}

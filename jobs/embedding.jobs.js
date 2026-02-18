import cron from "node-cron";
import { embedProduct } from "../services/embeddings.services.js";
import {
  dequeueProducts,
  requeueOrFail,
  getQueueStatus,
} from "../services/embeddingQueue.services.js";

let isProcessing = false;

/**
 * Process the embedding queue.
 * Sequential processing to respect HuggingFace rate limits.
 */
async function processEmbeddingQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const jobs = await dequeueProducts(5);
    if (jobs.length === 0) return;

    console.log(`[EmbeddingCron] Processing ${jobs.length} products...`);

    for (const job of jobs) {
      try {
        await embedProduct(job.productId);
        console.log(`[EmbeddingCron] Embedded product ${job.productId}`);
      } catch (err) {
        console.error(`[EmbeddingCron] Failed to embed ${job.productId}:`, err.message);
        await requeueOrFail(job);
      }
      // Rate limit delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (err) {
    console.error("[EmbeddingCron] Queue processing error:", err.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Initialize the embedding cron jobs.
 */
export function initializeEmbeddingJobs() {
  // Process embedding queue every 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    await processEmbeddingQueue();
  });

  // Log queue status every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    const status = await getQueueStatus();
    if (status.pending > 0 || status.failed > 0) {
      console.log(
        `[EmbeddingCron] Queue status: ${status.pending} pending, ${status.failed} failed`
      );
    }
  });

  console.log("[EmbeddingCron] Embedding jobs initialized (runs every 2 min)");
}

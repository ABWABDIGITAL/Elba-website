import { HfInference } from "@huggingface/inference";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { NotFound, BadRequest } from "../utlis/apiError.js";
import "dotenv/config";

const { Binary } = mongoose.mongo;
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Must match the model used in chatbotAgent.js for vector search compatibility
const EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";

// ============================================================
// HELPERS
// ============================================================

function buildEmbeddingText(p) {
  const arDesc = (p.ar?.description || []).map((d) => d.content).join(" ");
  const enDesc = (p.en?.description || []).map((d) => d.content).join(" ");
  const enFeatures = (p.en?.features || []).join(", ");
  const arFeatures = (p.ar?.features || []).join(", ");

  return `
EN Title: ${p.en?.title || ""}
EN Subtitle: ${p.en?.subTitle || ""}
EN Description: ${enDesc}
EN Features: ${enFeatures}

AR Title: ${p.ar?.title || ""}
AR Subtitle: ${p.ar?.subTitle || ""}
AR Description: ${arDesc}
AR Features: ${arFeatures}

Price: ${p.price || ""}
Currency: ${p.currencyCode || ""}
Tags: ${(p.tags || []).join(", ")}
Status: ${p.status || ""}
`.trim();
}

async function embedText(text) {
  const res = await hf.featureExtraction({
    model: EMBED_MODEL,
    inputs: text,
  });
  return Array.isArray(res[0]) ? res[0] : res;
}

function toVectorBinary(vector) {
  return Binary.fromFloat32Array(new Float32Array(vector));
}

// ============================================================
// EMBED SINGLE PRODUCT
// ============================================================

export async function embedProduct(productId) {
  const product = await Product.findById(productId).select("+embedding");
  if (!product) throw NotFound("Product not found");

  const text = buildEmbeddingText(product);
  if (!text || text.length < 10) {
    throw BadRequest("Product has insufficient text for embedding");
  }

  const vector = await embedText(text);

  // Use MongoDB driver directly for Binary format consistency with vector index
  const mongoClient = mongoose.connection.getClient();
  const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
  const col = db.collection("products");

  await col.updateOne(
    { _id: product._id },
    { $set: { embedding: toVectorBinary(vector) } }
  );

  return {
    productId: product._id,
    sku: product.sku,
    title: product.en?.title || product.ar?.title,
    embedded: true,
  };
}

// ============================================================
// SYNC EMBEDDINGS (only products without embeddings)
// ============================================================

export async function syncEmbeddings() {
  const mongoClient = mongoose.connection.getClient();
  const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
  const col = db.collection("products");

  const products = await col
    .find({
      status: "active",
      $or: [{ embedding: { $exists: false } }, { embedding: null }],
    })
    .project({ _id: 1, en: 1, ar: 1, price: 1, currencyCode: 1, tags: 1, status: 1, sku: 1 })
    .toArray();

  let count = 0;
  const errors = [];

  for (const p of products) {
    try {
      const text = buildEmbeddingText(p);
      if (!text || text.length < 10) continue;

      const vector = await embedText(text);
      if (!Array.isArray(vector) || vector.length < 100) continue;

      await col.updateOne(
        { _id: p._id },
        { $set: { embedding: toVectorBinary(vector) } }
      );
      count++;
    } catch (err) {
      errors.push({ productId: p._id, sku: p.sku, error: err.message });
    }
  }

  return {
    embedded: count,
    total: products.length,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  };
}

// ============================================================
// FORCE RE-EMBED ALL ACTIVE PRODUCTS
// ============================================================

export async function forceSyncAll() {
  const mongoClient = mongoose.connection.getClient();
  const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
  const col = db.collection("products");

  const products = await col
    .find({ status: "active" })
    .project({ _id: 1, en: 1, ar: 1, price: 1, currencyCode: 1, tags: 1, status: 1, sku: 1 })
    .toArray();

  let count = 0;
  const errors = [];

  for (const p of products) {
    try {
      const text = buildEmbeddingText(p);
      if (!text || text.length < 10) continue;

      const vector = await embedText(text);
      if (!Array.isArray(vector) || vector.length < 100) continue;

      await col.updateOne(
        { _id: p._id },
        { $set: { embedding: toVectorBinary(vector) } }
      );
      count++;
    } catch (err) {
      errors.push({ productId: p._id, sku: p.sku, error: err.message });
    }
  }

  return {
    embedded: count,
    total: products.length,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  };
}

// ============================================================
// GET EMBEDDING STATUS
// ============================================================

export async function getEmbeddingStatus() {
  const mongoClient = mongoose.connection.getClient();
  const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
  const col = db.collection("products");

  const [stats] = await col
    .aggregate([
      { $match: { status: "active" } },
      {
        $facet: {
          total: [{ $count: "count" }],
          withEmbedding: [
            { $match: { embedding: { $exists: true, $ne: null } } },
            { $count: "count" },
          ],
          withoutEmbedding: [
            {
              $match: {
                $or: [
                  { embedding: { $exists: false } },
                  { embedding: null },
                ],
              },
            },
            { $count: "count" },
          ],
        },
      },
    ])
    .toArray();

  const totalActive = stats.total[0]?.count || 0;
  const embedded = stats.withEmbedding[0]?.count || 0;
  const pending = stats.withoutEmbedding[0]?.count || 0;

  return {
    totalActive,
    embedded,
    pending,
    coverage: totalActive > 0 ? Math.round((embedded / totalActive) * 100) : 0,
  };
}

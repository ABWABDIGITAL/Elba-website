import { MongoClient, Binary } from "mongodb";
import { HfInference } from "@huggingface/inference";

/* ================= CONFIG ================= */
const client = new MongoClient(process.env.MONGO_URI);
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const DB_NAME = "Alba-ECommerce";
const COLLECTION = "products";
const INDEX_NAME = "vector_index";
const MODEL = "sentence-transformers/all-mpnet-base-v2";
const DIM = 768;

/* ================= HELPERS ================= */

// ✅ الطريقة الرسمية الوحيدة لإنشاء Vector (subType 0x09)
function toVectorBinary(vector) {
  return Binary.fromFloat32Array(new Float32Array(vector));
}

// Embed النص وتحويله لـ vector
async function embed(text) {
  const raw = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  });

  const vector = Array.isArray(raw[0]) ? raw[0] : raw;

  if (!Array.isArray(vector) || vector.length !== DIM) {
    throw new Error(`Invalid vector length: ${vector?.length}`);
  }

  return vector;
}

/* ================= SERVICE ================= */

export async function vectorSearchService(query, limit = 5) {
  console.log("🔎 Vector search:", query);

  if (!query || typeof query !== "string") {
    throw new Error("Query must be a string");
  }

  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  // 1️⃣ Embed query
  const vectorArray = await embed(query);

  // 2️⃣ Convert to BSON Vector (0x09)
  const queryVector = toVectorBinary(vectorArray);

  // 3️⃣ Vector Search
  const results = await col
    .aggregate([
      {
        $vectorSearch: {
          index: INDEX_NAME,
          path: "embedding",
          queryVector,
          numCandidates: 1000,
          limit,
        },
      },
      {
        $project: {
          "ar.title": 1,
          "en.title": 1,
          price: 1,
          images: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  console.log("✅ Results:", results.length);
  return results;
}

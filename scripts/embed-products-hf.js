import "dotenv/config";
import { MongoClient, Binary } from "mongodb";
import { HfInference } from "@huggingface/inference";

const client = new MongoClient(process.env.MONGO_URI);
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const DB_NAME = "Alba-ECommerce";
const COLLECTION = "products";
const MODEL = "sentence-transformers/all-mpnet-base-v2";
const DIM = 768;

/* ================= VECTOR BIN (0x09) ================= */

function toVectorBinary(vector) {
  return Binary.fromFloat32Array(new Float32Array(vector));
}


/* ================= TEXT BUILDER ================= */
function buildEmbeddingText(p) {
  return `
${p.en?.title || ""}
${p.ar?.title || ""}
${(p.en?.features || []).join(", ")}
${(p.ar?.features || []).join(", ")}
${p.modelNumber || ""}
${p.tags?.join(", ") || ""}
`.trim();
}

/* ================= MAIN ================= */
async function run() {
  console.log("🚀 Embedding products with VECTOR subtype (0x09)");

  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  const cursor = col.find({});
  let count = 0;

  for await (const p of cursor) {
    const text = buildEmbeddingText(p);
    if (!text) continue;

    const raw = await hf.featureExtraction({
      model: MODEL,
      inputs: text,
    });

    const vector = Array.isArray(raw[0]) ? raw[0] : raw;

    if (!Array.isArray(vector) || vector.length !== DIM) {
      console.error("❌ Wrong vector shape:", vector?.length);
      continue;
    }

    await col.updateOne(
      { _id: p._id },
      { $set: { embedding: toVectorBinary(vector) } }
    );

    count++;
    console.log(`✅ Embedded product ${p._id}`);
  }

  console.log(`🎉 Done. Embedded ${count} products.`);
  await client.close();
}

run().catch(console.error);

import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/product.model.js"; // adjust path

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,   // ✅ use the same key you use in your agent
  model: "text-embedding-004",          // ✅ Gemini embedding model
});

function buildEmbeddingText(product) {
  const arDesc = (product.ar?.description || []).map(d => d.content).join(" ");
  const enDesc = (product.en?.description || []).map(d => d.content).join(" ");
  const enFeatures = (product.en?.features || []).join(", ");
  const arFeatures = (product.ar?.features || []).join(", ");

  return `
EN Title: ${product.en?.title || ""}
EN Subtitle: ${product.en?.subTitle || ""}
EN Description: ${enDesc}
EN Features: ${enFeatures}

AR Title: ${product.ar?.title || ""}
AR Subtitle: ${product.ar?.subTitle || ""}
AR Description: ${arDesc}
AR Features: ${arFeatures}

Price: ${product.price || ""}
Currency: ${product.currencyCode || ""}
Tags: ${(product.tags || []).join(", ")}
Status: ${product.status || ""}
`.trim();
}

async function createEmbedding(text) {
  // LangChain returns an array of vectors (one per input)
  const vectors = await embeddings.embedDocuments([text]);
  return vectors[0];
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");
  if (!process.env.GOOGLE_API_KEY) throw new Error("Missing GOOGLE_API_KEY in .env");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // embed only products that don't have embedding yet
  const cursor = Product.find({ $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }] }).cursor();

  let count = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const text = buildEmbeddingText(doc);
    const embedding = await createEmbedding(text);

    doc.embedding = embedding;
    await doc.save();

    count++;
    console.log("✅ Embedded:", doc._id.toString(), "count:", count);
  }

  console.log("🎉 Done. Total embedded:", count);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ Embed script failed:", e);
  process.exit(1);
});

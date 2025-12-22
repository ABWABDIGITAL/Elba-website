import { MongoClient, Binary } from "mongodb";
import { HfInference } from "@huggingface/inference";
import "dotenv/config";

/* ================= CONFIG ================= */
const client = new MongoClient(process.env.MONGO_URI);
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const DB_NAME = "Alba-ECommerce";
const COLLECTION = "products";
const INDEX_NAME = "vector_index";

// ⚠️ CHANGED: Use a model that supports ARABIC & English
const MODEL_EMBEDDING = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
const MODEL_CHAT = "meta-llama/Meta-Llama-3-8B-Instruct"; // Fast model for logic extraction
const DIM = 768;

/* ================= HELPERS ================= */

function toVectorBinary(vector) {
  return Binary.fromFloat32Array(new Float32Array(vector));
}

// 1️⃣ Generate Embedding (Multilingual)
async function embed(text) {
  const res = await hf.featureExtraction({
    model: MODEL_EMBEDDING,
    inputs: text,
  });
  const vector = Array.isArray(res[0]) ? res[0] : res;
  return vector;
}

// 2️⃣ Smart Intent Extraction (The Fix)
// uses LLM to understand what the user strictly wants (Brand/Category)
async function extractSearchIntent(query) {
  try {
    const prompt = `
      You are a search engine parser. Extract filters from the user query.
      Query: "${query}"
      
      Return ONLY a JSON object with keys: "category_slug" (in English) and "brand_slug" (in English). 
      If not found, set to null.
      
      Example:
      Query: "غسالة سامسونج" -> {"category_slug": "washing-machines", "brand_slug": "samsung"}
      Query: "لابتوب" -> {"category_slug": "laptops", "brand_slug": null}
    `;

    const chatCompletion = await hf.chatCompletion({
      model: MODEL_CHAT,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
    });

    const content = chatCompletion.choices[0].message.content;
    // Extract JSON from potential text wrapper
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (e) {
    console.error("⚠️ Intent extraction failed, falling back to pure vector:", e.message);
    return {};
  }
}

/* ================= MAIN SERVICE ================= */

export async function vectorSearchService(query, limit = 5) {
  console.log("🔎 Query:", query);

  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  // Parallel: Embed the vector AND understand the intent
  const [queryVectorArr, intent] = await Promise.all([
    embed(query),
    extractSearchIntent(query)
  ]);

  const queryVector = toVectorBinary(queryVectorArr);
  
  console.log("🧠 Understanding:", intent);

  // Build the strict filter
  const baseFilter = {
    status: "active",
    stock: { $gt: 0 },
  };

  if (intent.category_slug) {
    // Matches the slug in your DB structure
    baseFilter["category.en.slug"] = { $regex: intent.category_slug, $options: "i" };
  }
  if (intent.brand_slug) {
    baseFilter["brand.en.slug"] = { $regex: intent.brand_slug, $options: "i" };
  }

  // 3️⃣ Vector Search with Pre-Filters
  const pipeline = [
    {
      $vectorSearch: {
        index: INDEX_NAME,
        path: "embedding",
        queryVector: queryVector,
        numCandidates: 200, // Increase candidates to find the specific category
        limit: 20,          // Fetch more initially
        filter: baseFilter, // 🎯 STRICT FILTERING APPLIED HERE
      },
    },
    {
      $project: {
        ar: 1,
        en: 1,
        price: 1,
        category: 1,
        brand: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
    // Optional: Boost score if keyword matches title strictly (Hybrid-ish approach)
    {
       $addFields: {
          textMatchScore: {
             $cond: [
                { $regexMatch: { input: "$ar.title", regex: query.split(" ")[0] || "", options: "i" } },
                0.1, // Small boost for exact keyword match
                0
             ]
          }
       }
    },
    {
       $addFields: {
          finalScore: { $add: ["$score", "$textMatchScore"] }
       }
    },
    { $sort: { finalScore: -1 } },
    { $limit: limit }
  ];

  const results = await col.aggregate(pipeline).toArray();

  return results;
}
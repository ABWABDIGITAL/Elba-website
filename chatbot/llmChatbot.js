import "dotenv/config";
import OpenAI from "openai";
import { MongoClient, Binary } from "mongodb";
import { HfInference } from "@huggingface/inference";

/* ================= CONFIG ================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new MongoClient(process.env.MONGO_URI);
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const DB_NAME = "Alba-ECommerce";
const COLLECTION = "products";
const INDEX_NAME = "vector_index";
const MODEL_EMBEDDING = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
const DIM = 768;

/* ================= HELPERS ================= */

function toVectorBinary(vector) {
  return Binary.fromFloat32Array(new Float32Array(vector));
}

async function embed(text) {
  const res = await hf.featureExtraction({
    model: MODEL_EMBEDDING,
    inputs: text,
  });
  const vector = Array.isArray(res[0]) ? res[0] : res;
  return vector;
}

/**
 * Extract product type and brand from user query using LLM
 * Returns strictly required filters
 */
async function extractProductFilters(query) {
  try {
    const extractionPrompt = `You are a strict product filter extractor for an e-commerce store.

User query: "${query}"

Extract ONLY what the user EXPLICITLY mentioned:
- product_type: The specific product category (e.g., "refrigerator", "washing-machine", "tv", "laptop", "air-conditioner", "microwave", "oven", "dishwasher", "vacuum-cleaner", "blender", "coffee-maker", etc.)
- brand: The specific brand name if mentioned (e.g., "samsung", "lg", "sony", "philips", "bosch", etc.)

IMPORTANT RULES:
1. Only extract what is EXPLICITLY stated by the user
2. Do NOT infer or guess product types
3. Do NOT expand or broaden the category
4. If user says "refrigerator", product_type is "refrigerator" - NOT "kitchen appliances"
5. If user says "TV", product_type is "tv" - NOT "electronics"

Return ONLY a JSON object:
{"product_type": "extracted_type_or_null", "brand": "extracted_brand_or_null"}

Examples:
- "أريد ثلاجة سامسونج" → {"product_type": "refrigerator", "brand": "samsung"}
- "غسالة LG" → {"product_type": "washing-machine", "brand": "lg"}
- "تلفزيون" → {"product_type": "tv", "brand": null}
- "أفضل ماركة للأجهزة" → {"product_type": null, "brand": null}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { product_type: null, brand: null };
  } catch (e) {
    console.error("⚠️ Filter extraction failed:", e.message);
    return { product_type: null, brand: null };
  }
}

/**
 * Strict Vector Search - ONLY returns products matching the exact product type
 */
async function strictVectorSearch(query, filters, limit = 12) {
  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  const vectorArray = await embed(query);
  const queryVector = toVectorBinary(vectorArray);

  // Base filter for vector search (only supports $eq, $gt, $in, etc. - NOT $regex)
  const vectorSearchFilter = {
    $and: [
      { status: { $eq: "active" } },
      { stock: { $gt: 0 } }
    ]
  };

  // Build post-filter conditions for product type and brand (supports $regex)
  const postFilterConditions = [];

  // STRICT product type filtering
  if (filters.product_type) {
    postFilterConditions.push({
      $or: [
        { "category.en.slug": { $regex: filters.product_type, $options: "i" } },
        { "category.en.title": { $regex: filters.product_type, $options: "i" } },
        { "category.ar.title": { $regex: filters.product_type, $options: "i" } },
        { "en.title": { $regex: filters.product_type, $options: "i" } },
        { "ar.title": { $regex: filters.product_type, $options: "i" } }
      ]
    });
  }

  // STRICT brand filtering
  if (filters.brand) {
    postFilterConditions.push({
      $or: [
        { "brand.en.slug": { $regex: filters.brand, $options: "i" } },
        { "brand.en.title": { $regex: filters.brand, $options: "i" } },
        { "brand.en.name": { $regex: filters.brand, $options: "i" } },
        { "brand.ar.title": { $regex: filters.brand, $options: "i" } },
        { "en.title": { $regex: `\\b${filters.brand}\\b`, $options: "i" } },
        { "ar.title": { $regex: filters.brand, $options: "i" } }
      ]
    });
  }

  // Build aggregation pipeline
  const pipeline = [
    {
      $vectorSearch: {
        index: INDEX_NAME,
        path: "embedding",
        queryVector: queryVector,
        numCandidates: 500,
        limit: 50, // Fetch more to filter down
        filter: vectorSearchFilter,
      },
    },
    {
      $project: {
        ar: 1,
        en: 1,
        price: 1,
        images: 1,
        category: 1,
        brand: 1,
        score: { $meta: "vectorSearchScore" },
      },
    }
  ];

  // Add post-filter if we have product type or brand filters
  if (postFilterConditions.length > 0) {
    pipeline.push({
      $match: { $and: postFilterConditions }
    });
  }

  // Limit final results
  pipeline.push({ $limit: limit });

  const results = await col.aggregate(pipeline).toArray();
  return results;
}

/* ================= MAIN CHATBOT ================= */

/**
 * LLM-powered Chatbot with STRICT Product Type Filtering
 * -------------------------------------------------------
 * - Extracts exact product type and brand from user query
 * - Uses Vector Search ONLY within the filtered product type
 * - NEVER suggests products from other categories
 * - NEVER broadens the search
 */
export async function llmChatbot(userMessage) {
  if (!userMessage || typeof userMessage !== "string") {
    return "ممكن توضّح طلبك أكتر؟";
  }

  /* 1️⃣ Extract strict filters from user query */
  const filters = await extractProductFilters(userMessage);
  console.log("🎯 Extracted filters:", filters);

  /* 2️⃣ Strict Vector Search (filtered by product type) */
  const products = await strictVectorSearch(userMessage, filters, 12);

  /* 3️⃣ Handle no results - ask user to change criteria */
  if (!products || products.length === 0) {
    let noResultMessage = "للأسف ما لقيت منتجات مطابقة لطلبك";

    if (filters.product_type && filters.brand) {
      noResultMessage += ` من نوع "${filters.product_type}" وماركة "${filters.brand}"`;
    } else if (filters.product_type) {
      noResultMessage += ` من نوع "${filters.product_type}"`;
    } else if (filters.brand) {
      noResultMessage += ` من ماركة "${filters.brand}"`;
    }

    noResultMessage += ".\n\nتحب:\n- تغيّر نوع المنتج؟\n- تغيّر الماركة؟\n- تشوف منتجات مشابهة؟";
    return noResultMessage;
  }

  /* 4️⃣ Prepare context for LLM - only matched products */
  const context = products.map((p, i) => ({
    index: i + 1,
    title: p.ar?.title || p.en?.title,
    price: p.price,
    category: p.category?.en?.title || p.category?.ar?.title,
    brand: p.brand?.en?.title || p.brand?.ar?.title,
  }));

  /* 5️⃣ Strict recommendation prompt */
  const prompt = `أنت شات بوت لمتجر إلكتروني.

قاعدة صارمة (لا يمكن كسرها):
- اقترح فقط المنتجات الموجودة في القائمة أدناه
- لا تقترح منتجات من أنواع أخرى
- لا توسّع البحث
- لا تقترح بدائل من ماركات أخرى إلا إذا كانت من نفس نوع المنتج

المستخدم طلب:
"${userMessage}"

${filters.product_type ? `نوع المنتج المطلوب: ${filters.product_type}` : ""}
${filters.brand ? `الماركة المطلوبة: ${filters.brand}` : ""}

المنتجات المتاحة (من نفس النوع فقط):
${JSON.stringify(context, null, 2)}

المطلوب:
- اختَر أفضل المنتجات المناسبة من القائمة
- رتّبها حسب الأنسب لطلب المستخدم
- لا تذكر أي أرقام أو scores
- لا تخترع منتجات
- رد بالعربي بأسلوب ودود ومختصر`;

  /* 6️⃣ Call OpenAI */
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a strict product recommendation assistant.
CRITICAL RULES:
- ONLY recommend products from the provided list
- NEVER suggest different product types
- NEVER broaden the category
- NEVER cross-sell or upsell
- Stay STRICTLY within the requested product type`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 400,
  });

  return completion.choices[0].message.content;
}

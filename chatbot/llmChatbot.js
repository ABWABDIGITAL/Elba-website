import "dotenv/config";
import OpenAI from "openai";
import { vectorRawSearch } from "../services/vectorRawSearch.services.js";

/* ================= CONFIG ================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ================= MAIN CHATBOT ================= */

/**
 * LLM-powered Chatbot
 * -------------------
 * - Uses Vector Search for facts
 * - Uses OpenAI gpt-4o-mini for reasoning + response
 * - Never invents products
 */
export async function llmChatbot(userMessage) {
  if (!userMessage || typeof userMessage !== "string") {
    return "ممكن توضّح طلبك أكتر؟";
  }

  /* 1️⃣ Vector Search (truth source) */
  const products = await vectorRawSearch(userMessage, 12);

  if (!products || products.length === 0) {
    return "ملقتش منتجات مناسبة لطلبك، تحب تصيغ السؤال بشكل مختلف؟";
  }

  /* 2️⃣ Prepare context for LLM */
  const context = products.map((p, i) => ({
    index: i + 1,
    title: p.ar?.title || p.en?.title,
    price: p.price,
    category: p.category?.toString(),
  }));

  /* 3️⃣ Prompt (LLM = عقل مش DB) */
  const prompt = `
أنت شات بوت لمتجر إلكتروني.

المستخدم قال:
"${userMessage}"

هذه منتجات حقيقية من قاعدة البيانات:
${JSON.stringify(context, null, 2)}

المطلوب:
- اختَر المنتج الأنسب أولاً
- بعده اقترح بدائل قريبة فقط
- لا تذكر أي أرقام أو scores
- لا تخترع منتجات غير موجودة
- رد بالعربي بأسلوب شات بسيط
`;

  /* 4️⃣ Call OpenAI */
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful Arabic e-commerce chatbot." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 300,
  });

  return completion.choices[0].message.content;
}

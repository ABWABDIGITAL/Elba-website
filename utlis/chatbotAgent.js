// ============================================================
// IMPORTS
// ============================================================
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { HfInference } from "@huggingface/inference";
import mongoose from "mongoose";
import "dotenv/config";

const { Binary } = mongoose.mongo;
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// ============================================================
// HELPERS
// ============================================================

async function embed(text) {
  const res = await hf.featureExtraction({
    model: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    inputs: text,
  });
  return Array.isArray(res[0]) ? res[0] : res;
}

async function extractSearchIntent(query) {
  try {
    const prompt = `Extract search filters from this query.
Return JSON only: { "category": "string or null", "brand": "string or null" }
Query: "${query}"`;

    const res = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
    });

    const text = res.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function populateProductCard(p) {
  return {
    _id: p._id?.toString() || p._id,
    en: { title: p.en?.title || null },
    ar: { title: p.ar?.title || null },
    price: p.price ?? null,
    currency: p.currency || "EGP",
    brand: p.brand?.en?.name || p.brand || null,
    category: p.category?.en?.slug || p.category || null,
    stock: p.stock ?? null,
    images: Array.isArray(p.images) ? p.images : [],
    features: p.en?.features || p.ar?.features || [],
    warranty: p.en?.warranty || p.ar?.warranty || null,
    link: p.slug ? `/product/${p.slug}` : null,
    ui: { type: "product_card", addToCart: true, viewDetails: true },
  };
}

// ============================================================
// FOLLOW-UP DETECTION (Simple & Fast)
// ============================================================

function detectFollowUp(query) {
  const q = query.toLowerCase();
  
  // Patterns that indicate referring to previous products
  const referencePatterns = [
    /\bدول\b/, /\bده\b/, /\bدي\b/,
    /المنتجات دي/, /الحاجات دي/,
    /اللي قلت/, /اللي عرضت/, /اللي فات/,
    /منهم/, /فيهم/, /عنهم/,
    /الاول/, /التاني/, /الأول/, /الثاني/,
  ];
  
  // Patterns for negative feedback
  const negativePatterns = [
    /مش كويس/, /مش حلو/, /وحش/,
    /غالي/, /غاليه/,
    /مش عاجب/, /مبحبش/,
    /سمع.* مش/, /سمع.* وحش/,
    /ردود سلبية/, /تقييم.* وحش/,
  ];
  
  // Patterns for questions about previous items
  const questionPatterns = [
    /ايه الفرق/, /إيه الفرق/,
    /انهي احسن/, /أنهي أحسن/, /مين احسن/,
    /تنصح/, /تنصحني/,
    /رأيك/, /رايك/,
  ];
  
  // Patterns for wanting alternatives
  const alternativePatterns = [
    /حاجة تاني/, /حاجه تانيه/, /بديل/,
    /غير كده/, /حاجة غير/,
    /ارخص/, /أرخص/, /اغلى/, /أغلى/,
    /ماركة تاني/, /براند تاني/,
  ];
  
  const isReference = referencePatterns.some(p => p.test(q));
  const isNegative = negativePatterns.some(p => p.test(q));
  const isQuestion = questionPatterns.some(p => p.test(q));
  const wantsAlternative = alternativePatterns.some(p => p.test(q));
  
  return {
    isFollowUp: isReference || isNegative || isQuestion,
    isNegative,
    isQuestion,
    wantsAlternative,
    needsNewSearch: wantsAlternative || isNegative,
  };
}

// ============================================================
// INTENT CLASSIFICATION
// ============================================================

async function classifyIntent(query) {
  try {
    const prompt = `Classify this Arabic message into ONE category:
- product_search (looking for specific product)
- recommendation (needs advice, gift, wedding, new home)
- support_request (order issue, complaint, delivery)
- general_chat (greeting, thanks, unclear)

Message: "${query}"

Reply with JSON only: { "intent": "category_name" }`;

    const res = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
    });

    const text = res.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    return parsed?.intent || "general_chat";
  } catch {
    return "general_chat";
  }
}

// ============================================================
// GENERATE CONTEXTUAL REPLY
// ============================================================

async function generateReply(salesModel, { userQuery, conversationHistory, products, followUpInfo }) {
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "العميل" : "المساعد"}: ${m.content}`)
    .join("\n");

  const productList = products
    .slice(0, 5)
    .map((p, i) => {
      const title = p.en?.title || p.ar?.title;
      const price = p.price;
      return `${i + 1}. ${title} - ${price} جنيه`;
    })
    .join("\n");

  let situationNote = "";
  if (followUpInfo.isNegative) {
    situationNote = "⚠️ العميل عنده تعليق سلبي على المنتجات السابقة. اسأله عن سبب قلقه واقترح بدائل.";
  } else if (followUpInfo.isQuestion) {
    situationNote = "⚠️ العميل بيسأل سؤال عن المنتجات السابقة. جاوب بناءً على المعلومات المتاحة.";
  } else if (followUpInfo.wantsAlternative) {
    situationNote = "⚠️ العميل عايز بدائل. اعرض عليه الخيارات الجديدة.";
  }

  const prompt = `أنت مساعد مبيعات محترف اسمك "علي" في متجر إلكترونيات.

📜 المحادثة السابقة:
${historyText || "لا توجد محادثة سابقة"}

💬 رسالة العميل:
"${userQuery}"

${situationNote}

📦 المنتجات المتاحة:
${productList || "لا توجد منتجات للعرض"}

📝 التعليمات:
- رد بالعربي المصري
- كن لطيف ومباشر
- لو العميل قلقان من حاجة، طمنه بالضمان والجودة
- اقترح 2-3 منتجات من القائمة
- اسأل سؤال متابعة (ميزانية؟ مقاس؟ ماركة مفضلة؟)
- متخترعش مواصفات مش موجودة

اكتب ردك:`;

  try {
    const res = await salesModel.invoke(prompt);
    return (res?.content || "").trim() || "تمام، إزاي أقدر أساعدك؟";
  } catch {
    return "تمام، إزاي أقدر أساعدك؟";
  }
}

// ============================================================
// MAIN AGENT
// ============================================================

export async function callAgent(mongoClient, userQuery, threadId, clearHistory = false) {
  console.log("\n========== 🤖 AGENT START ==========");
  console.log("📝 Query:", userQuery);
  console.log("🔗 ThreadId:", threadId);

  const dbName = process.env.DB_NAME || "Alba-ECommerce";
  const db = mongoClient.db(dbName);
  const productsCol = db.collection("products");
  const conversationsCol = db.collection("conversations");

  const salesModel = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    apiKey: process.env.GROQ_API_KEY,
  });

  // ----------------------------------------------------------
  // 1. LOAD OR CREATE CONVERSATION
  // ----------------------------------------------------------

  let conversation = { messages: [], lastProducts: [] };

  try {
    if (clearHistory) {
      await conversationsCol.deleteOne({ threadId });
      console.log("🗑️ Cleared history");
    } else {
      const existing = await conversationsCol.findOne({ threadId });
      if (existing) {
        conversation = {
          messages: existing.messages || [],
          lastProducts: existing.lastProducts || [],
        };
        console.log("📚 Loaded history:", conversation.messages.length, "messages");
      }
    }
  } catch (e) {
    console.log("⚠️ No existing conversation, starting fresh");
  }

  // ----------------------------------------------------------
  // 2. ANALYZE MESSAGE
  // ----------------------------------------------------------

  const followUpInfo = detectFollowUp(userQuery);
  console.log("🔍 Follow-up detection:", followUpInfo);

  let intent = "general_chat";
  if (!followUpInfo.isFollowUp) {
    intent = await classifyIntent(userQuery);
  } else {
    intent = "follow_up";
  }
  console.log("🎯 Intent:", intent);

  // ----------------------------------------------------------
  // 3. PROCESS BASED ON INTENT
  // ----------------------------------------------------------

  let products = [];
  let reply = "";

  try {
    // CASE A: Follow-up message
    if (intent === "follow_up") {
      console.log("📌 Processing follow-up...");

      if (followUpInfo.needsNewSearch) {
        // Search for alternatives
        const vector = await embed(userQuery);
        const results = await productsCol.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: Binary.fromFloat32Array(new Float32Array(vector)),
              numCandidates: 80,
              limit: 5,
              filter: { $and: [{ status: "active" }, { stock: { $gt: 0 } }] },
            },
          },
          { $project: { _id: 1, en: 1, ar: 1, price: 1, slug: 1, stock: 1, category: 1, brand: 1, images: 1, currency: 1 } },
        ]).toArray();

        products = results;
        console.log("🔎 Found alternatives:", products.length);
      } else {
        // Use previous products for context
        products = conversation.lastProducts;
      }

      reply = await generateReply(salesModel, {
        userQuery,
        conversationHistory: conversation.messages,
        products,
        followUpInfo,
      });
    }

    // CASE B: Product search or recommendation
    else if (intent === "product_search" || intent === "recommendation") {
      console.log("📌 Searching products...");

      const [vector, searchIntent] = await Promise.all([
        embed(userQuery),
        extractSearchIntent(userQuery),
      ]);

      const filter = { $and: [{ status: "active" }, { stock: { $gt: 0 } }] };
      if (searchIntent.brand) filter.$and.push({ "brand.en.slug": searchIntent.brand.toLowerCase() });
      if (searchIntent.category) filter.$and.push({ "category.en.slug": searchIntent.category.toLowerCase() });

      const results = await productsCol.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: Binary.fromFloat32Array(new Float32Array(vector)),
            numCandidates: 80,
            limit: 5,
            filter,
          },
        },
        { $project: { _id: 1, en: 1, ar: 1, price: 1, slug: 1, stock: 1, category: 1, brand: 1, images: 1, currency: 1 } },
      ]).toArray();

      products = results;
      console.log("🔎 Found products:", products.length);

      if (products.length === 0) {
        reply = "للأسف مفيش منتجات مطابقة دلوقتي 😅 تحب تقولّي الميزانية أو الماركة المفضلة؟";
      } else {
        reply = await generateReply(salesModel, {
          userQuery,
          conversationHistory: conversation.messages,
          products,
          followUpInfo: { isFollowUp: false, isNegative: false, isQuestion: false, wantsAlternative: false },
        });
      }
    }

    // CASE C: Support request
    else if (intent === "support_request") {
      reply = "تمام 🙏 قولّي المشكلة بالتفصيل وابعتلي رقم الطلب لو عندك عشان أساعدك بسرعة.";
    }

    // CASE D: General chat
    else {
      if (conversation.messages.length === 0) {
        reply = "أهلاً وسهلاً! 👋 أنا علي، مساعدك في المتجر. بتدور على إيه النهارده؟";
      } else {
        reply = "تمام! قولّي بتدور على إيه وأنا هساعدك 😊";
      }
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    reply = "حصلت مشكلة بسيطة، ممكن تحاول تاني؟";
  }

  // ----------------------------------------------------------
  // 4. SAVE CONVERSATION
  // ----------------------------------------------------------

  const productCards = products.map(populateProductCard);

  try {
    const updatedMessages = [
      ...conversation.messages,
      { role: "user", content: userQuery, timestamp: new Date() },
      { role: "assistant", content: reply, timestamp: new Date() },
    ].slice(-20); // Keep last 20 messages

    await conversationsCol.updateOne(
      { threadId },
      {
        $set: {
          threadId,
          messages: updatedMessages,
          lastProducts: productCards.length > 0 ? productCards : conversation.lastProducts,
          lastActivity: new Date(),
        },
      },
      { upsert: true } // Creates document if doesn't exist
    );
    console.log("💾 Saved conversation");
  } catch (e) {
    console.error("⚠️ Could not save:", e.message);
  }

  // ----------------------------------------------------------
  // 5. RETURN RESPONSE
  // ----------------------------------------------------------

  console.log("📤 Reply:", reply.substring(0, 80) + "...");
  console.log("========== 🤖 AGENT END ==========\n");

  return {
    reply,
    products: productCards,
    sessionId: threadId,
  };
}
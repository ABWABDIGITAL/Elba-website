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

function populateProductCard(p) {
  return {
    _id: p._id?.toString() || p._id,
    en: { title: p.en?.title || null },
    ar: { title: p.ar?.title || null },
    price: p.price ?? null,
    currency: p.currency || "SAR",
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
// FOLLOW-UP DETECTION (Saudi Dialect)
// ============================================================

function detectFollowUp(query) {
  const q = query.toLowerCase();
  
  const referencePatterns = [
    /\bذول\b/, /\bهذا\b/, /\bهذي\b/, /\bذا\b/, /\bذي\b/,
    /\bذولا\b/, /\bهذولا\b/, /\bهذيلا\b/,
    /المنتجات ذي/, /الأشياء ذي/, /الأغراض ذي/,
    /اللي قلت/, /اللي عرضت/, /اللي فات/,
    /منها/, /فيها/, /عنها/,
    /الأول/, /الثاني/, /اللي فوق/,
  ];
  
  const negativePatterns = [
    /مو زين/, /مو حلو/, /مو كويس/, /ما يصلح/,
    /غالي/, /غاليه/, /مرة غالي/,
    /ما عجبني/, /ما بغاه/, /ما أبيه/, /ما ودي/,
    /سمعت.* مو/, /سمعت.* سيء/,
    /تقييم.* سيء/, /ردود.* سلبية/,
  ];
  
  const questionPatterns = [
    /وش الفرق/, /ايش الفرق/, /إيش الفرق/,
    /أيهم أحسن/, /مين أحسن/, /وش الأفضل/,
    /تنصح/, /تنصحني/, /وش رايك/,
    /رأيك/, /شرايك/, /وش تشوف/,
  ];
  
  const alternativePatterns = [
    /شي ثاني/, /غير كذا/, /بديل/,
    /غير ذا/, /شي غير/, /غيره/,
    /أرخص/, /أغلى/, /أفضل/, /أحسن/,
    /ماركة ثانية/, /براند ثاني/,
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
// SUPPORT TYPE DETECTION
// ============================================================

function detectSupportType(query) {
  const q = query.toLowerCase();
  
  const patterns = {
    order_tracking: [
      /رقم الطلب/, /الطلب حقي/, /طلبي/, /وين الطلب/,
      /فين وصل/, /متى يوصل/, /الشحن/, /التوصيل/,
      /متأخر/, /تأخر/, /ما وصل/
    ],
    complaint: [
      /مشكلة/, /شكوى/, /زعلان/, /مو راضي/,
      /خربان/, /عطلان/, /ما يشتغل/, /ما شغال/,
      /معطل/, /باظ/, /تالف/
    ],
    return_exchange: [
      /أرجع/, /أستبدل/, /أغير/, /ما أبيه/,
      /أرد/, /استرجاع/, /استبدال/, /ترجيع/
    ],
    payment_issue: [
      /دفع/, /فيزا/, /كاش/, /فلوس/, /مدى/,
      /المبلغ/, /السعر/, /الحساب/, /بطاقة/,
      /أبل باي/, /apple pay/, /stc pay/
    ],
    warranty: [
      /ضمان/, /كفالة/, /صيانة/, /تصليح/,
      /عطل/, /خراب/, /إصلاح/
    ],
    general_inquiry: [
      /استفسار/, /سؤال/, /أبي أعرف/, /ممكن أسأل/,
      /عندي سؤال/, /بسأل/, /استفسر/
    ]
  };
  
  for (const [type, typePatterns] of Object.entries(patterns)) {
    if (typePatterns.some(p => p.test(q))) {
      return type;
    }
  }
  
  return 'general_support';
}

// ============================================================
// INTENT CLASSIFICATION
// ============================================================

async function classifyIntent(query) {
  try {
    const supportKeywords = [
      /مشكلة/, /شكوى/, /طلب/, /رقم/, /توصيل/, /شحن/,
      /ضمان/, /استرجاع/, /استبدال/, /دفع/, /فلوس/,
      /متأخر/, /عطلان/, /ما يشتغل/, /خربان/, /مدى/,
      /طلبي/, /حقي/, /عندي مشكلة/
    ];
    
    const q = query.toLowerCase();
    if (supportKeywords.some(pattern => pattern.test(q))) {
      return "support_request";
    }

    const prompt = `Classify this Saudi Arabic message into ONE category:
- product_search (looking for specific product)
- recommendation (needs advice, gift ideas)
- support_request (ANY issue with order, delivery, payment, warranty)
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
// UNIFIED AI RESPONSE GENERATOR
// ============================================================

async function generateAIResponse(salesModel, context) {
  const {
    userQuery,
    conversationHistory = [],
    products = [],
    intent,
    supportType = null,
    followUpInfo = {},
    isFirstMessage = false
  } = context;

  // Build conversation history
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "العميل" : "المساعد"}: ${m.content}`)
    .join("\n");

  // Build product list if available
  const productList = products
    .slice(0, 5)
    .map((p, i) => {
      const title = p.ar?.title || p.en?.title || "منتج";
      const price = p.price || 0;
      const brand = p.brand?.en?.name || p.brand || "";
      const stock = p.stock || 0;
      return `${i + 1}. ${title}
   - السعر: ${price} ريال
   - الماركة: ${brand}
   - المتوفر: ${stock} قطعة`;
    })
    .join("\n\n");

  // Build intent-specific instructions
  let intentInstructions = "";
  
  switch(intent) {
    case "product_search":
    case "recommendation":
      if (products.length === 0) {
        intentInstructions = `
المنتج المطلوب غير متوفر حالياً.
- اعتذر بلطف
- اسأل عن تفاصيل أكثر (الميزانية، الماركة المفضلة، المواصفات)
- اقترح البحث عن منتجات مشابهة`;
      } else {
        intentInstructions = `
عرض المنتجات المتوفرة:
- اذكر أهم 2-3 منتجات بمميزاتها
- قارن بينها بشكل مختصر
- اسأل عن التفضيلات (اللون، الحجم، الميزانية)
- اذكر عروض خاصة إن وجدت`;
      }
      break;

    case "support_request":
      const supportInstructions = {
        order_tracking: "اطلب رقم الطلب، وضح مدة التوصيل المتوقعة",
        complaint: "استمع للمشكلة، اعتذر، اطلب تفاصيل أكثر",
        return_exchange: "اشرح سياسة الاسترجاع 15 يوم، اطلب رقم الطلب",
        payment_issue: "اشرح طرق الدفع المتاحة، حل المشكلة",
        warranty: "اشرح الضمان (سنتين للأجهزة الكبيرة)، اطلب رقم الطلب",
        general_support: "استفسر عن المشكلة بالتفصيل"
      };
      intentInstructions = `
نوع الدعم: ${supportType}
${supportInstructions[supportType] || supportInstructions.general_support}
- كن متعاطف ومحترف
- قدم حل عملي`;
      break;

    case "follow_up":
      if (followUpInfo.isNegative) {
        intentInstructions = "العميل غير راضي. استفسر عن السبب واعرض بدائل";
      } else if (followUpInfo.isQuestion) {
        intentInstructions = "أجب على السؤال بناءً على المنتجات المعروضة";
      } else if (followUpInfo.wantsAlternative) {
        intentInstructions = "اعرض بدائل جديدة من المنتجات المتاحة";
      }
      break;

    case "general_chat":
      if (isFirstMessage) {
        intentInstructions = "رحب بالعميل وعرف عن نفسك واسأل كيف تساعده";
      } else {
        intentInstructions = "اسأل العميل عما يبحث عنه بشكل ودود";
      }
      break;
  }

  // Build the main prompt
  const prompt = `أنت عبدالله، مساعد ذكي في متجر إلكترونيات سعودي راقي.

${historyText ? `📜 المحادثة السابقة:\n${historyText}\n` : ""}

💬 رسالة العميل الحالية:
"${userQuery}"

${productList ? `📦 المنتجات المتاحة:\n${productList}\n` : ""}

📋 السياق والتعليمات:
${intentInstructions}

🎯 قواعد عامة مهمة:
- تحدث باللهجة السعودية الودودة والمحترمة
- استخدم: حياك الله، تفضل، أبشر، الله يعطيك العافية، إن شاء الله
- كن طبيعي وودود وليس رسمي بشكل مبالغ
- لا تكرر نفس الصياغة من الردود السابقة
- اجعل ردك قصير ومفيد (2-3 جمل)
- لا تخترع معلومات غير موجودة
- اذكر المميزات الحقيقية فقط:
  * توصيل مجاني للطلبات فوق 200 ريال
  * إمكانية التقسيط بتابي وتمارا
  * واتساب الدعم: 0500123456

اكتب ردك الطبيعي والمختلف:`;

  try {
    const res = await salesModel.invoke(prompt);
    const response = (res?.content || "").trim();
    
    // Ensure we always return something
    if (!response) {
      // Generate a simple fallback using the model
      const fallbackPrompt = `قل للعميل باللهجة السعودية أنك هنا للمساعدة في جملة واحدة قصيرة:`;
      const fallbackRes = await salesModel.invoke(fallbackPrompt);
      return (fallbackRes?.content || "حياك الله! كيف أقدر أخدمك؟").trim();
    }
    
    return response;
  } catch (error) {
    console.error("Error generating AI response:", error);
    // Even fallback is generated by AI
    try {
      const errorPrompt = `اعتذر للعميل باللهجة السعودية عن مشكلة تقنية بسيطة في جملة واحدة:`;
      const errorRes = await salesModel.invoke(errorPrompt);
      return (errorRes?.content || "عذراً، في مشكلة تقنية بسيطة. ممكن تعيد المحاولة؟").trim();
    } catch {
      return "عذراً، في مشكلة تقنية. ممكن تعيد المحاولة؟";
    }
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
  let isFirstMessage = false;

  try {
    if (clearHistory) {
      await conversationsCol.deleteOne({ threadId });
      console.log("🗑️ Cleared history");
      isFirstMessage = true;
    } else {
      const existing = await conversationsCol.findOne({ threadId });
      if (existing) {
        conversation = {
          messages: existing.messages || [],
          lastProducts: existing.lastProducts || [],
        };
        console.log("📚 Loaded history:", conversation.messages.length, "messages");
      } else {
        isFirstMessage = true;
      }
    }
  } catch (e) {
    console.log("⚠️ No existing conversation, starting fresh");
    isFirstMessage = true;
  }

  // ----------------------------------------------------------
  // 2. ANALYZE MESSAGE
  // ----------------------------------------------------------

  const followUpInfo = detectFollowUp(userQuery);
  console.log("🔍 Follow-up detection:", followUpInfo);

  let intent = "general_chat";
  if (!followUpInfo.isFollowUp || followUpInfo.needsNewSearch) {
    intent = await classifyIntent(userQuery);
  } else {
    intent = "follow_up";
  }
  console.log("🎯 Intent:", intent);

  // ----------------------------------------------------------
  // 3. PROCESS BASED ON INTENT
  // ----------------------------------------------------------

  let products = [];
  let supportType = null;
  let reply = "";

  try {
    // Handle different intents
    if (intent === "follow_up" && !followUpInfo.needsNewSearch) {
      // Use previous products for follow-up
      products = conversation.lastProducts;
    } else if (intent === "product_search" || intent === "recommendation" || 
               (intent === "follow_up" && followUpInfo.needsNewSearch)) {
      // Search for products
      console.log("📌 Searching products...");

      const [vector, searchIntent] = await Promise.all([
        embed(userQuery),
        extractSearchIntent(userQuery),
      ]);

      const filter = { $and: [{ status: "active" }, { stock: { $gt: 0 } }] };
      if (searchIntent.brand) {
        filter.$and.push({ "brand.en.slug": searchIntent.brand.toLowerCase() });
      }
      if (searchIntent.category) {
        filter.$and.push({ "category.en.slug": searchIntent.category.toLowerCase() });
      }

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
        { 
          $project: { 
            _id: 1, en: 1, ar: 1, price: 1, slug: 1, 
            stock: 1, category: 1, brand: 1, images: 1, currency: 1 
          } 
        },
      ]).toArray();

      products = results;
      console.log("🔎 Found products:", products.length);
    } else if (intent === "support_request") {
      supportType = detectSupportType(userQuery);
      console.log("🎯 Support type:", supportType);
    }

    // Generate AI response for all cases
    reply = await generateAIResponse(salesModel, {
      userQuery,
      conversationHistory: conversation.messages,
      products,
      intent,
      supportType,
      followUpInfo,
      isFirstMessage
    });

  } catch (error) {
    console.error("❌ Error in processing:", error.message);
    
    // Even error messages are AI-generated
    reply = await generateAIResponse(salesModel, {
      userQuery: "حصل خطأ",
      conversationHistory: [],
      products: [],
      intent: "general_chat",
      isFirstMessage: false
    });
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
          metadata: {
            lastIntent: intent,
            lastSupportType: supportType,
            totalInteractions: (conversation.messages.length / 2) + 1
          }
        },
      },
      { upsert: true }
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
    metadata: {
      intent,
      supportType,
      productsFound: products.length,
      isFollowUp: followUpInfo.isFollowUp
    }
  };
}
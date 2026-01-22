import { ChatGroq } from "@langchain/groq";
import { HfInference } from "@huggingface/inference";
import mongoose from "mongoose";
import { createTicket, checkRepeatIssue } from "../services/ticket.services.js";
import "dotenv/config";

const { Binary } = mongoose.mongo;
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// ============================================================
// SUPPORT KNOWLEDGE BASE
// ============================================================

const SUPPORT_KNOWLEDGE = {
  order_tracking: {
    canSolve: false,
    confidence: "low",
    info: "نحتاج نتحقق من حالة الطلب في النظام"
  },
  return_exchange: {
    canSolve: true,
    confidence: "high",
    info: `سياسة الاسترجاع:
• 15 يوم من الاستلام
• المنتج بحالته الأصلية مع الفاتورة
• استرجاع مجاني للمنتجات المعيبة
• 25 ريال رسوم شحن للمنتجات السليمة
• المبلغ يرجع خلال 5-7 أيام عمل`
  },
  payment_issue: {
    canSolve: "partial",
    confidence: "medium",
    info: `طرق الدفع:
• فيزا/ماستركارد/مدى
• Apple Pay / STC Pay
• تابي وتمارا (تقسيط)
• الدفع عند الاستلام (أقل من 500 ريال)

مشاكل شائعة:
• تأكد من صلاحية البطاقة والرصيد
• جرب طريقة دفع أخرى`
  },
  warranty: {
    canSolve: true,
    confidence: "high",
    info: `الضمان:
• الأجهزة الكبيرة: سنتين
• الأجهزة الصغيرة: سنة
• الإكسسوارات: 6 أشهر

للمطالبة: رقم الطلب + وصف المشكلة + صورة`
  },
  complaint: {
    canSolve: false,
    confidence: "low",
    info: "الشكاوى تحتاج متابعة من فريق متخصص"
  },
  general_support: {
    canSolve: true,
    confidence: "high",
    info: `معلومات عامة:
• التوصيل: 2-5 أيام عمل
• توصيل مجاني فوق 200 ريال
• خدمة العملاء: 9ص - 11م
• واتساب: 0500123456`
  }
};

// ============================================================
// CHECK IF AI CAN SOLVE
// ============================================================

function canAISolve(userQuery, supportType) {
  const q = userQuery.toLowerCase();
  const knowledge = SUPPORT_KNOWLEDGE[supportType];

  // User explicitly wants human
  const wantsHuman = [/أبي موظف/, /كلم بشر/, /شكوى رسمية/, /مديرك/].some(p => p.test(q));
  if (wantsHuman) {
    return { canSolve: false, confidence: "low", reason: "العميل طلب موظف" };
  }

  // Complaint always needs human
  if (supportType === "complaint") {
    return { canSolve: false, confidence: "low", reason: "شكوى تحتاج متابعة" };
  }

  // Order tracking needs system lookup
  if (supportType === "order_tracking" && /\d{5,}/.test(q)) {
    return { canSolve: false, confidence: "low", reason: "يحتاج البحث في النظام" };
  }

  // Check knowledge base
  if (knowledge?.canSolve === true) {
    return { canSolve: true, confidence: knowledge.confidence, reason: null };
  }

  if (knowledge?.canSolve === "partial") {
    return { canSolve: true, confidence: "medium", reason: "قد يحتاج متابعة" };
  }

  return { canSolve: false, confidence: "low", reason: "يحتاج مراجعة بشرية" };
}

// ============================================================
// GENERATE AI SUPPORT RESPONSE
// ============================================================

async function generateSupportResponse(salesModel, {
  userQuery,
  conversationHistory,
  supportType,
  canSolve,
  ticketInfo,
  repeatInfo
}) {
  const knowledge = SUPPORT_KNOWLEDGE[supportType]?.info || "";

  const historyText = conversationHistory
    .slice(-4)
    .map(m => `${m.role === "user" ? "العميل" : "أنت"}: ${m.content}`)
    .join("\n");

  // Build context for AI
  let context = "";

  if (repeatInfo?.isRepeat) {
    context += `
⚠️ ملاحظة: هذا العميل عنده مشكلة متكررة (${repeatInfo.totalOccurrences} مرات)
آخر تذكرة: ${repeatInfo.lastTicket?.ticketId}
`;
  }

  if (canSolve) {
    context += `
يمكنك حل هذه المشكلة باستخدام المعلومات التالية:
${knowledge}

بعد الإجابة:
1. اعطه رقم التذكرة للمتابعة: ${ticketInfo.ticketId}
2. اسأله إذا المشكلة انحلت
3. اخبره يقدر يرد "ما انحلت" إذا يحتاج مساعدة إضافية
`;
  } else {
    context += `
لا يمكنك حل هذه المشكلة مباشرة.
رقم التذكرة: ${ticketInfo.ticketId}

يجب أن:
1. تطمئن العميل
2. تعطيه رقم التذكرة
3. تخبره أن فريق الدعم سيتواصل معه قريباً
`;
  }

  const prompt = `أنت مساعد دعم ذكي في متجر البا لإلكترونيات سعودي.

${historyText ? `المحادثة:\n${historyText}\n` : ""}

رسالة العميل: "${userQuery}"
نوع الطلب: ${supportType}

${context}

قواعد:
- اللهجة السعودية الودودة
- رد مختصر (3-4 جمل)
- دائماً اذكر رقم التذكرة: ${ticketInfo.ticketId}
- لا تخترع معلومات

ردك:`;

  try {
    const res = await salesModel.invoke(prompt);
    return (res?.content || "").trim();
  } catch (error) {
    return `أبشر، سجلت طلبك برقم ${ticketInfo.ticketId}. فريق الدعم سيتواصل معك قريباً.`;
  }
}

// ============================================================
// MAIN AGENT
// ============================================================

export async function callAgent(mongoClient, userQuery, threadId, clearHistory = false, customerInfo = {}) {
  console.log("\n========== 🤖 AGENT START ==========");
  console.log("📝 Query:", userQuery);

  const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
  const productsCol = db.collection("products");
  const conversationsCol = db.collection("conversations");

  const salesModel = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    apiKey: process.env.GROQ_API_KEY,
  });

  // Load conversation
  let conversation = { messages: [], lastProducts: [] };
  try {
    if (clearHistory) {
      await conversationsCol.deleteOne({ threadId });
    } else {
      const existing = await conversationsCol.findOne({ threadId });
      if (existing) {
        conversation = { messages: existing.messages || [], lastProducts: existing.lastProducts || [] };
      }
    }
  } catch (e) { /* ignore */ }

  // Detect intent
  const intent = await classifyIntent(userQuery);
  console.log("🎯 Intent:", intent);

  let reply = "";
  let products = [];
  let ticketInfo = null;
  let supportType = null;

  // ============================================================
  // HANDLE SUPPORT REQUEST
  // ============================================================

  if (intent === "support_request") {
    supportType = detectSupportType(userQuery);
    console.log("🎫 Support Type:", supportType);

    // Check if repeat issue
    const repeatInfo = await checkRepeatIssue(
      customerInfo.userId,
      supportType,
      userQuery
    );

    if (repeatInfo.isRepeat) {
      console.log("⚠️ Repeat Issue! Previous tickets:", repeatInfo.relatedTickets);
    }

    // Check if AI can solve
    const solveCheck = canAISolve(userQuery, supportType);
    console.log("🤖 Can AI Solve:", solveCheck.canSolve, "| Confidence:", solveCheck.confidence);

    // ALWAYS CREATE TICKET (for tracking)
    try {
      // Generate AI response first
      const tempTicketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
      
      const aiResponse = await generateSupportResponse(salesModel, {
        userQuery,
        conversationHistory: conversation.messages,
        supportType,
        canSolve: solveCheck.canSolve,
        ticketInfo: { ticketId: tempTicketId },
        repeatInfo
      });

      // Create ticket with all info
      ticketInfo = await createTicket({
        userQuery,
        supportType,
        customerInfo,
        threadId,
        conversationHistory: conversation.messages,
        aiResponse,
        aiResolved: solveCheck.canSolve,
        aiConfidenceLevel: solveCheck.confidence,
        escalationReason: solveCheck.reason
      });

      // Update response with real ticket ID
      reply = aiResponse.replace(tempTicketId, ticketInfo.ticketId);

      console.log("✅ Ticket:", ticketInfo.ticketId, "| AI Resolved:", ticketInfo.aiResolved);

    } catch (error) {
      console.error("❌ Error:", error);
      reply = "عذراً، في مشكلة تقنية. تواصل معنا على 0500123456";
    }

  // ============================================================
  // HANDLE PRODUCT SEARCH
  // ============================================================

  } else if (intent === "product_search" || intent === "recommendation") {
    // Extract STRICT filters from user query
    const filters = await extractProductFilters(userQuery);
    console.log("🔍 Strict Filters:", filters);

    const vector = await embed(userQuery);

    // Base filter for vector search (only supports basic operators, NOT $regex)
    const vectorSearchFilter = {
      $and: [
        { status: { $eq: "active" } },
        { stock: { $gt: 0 } }
      ]
    };

    // Build post-filter for product type and brand (supports $regex)
    const postFilterConditions = [];

    // STRICT product type filtering (post-filter with $regex)
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

    // STRICT brand filtering (post-filter with $regex)
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
          index: "vector_index",
          path: "embedding",
          queryVector: Binary.fromFloat32Array(new Float32Array(vector)),
          numCandidates: 500,
          limit: 50, // Fetch more to filter down
          filter: vectorSearchFilter
        }
      },
      {
        $project: {
          _id: 1, en: 1, ar: 1, price: 1, slug: 1, stock: 1, images: 1,
          brand: 1, category: 1, features: 1, warranty: 1, currency: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    // Add post-filter if we have product type or brand filters
    if (postFilterConditions.length > 0) {
      pipeline.push({
        $match: { $and: postFilterConditions }
      });
    }

    // Limit final results
    pipeline.push({ $limit: 10 });

    const results = await productsCol.aggregate(pipeline).toArray();

    products = results;

    // If no products found with strict filter, tell user instead of suggesting alternatives
    if (products.length === 0 && (filters.product_type || filters.brand)) {
      let noMatchMsg = "للأسف ما لقيت منتجات";
      if (filters.product_type && filters.brand) {
        noMatchMsg += ` من نوع "${filters.product_type}" وماركة "${filters.brand}"`;
      } else if (filters.product_type) {
        noMatchMsg += ` من نوع "${filters.product_type}"`;
      } else if (filters.brand) {
        noMatchMsg += ` من ماركة "${filters.brand}"`;
      }
      noMatchMsg += " متوفرة حالياً.\n\nتحب:\n- تغيّر نوع المنتج؟\n- تغيّر الماركة؟";
      reply = noMatchMsg;
    } else {
      reply = await generateAIResponse(salesModel, {
        userQuery,
        conversationHistory: conversation.messages,
        products,
        intent,
        filters // Pass filters to enforce strict recommendations
      });
    }

  // ============================================================
  // HANDLE GENERAL CHAT
  // ============================================================

  } else {
    reply = await generateAIResponse(salesModel, {
      userQuery,
      conversationHistory: conversation.messages,
      products: [],
      intent: "general_chat"
    });
  }

  // Save conversation
  try {
    const updatedMessages = [
      ...conversation.messages,
      { role: "user", content: userQuery, timestamp: new Date() },
      { role: "assistant", content: reply, timestamp: new Date() }
    ].slice(-20);

    await conversationsCol.updateOne(
      { threadId },
      {
        $set: {
          threadId,
          messages: updatedMessages,
          lastProducts: products.length > 0 ? products : conversation.lastProducts,
          lastActivity: new Date(),
          lastTicketId: ticketInfo?.ticketId || null
        }
      },
      { upsert: true }
    );
  } catch (e) { /* ignore */ }

  console.log("📤 Reply:", reply.substring(0, 80) + "...");
  console.log("========== 🤖 AGENT END ==========\n");

  return {
    reply,
    products: products.map(populateProductCard),
    sessionId: threadId,
    ticket: ticketInfo,
    metadata: {
      intent,
      supportType,
      aiResolved: ticketInfo?.aiResolved || false,
      isRepeatIssue: ticketInfo?.isRepeatIssue || false
    }
  };
}

// ============================================================
// HELPER FUNCTIONS (keep your existing ones)
// ============================================================

async function embed(text) {
  const res = await hf.featureExtraction({
    model: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    inputs: text,
  });
  return Array.isArray(res[0]) ? res[0] : res;
}

/**
 * Extract product type and brand from user query
 * Returns strictly required filters - NEVER broadens the search
 */
/**
 * Arabic to English product type mapping for quick local extraction
 */
const PRODUCT_TYPE_MAP = {
  'ثلاجة': 'refrigerator', 'ثلاجات': 'refrigerator',
  'غسالة': 'washing-machine', 'غسالات': 'washing-machine',
  'تلفزيون': 'tv', 'تلفاز': 'tv', 'شاشة': 'tv', 'شاشات': 'tv',
  'مكيف': 'air-conditioner', 'مكيفات': 'air-conditioner',
  'ميكروويف': 'microwave', 'مايكرويف': 'microwave',
  'فرن': 'oven', 'أفران': 'oven',
  'غسالة صحون': 'dishwasher', 'جلاية': 'dishwasher',
  'مكنسة': 'vacuum', 'مكانس': 'vacuum',
  'خلاط': 'blender', 'خلاطات': 'blender',
  'قهوة': 'coffee-maker', 'صانعة قهوة': 'coffee-maker',
  'فريزر': 'freezer', 'مجمد': 'freezer',
  'نشافة': 'dryer', 'مجفف': 'dryer',
  'طباخ': 'cooker', 'بوتاجاز': 'cooker',
  'شفاط': 'hood',
  'سخان': 'water-heater', 'سخانات': 'water-heater',
  'لابتوب': 'laptop', 'لاب توب': 'laptop', 'كمبيوتر': 'laptop',
  'جوال': 'mobile', 'موبايل': 'mobile', 'هاتف': 'mobile'
};

const BRAND_MAP = {
  'سامسونج': 'samsung', 'سامسونغ': 'samsung',
  'ال جي': 'lg', 'إل جي': 'lg',
  'سوني': 'sony',
  'فيليبس': 'philips',
  'بوش': 'bosch',
  'هاير': 'haier',
  'سيمنس': 'siemens', 'سيمينز': 'siemens',
  'هيتاشي': 'hitachi',
  'توشيبا': 'toshiba',
  'باناسونيك': 'panasonic',
  'شارب': 'sharp',
  'ويرلبول': 'whirlpool',
  'إلكترولوكس': 'electrolux',
  'بيكو': 'beko'
};

/**
 * Extract product type and brand from user query
 * Uses local mapping first, then falls back to LLM if needed
 */
async function extractProductFilters(query) {
  const queryLower = query.toLowerCase();
  let localFilters = { product_type: null, brand: null };

  // Try local extraction first (faster)
  for (const [ar, en] of Object.entries(PRODUCT_TYPE_MAP)) {
    if (queryLower.includes(ar)) {
      localFilters.product_type = en;
      break;
    }
  }
  for (const [ar, en] of Object.entries(BRAND_MAP)) {
    if (queryLower.includes(ar)) {
      localFilters.brand = en;
      break;
    }
  }

  // Check for English brand names directly
  const englishBrands = ['lg', 'samsung', 'sony', 'philips', 'bosch', 'haier', 'siemens', 'hitachi', 'toshiba', 'panasonic', 'sharp', 'whirlpool', 'electrolux', 'beko'];
  for (const brand of englishBrands) {
    if (queryLower.includes(brand)) {
      localFilters.brand = brand;
      break;
    }
  }

  // If local extraction found something, return it
  if (localFilters.product_type || localFilters.brand) {
    console.log("🎯 Local Extracted Filters:", localFilters);
    return localFilters;
  }

  // Fall back to LLM extraction
  try {
    const prompt = `You are a strict product filter extractor for an electronics e-commerce store.

User query: "${query}"

Extract ONLY what is EXPLICITLY mentioned:
- product_type: The exact product type in English (e.g., "refrigerator", "washing-machine", "tv", "laptop", "air-conditioner", "microwave", "oven", "dishwasher", "vacuum", "blender", "coffee-maker", "freezer", "dryer", "cooker", "hood", "water-heater")
- brand: The exact brand name in lowercase (e.g., "lg", "samsung", "sony", "philips", "bosch", "haier", "siemens", "hitachi", "toshiba", "panasonic", "sharp", "whirlpool", "electrolux", "beko")

STRICT RULES:
1. Only extract what the user EXPLICITLY stated
2. Do NOT infer, guess, or assume anything
3. Do NOT broaden categories (refrigerator stays refrigerator, NOT kitchen appliance)
4. If user says "ثلاجة" = refrigerator, "غسالة" = washing-machine, "تلفزيون/تلفاز" = tv, "مكيف" = air-conditioner
5. Return null if not explicitly mentioned

Return ONLY JSON: {"product_type": "type_or_null", "brand": "brand_or_null"}

Examples:
- "عاوز ثلاجات LG" → {"product_type": "refrigerator", "brand": "lg"}
- "غسالة سامسونج" → {"product_type": "washing-machine", "brand": "samsung"}
- "أبي تلفزيون" → {"product_type": "tv", "brand": null}
- "ما أفضل ماركة؟" → {"product_type": null, "brand": null}`;

    const res = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
    });

    const content = res.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Normalize null strings to actual null
      parsed.product_type = parsed.product_type === "null" ? null : parsed.product_type;
      parsed.brand = parsed.brand === "null" ? null : parsed.brand;
      console.log("🎯 LLM Extracted Filters:", parsed);
      return parsed;
    }
    return { product_type: null, brand: null };
  } catch (e) {
    console.error("⚠️ Filter extraction failed:", e.message);
    return { product_type: null, brand: null };
  }
}

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

function populateProductCard(p) {
  return {
    _id: p._id?.toString() || p._id,
    en: { title: p.en?.title || null },
    ar: { title: p.ar?.title || null },
    price: p.price ?? null,
    currency: p.currency || "SAR",
    brand: p.brand?.en?.name || p.brand?.en?.title || p.brand?.ar?.title || p.brand || null,
    category: p.category?.en?.slug || p.category?.en?.title || p.category?.ar?.title || p.category || null,
    stock: p.stock ?? null,
    images: Array.isArray(p.images) ? p.images : [],
    features: p.en?.features || p.ar?.features || p.features || [],
    warranty: p.en?.warranty || p.ar?.warranty || p.warranty || null,
    link: p.slug ? `/product/${p.slug}` : null,
    ui: { type: "product_card", addToCart: true, viewDetails: true },
  };
}

async function generateAIResponse(salesModel, context) {
  const {
    userQuery,
    conversationHistory = [],
    products = [],
    intent,
    supportType = null,
    followUpInfo = {},
    isFirstMessage = false,
    filters = {}
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
      const brand = p.brand?.en?.name || p.brand?.en?.title || p.brand?.ar?.title || p.brand || "غير محدد";
      const category = p.category?.en?.title || p.category?.ar?.title || p.category?.en?.slug || "غير محدد";
      const stock = p.stock || 0;
      return `${i + 1}. ${title}
   - السعر: ${price} ريال
   - الماركة: ${brand}
   - النوع: ${category}
   - المتوفر: ${stock} قطعة`;
    })
    .join("\n\n");

  // Build intent-specific instructions
  let intentInstructions = "";

  // Build strict filter context
  let strictFilterContext = "";
  if (filters.product_type || filters.brand) {
    strictFilterContext = `
⚠️ قواعد صارمة (لا يمكن كسرها):
- اقترح فقط المنتجات الموجودة في القائمة أدناه
- لا تقترح منتجات من أنواع أخرى
- لا توسّع البحث أو تقترح بدائل من فئات مختلفة
${filters.product_type ? `- نوع المنتج المطلوب: ${filters.product_type} فقط` : ""}
${filters.brand ? `- الماركة المطلوبة: ${filters.brand} فقط` : ""}
- إذا المنتج غير متوفر، قل ذلك مباشرة ولا تقترح ماركات أو أنواع أخرى
`;
  }

  switch(intent) {
    case "product_search":
    case "recommendation":
      if (products.length === 0) {
        intentInstructions = `
المنتج المطلوب غير متوفر حالياً.
- اعتذر بلطف
- لا تقترح منتجات من ماركات أو أنواع أخرى
- اسأل العميل إذا يحب يغير نوع المنتج أو الماركة`;
      } else {
        intentInstructions = `
${strictFilterContext}
عرض المنتجات المتوفرة:
- اذكر أهم 2-3 منتجات بمميزاتها من القائمة فقط
- قارن بينها بشكل مختصر
- اسأل عن التفضيلات (اللون، الحجم، الميزانية)
- لا تقترح منتجات غير موجودة في القائمة`;
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
      } else {
        intentInstructions = "تابع المحادثة بناءً على السياق السابق";
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
- اقترح فقط المنتجات الموجودة في القائمة
- لا تقترح منتجات من ماركات أو أنواع مختلفة عن المطلوب
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
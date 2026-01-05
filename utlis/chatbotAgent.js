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

  const prompt = `أنت عبدالله، مساعد دعم ذكي في متجر البا لإلكترونيات سعودي.

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
    // Your existing product search logic
    const vector = await embed(userQuery);
    
    const results = await productsCol.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: Binary.fromFloat32Array(new Float32Array(vector)),
          numCandidates: 80,
          limit: 5,
          filter: { $and: [{ status: "active" }, { stock: { $gt: 0 } }] }
        }
      },
      { $project: { _id: 1, en: 1, ar: 1, price: 1, slug: 1, stock: 1, images: 1 } }
    ]).toArray();

    products = results;

    reply = await generateAIResponse(salesModel, {
      userQuery,
      conversationHistory: conversation.messages,
      products,
      intent
    });

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
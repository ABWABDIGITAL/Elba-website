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

    // Detect sorting/comparison intent (highest price, cheapest, best discount, etc.)
    const sortingIntent = detectSortingIntent(userQuery);
    console.log("📊 Sorting Intent:", sortingIntent);

    // Detect detail-specific queries (warranty, size, features, specs, etc.)
    const detailQuery = detectDetailQuery(userQuery);
    console.log("📋 Detail Query:", detailQuery);

    const vector = await embed(userQuery);

    // Check if this is a special search type (like deals/offers)
    const isDealsSearch = filters.product_type === 'deals';

    // Base filter for vector search (only supports basic operators, NOT $regex)
    const vectorSearchFilter = {
      $and: [
        { status: { $eq: "active" } },
        { stock: { $gt: 0 } }
      ]
    };

    // Build post-filter for product type and brand (supports $regex)
    const postFilterConditions = [];

    // Add special filter for deals (products with discounts) - moved to post-filter
    // because discountPrice is not indexed for vector search pre-filter
    if (isDealsSearch) {
      postFilterConditions.push({ discountPrice: { $gt: 0 } });
    }

    // STRICT product type filtering (post-filter with $regex)
    // Skip for special search types like 'deals'
    if (filters.product_type && !isDealsSearch) {
      // Get all search terms (English + Arabic)
      const searchTerms = getProductTypeSearchTerms(filters.product_type);
      const regexPattern = searchTerms.join('|');
      console.log(`🔍 Product type filter: "${filters.product_type}" → regex: "${regexPattern}"`);

      postFilterConditions.push({
        $or: [
          { "category.en.slug": { $regex: regexPattern, $options: "i" } },
          { "category.en.name": { $regex: regexPattern, $options: "i" } },
          { "category.ar.name": { $regex: regexPattern, $options: "i" } },
          { "category.ar.slug": { $regex: regexPattern, $options: "i" } },
          { "en.title": { $regex: regexPattern, $options: "i" } },
          { "ar.title": { $regex: regexPattern, $options: "i" } },
          { "sku": { $regex: regexPattern, $options: "i" } } // Also search in SKU
        ]
      });
    }

    // STRICT brand filtering (post-filter with $regex)
    if (filters.brand) {
      postFilterConditions.push({
        $or: [
          { "brand.en.slug": { $regex: filters.brand, $options: "i" } },
          { "brand.en.name": { $regex: filters.brand, $options: "i" } },
          { "brand.ar.name": { $regex: filters.brand, $options: "i" } },
          { "en.title": { $regex: `\\b${filters.brand}\\b`, $options: "i" } },
          { "ar.title": { $regex: filters.brand, $options: "i" } }
        ]
      });
    }

    // When we have filters, we need to search MORE products to find matches
    const hasFilters = filters.product_type || filters.brand;
    const searchLimit = hasFilters ? 500 : 50; // Increased to 500 to find more matching products

    // Build aggregation pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: Binary.fromFloat32Array(new Float32Array(vector)),
          numCandidates: 1000,
          limit: searchLimit,
          filter: vectorSearchFilter
        }
      },
      {
        $project: {
          _id: 1, en: 1, ar: 1, price: 1, discountPrice: 1, discountPercentage: 1,
          slug: 1, stock: 1, images: 1, brand: 1, category: 1,
          modelNumber: 1, sku: 1, sizeType: 1, currencyCode: 1,
          ratingsAverage: 1, ratingsQuantity: 1, salesCount: 1, tags: 1,
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

    let results = await productsCol.aggregate(pipeline).toArray();
    console.log(`📊 Vector search + post-filter returned ${results.length} products`);

    // Log first few results to debug
    if (results.length > 0 && filters.product_type) {
      console.log("📋 First 3 results:");
      results.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.ar?.title || p.en?.title} | Category: ${p.category?.en?.slug || p.category?.ar?.name}`);
      });
    }

    // If vector search + post-filter returns nothing OR very few results, try direct category search
    // This ensures we ALWAYS prioritize the exact product type match
    if ((results.length === 0 || results.length < 3) && filters.product_type && !isDealsSearch) {
      console.log("⚠️ Vector search returned few/no matches, trying direct category search...");

      // Get all search terms (English + Arabic)
      const searchTerms = getProductTypeSearchTerms(filters.product_type);
      const regexPattern = searchTerms.join('|');

      const directFilter = {
        status: "active",
        stock: { $gt: 0 },
        $or: [
          { "category.en.slug": { $regex: regexPattern, $options: "i" } },
          { "category.en.name": { $regex: regexPattern, $options: "i" } },
          { "category.ar.name": { $regex: regexPattern, $options: "i" } },
          { "category.ar.slug": { $regex: regexPattern, $options: "i" } },
          { "en.title": { $regex: regexPattern, $options: "i" } },
          { "ar.title": { $regex: regexPattern, $options: "i" } },
          { "sku": { $regex: regexPattern, $options: "i" } }
        ]
      };

      // Add brand filter if specified
      if (filters.brand) {
        directFilter.$and = [{
          $or: [
            { "brand.en.slug": { $regex: filters.brand, $options: "i" } },
            { "brand.en.name": { $regex: filters.brand, $options: "i" } },
            { "brand.ar.name": { $regex: filters.brand, $options: "i" } },
            { "en.title": { $regex: filters.brand, $options: "i" } },
            { "ar.title": { $regex: filters.brand, $options: "i" } }
          ]
        }];
      }

      const directResults = await productsCol.find(directFilter)
        .project({
          _id: 1, en: 1, ar: 1, price: 1, discountPrice: 1, discountPercentage: 1,
          slug: 1, stock: 1, images: 1, brand: 1, category: 1,
          modelNumber: 1, sku: 1, sizeType: 1, currencyCode: 1,
          ratingsAverage: 1, ratingsQuantity: 1, salesCount: 1, tags: 1
        })
        .limit(10)
        .toArray();

      console.log(`✅ Direct search found ${directResults.length} products`);

      // Use direct results if they found more products
      if (directResults.length > results.length) {
        results = directResults;
        console.log("✅ Using direct search results (more matches)");
      }
    }

    products = results;

    // FINAL VALIDATION: Ensure all products match the requested product type
    // This is a last-line defense against any products that slipped through the filters
    if (filters.product_type && !isDealsSearch && products.length > 0) {
      const searchTerms = getProductTypeSearchTerms(filters.product_type);
      const validatedProducts = products.filter(p => {
        const title = ((p.ar?.title || '') + ' ' + (p.en?.title || '')).toLowerCase();
        const catName = ((p.category?.en?.name || '') + ' ' + (p.category?.ar?.name || '')).toLowerCase();
        const catSlug = ((p.category?.en?.slug || '') + ' ' + (p.category?.ar?.slug || '')).toLowerCase();
        const sku = (p.sku || '').toLowerCase();

        // Check if any search term matches
        return searchTerms.some(term => {
          const termLower = term.toLowerCase();
          return title.includes(termLower) || catName.includes(termLower) || catSlug.includes(termLower) || sku.includes(termLower);
        });
      });

      // Only use validated products if we found any, otherwise keep original (in case category names differ)
      if (validatedProducts.length > 0) {
        console.log(`✅ Final validation: ${validatedProducts.length}/${products.length} products match "${filters.product_type}"`);
        products = validatedProducts;
      } else {
        console.log(`⚠️ Final validation: No products match search terms, keeping ${products.length} results`);
      }
    }

    // Sort products based on user's sorting intent (highest price, cheapest, best discount, etc.)
    if (sortingIntent.sortBy && products.length > 0) {
      products = sortProductsByIntent(products, sortingIntent);
      console.log("📊 Products sorted by:", sortingIntent.sortBy, sortingIntent.order);
    }

    // Generate sorting context for LLM (accurate info about highest/lowest price, best discount, etc.)
    const sortingContext = generateSortingContext(products, sortingIntent);

    // Generate detail context for LLM (warranty, size, features, specs, etc.)
    const detailContext = generateDetailContext(products, detailQuery);

    // If no products found with strict filter, tell user instead of suggesting alternatives
    if (products.length === 0 && (filters.product_type || filters.brand)) {
      // Get Arabic name for the product type
      const productTypeArabic = getProductTypeArabicName(filters.product_type);

      let noMatchMsg = "للأسف ما لقيت منتجات";
      if (filters.product_type && filters.brand) {
        noMatchMsg += ` من نوع "${productTypeArabic}" وماركة "${filters.brand}"`;
      } else if (filters.product_type) {
        noMatchMsg += ` من نوع "${productTypeArabic}"`;
      } else if (filters.brand) {
        noMatchMsg += ` من ماركة "${filters.brand}"`;
      }
      noMatchMsg += " متوفرة حالياً.\n\nتحب:\n- تغيّر نوع المنتج؟\n- تغيّر الماركة؟";
      reply = noMatchMsg;
      console.log(`⚠️ No products found for: ${filters.product_type || ''} ${filters.brand || ''}`);
    } else {
      reply = await generateAIResponse(salesModel, {
        userQuery,
        conversationHistory: conversation.messages,
        products,
        intent,
        filters,
        sortingContext, // Pass sorting context for accurate price/discount info
        detailContext // Pass detail context for accurate specs/warranty/features info
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
  // Arabic keywords
  'ثلاجة': 'refrigerator', 'ثلاجات': 'refrigerator',
  'غسالة': 'washing-machine', 'غسالات': 'washing-machine',
  'تلفزيون': 'tv', 'تلفاز': 'tv', 'شاشة': 'tv', 'شاشات': 'tv', 'تلفزيونات': 'tv', 'تلفازات': 'tv',
  'مكيف': 'air-conditioner', 'مكيفات': 'air-conditioner', 'تكييف': 'air-conditioner',
  'ميكروويف': 'microwave', 'مايكرويف': 'microwave', 'ميكرويف': 'microwave',
  'فرن': 'oven', 'أفران': 'oven', 'افران': 'oven',
  'غسالة صحون': 'dishwasher', 'جلاية': 'dishwasher', 'جلايات': 'dishwasher', 'غسالات صحون': 'dishwasher',
  'مكنسة': 'vacuum', 'مكانس': 'vacuum', 'مكنسات': 'vacuum',
  'خلاط': 'blender', 'خلاطات': 'blender',
  'قهوة': 'coffee-maker', 'صانعة قهوة': 'coffee-maker', 'ماكينة قهوة': 'coffee-maker', 'مكينة قهوة': 'coffee-maker',
  'غلاية': 'kettle', 'غلايات': 'kettle', 'غلاية كهربائية': 'kettle', 'كاتل': 'kettle',
  'فريزر': 'freezer', 'مجمد': 'freezer', 'فريزرات': 'freezer', 'مجمدات': 'freezer',
  'نشافة': 'dryer', 'مجفف': 'dryer', 'نشافات': 'dryer', 'مجففات': 'dryer',
  'طباخ': 'cooker', 'بوتاجاز': 'cooker', 'طباخات': 'cooker', 'فرن غاز': 'cooker',
  'شفاط': 'hood', 'شفاطات': 'hood',
  'سخان': 'water-heater', 'سخانات': 'water-heater',
  'لابتوب': 'laptop', 'لاب توب': 'laptop', 'كمبيوتر': 'laptop', 'لابتوبات': 'laptop', 'كمبيوترات': 'laptop',
  'جوال': 'mobile', 'موبايل': 'mobile', 'هاتف': 'mobile', 'جوالات': 'mobile', 'موبايلات': 'mobile', 'هواتف': 'mobile',
  // Small appliances (Arabic)
  'توستر': 'toaster', 'محمصة': 'toaster', 'محمصة خبز': 'toaster',
  'مكواة': 'iron', 'مكوى': 'iron', 'مكاوي': 'iron',
  'عصارة': 'juicer', 'عصارات': 'juicer',
  'قلاية': 'air-fryer', 'قلاية هوائية': 'air-fryer', 'اير فراير': 'air-fryer',
  'شواية': 'grill', 'شوايات': 'grill', 'جريل': 'grill',
  'خباز': 'sandwich-maker', 'صانعة ساندويتش': 'sandwich-maker',
  'مطحنة': 'grinder', 'طحانة': 'grinder', 'مطحنة قهوة': 'grinder',
  // English keywords (so "kettle", "oven", etc. work directly)
  'refrigerator': 'refrigerator', 'fridge': 'refrigerator',
  'washing machine': 'washing-machine', 'washer': 'washing-machine',
  'television': 'tv', 'tv': 'tv',
  'air conditioner': 'air-conditioner', 'ac': 'air-conditioner',
  'microwave': 'microwave',
  'oven': 'oven',
  'dishwasher': 'dishwasher',
  'vacuum': 'vacuum', 'vacuum cleaner': 'vacuum',
  'blender': 'blender',
  'coffee maker': 'coffee-maker', 'coffee machine': 'coffee-maker',
  'kettle': 'kettle', 'electric kettle': 'kettle',
  'freezer': 'freezer',
  'dryer': 'dryer',
  'cooker': 'cooker', 'stove': 'cooker',
  'hood': 'hood', 'range hood': 'hood',
  'water heater': 'water-heater', 'heater': 'water-heater',
  'laptop': 'laptop', 'notebook': 'laptop',
  'mobile': 'mobile', 'phone': 'mobile', 'smartphone': 'mobile',
  'toaster': 'toaster',
  'iron': 'iron',
  'juicer': 'juicer',
  'air fryer': 'air-fryer', 'airfryer': 'air-fryer',
  'grill': 'grill',
  'sandwich maker': 'sandwich-maker',
  'grinder': 'grinder', 'coffee grinder': 'grinder',
  // Special categories
  'عروض': 'deals', 'عروض اليوم': 'deals', 'تخفيضات': 'deals', 'خصم': 'deals', 'خصومات': 'deals',
  'deals': 'deals', 'offers': 'deals', 'sale': 'deals'
};

// Special search type for deals/offers
const SPECIAL_SEARCH_TYPES = {
  'deals': { discountPrice: { $gt: 0 } }  // Products with discounts
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

// Reverse mapping: English -> Arabic for searching (includes singular/plural forms)
const PRODUCT_TYPE_AR_MAP = {
  'refrigerator': ['ثلاجة', 'ثلاجات', 'refrigerator', 'refrigerators', 'fridge', 'fridges'],
  'washing-machine': ['غسالة', 'غسالات', 'washing', 'washer', 'washers', 'washing-machine', 'washing-machines'],
  'tv': ['تلفزيون', 'تلفاز', 'شاشة', 'شاشات', 'تلفزيونات', 'تلفازات', 'television', 'televisions', 'tv', 'tvs'],
  'air-conditioner': ['مكيف', 'مكيفات', 'تكييف', 'air-conditioner', 'air-conditioners', 'air conditioner', 'air conditioners', 'ac', 'acs', 'a/c'],
  'microwave': ['ميكروويف', 'مايكرويف', 'ميكرويف', 'microwave', 'microwaves'],
  'oven': ['فرن', 'أفران', 'افران', 'oven', 'ovens'],
  'dishwasher': ['غسالة صحون', 'غسالات صحون', 'جلاية', 'جلايات', 'dishwasher', 'dishwashers'],
  'vacuum': ['مكنسة', 'مكانس', 'مكنسات', 'vacuum', 'vacuums', 'vacuum-cleaner', 'vacuum-cleaners'],
  'blender': ['خلاط', 'خلاطات', 'blender', 'blenders'],
  'coffee-maker': ['قهوة', 'صانعة قهوة', 'ماكينة قهوة', 'مكينة قهوة', 'coffee', 'coffee-maker', 'coffee-makers'],
  'kettle': ['غلاية', 'غلايات', 'غلاية كهربائية', 'كاتل', 'kettle', 'kettles', 'electric kettle'],
  'freezer': ['فريزر', 'مجمد', 'فريزرات', 'مجمدات', 'freezer', 'freezers'],
  'dryer': ['نشافة', 'مجفف', 'نشافات', 'مجففات', 'dryer', 'dryers'],
  'cooker': ['طباخ', 'بوتاجاز', 'طباخات', 'فرن غاز', 'cooker', 'cookers', 'stove', 'stoves'],
  'hood': ['شفاط', 'شفاطات', 'hood', 'hoods', 'range-hood'],
  'water-heater': ['سخان', 'سخانات', 'heater', 'heaters', 'water-heater', 'water-heaters'],
  'laptop': ['لابتوب', 'لاب توب', 'كمبيوتر', 'لابتوبات', 'كمبيوترات', 'laptop', 'laptops', 'notebook', 'notebooks'],
  'mobile': ['جوال', 'موبايل', 'هاتف', 'جوالات', 'موبايلات', 'هواتف', 'phone', 'phones', 'mobile', 'mobiles', 'smartphone', 'smartphones'],
  // Small appliances
  'toaster': ['توستر', 'محمصة', 'محمصة خبز', 'toaster', 'toasters'],
  'iron': ['مكواة', 'مكوى', 'مكاوي', 'iron', 'irons'],
  'juicer': ['عصارة', 'عصارات', 'juicer', 'juicers'],
  'air-fryer': ['قلاية', 'قلاية هوائية', 'اير فراير', 'airfryer', 'air-fryer', 'air fryer', 'air-fryers'],
  'grill': ['شواية', 'شوايات', 'جريل', 'grill', 'grills'],
  'sandwich-maker': ['خباز', 'صانعة ساندويتش', 'sandwich-maker', 'sandwich maker', 'sandwich-makers'],
  'grinder': ['مطحنة', 'طحانة', 'مطحنة قهوة', 'grinder', 'grinders', 'coffee grinder']
};

/**
 * Get all search terms for a product type (English + Arabic)
 */
function getProductTypeSearchTerms(productType) {
  return PRODUCT_TYPE_AR_MAP[productType] || [productType];
}

/**
 * Get Arabic display name for a product type
 */
function getProductTypeArabicName(productType) {
  const arabicNames = {
    'refrigerator': 'ثلاجة',
    'washing-machine': 'غسالة',
    'tv': 'تلفزيون',
    'air-conditioner': 'مكيف',
    'microwave': 'ميكروويف',
    'oven': 'فرن',
    'dishwasher': 'غسالة صحون',
    'vacuum': 'مكنسة',
    'blender': 'خلاط',
    'coffee-maker': 'صانعة قهوة',
    'kettle': 'غلاية',
    'freezer': 'فريزر',
    'dryer': 'نشافة',
    'cooker': 'طباخ',
    'hood': 'شفاط',
    'water-heater': 'سخان',
    'laptop': 'لابتوب',
    'mobile': 'جوال',
    'toaster': 'توستر',
    'iron': 'مكواة',
    'juicer': 'عصارة',
    'air-fryer': 'قلاية هوائية',
    'grill': 'شواية',
    'sandwich-maker': 'صانعة ساندويتش',
    'grinder': 'مطحنة',
    'deals': 'عروض'
  };
  return arabicNames[productType] || productType;
}

/**
 * Detect sorting/comparison intent from user query
 * Returns: { sortBy: 'price'|'discount'|'rating'|null, order: 'asc'|'desc', queryType: string|null }
 */
function detectSortingIntent(query) {
  const q = query.toLowerCase();

  // Highest/most expensive price
  const highPricePatterns = [
    /أغلى/, /اغلى/, /أعلى سعر/, /اعلى سعر/, /أكبر سعر/, /اكبر سعر/,
    /الأغلى/, /الاغلى/, /أعلى/, /اعلى/, /الأعلى/, /الاعلى/,
    /most expensive/, /highest price/, /biggest price/
  ];

  // Lowest/cheapest price
  const lowPricePatterns = [
    /أرخص/, /ارخص/, /أقل سعر/, /اقل سعر/, /أصغر سعر/, /اصغر سعر/,
    /الأرخص/, /الارخص/, /أقل/, /اقل/, /الأقل/, /الاقل/,
    /cheapest/, /lowest price/, /smallest price/
  ];

  // Best discount
  const discountPatterns = [
    /أكبر خصم/, /اكبر خصم/, /أعلى خصم/, /اعلى خصم/,
    /أفضل عرض/, /افضل عرض/, /أكبر تخفيض/, /اكبر تخفيض/,
    /biggest discount/, /best deal/, /highest discount/
  ];

  // Best rated
  const ratingPatterns = [
    /أفضل تقييم/, /افضل تقييم/, /أعلى تقييم/, /اعلى تقييم/,
    /الأعلى تقييم/, /الاعلى تقييم/, /best rated/, /highest rated/, /top rated/
  ];

  // Price comparison
  const priceComparePatterns = [
    /كم سعر/, /بكم/, /سعره/, /أسعار/, /اسعار/, /السعر/,
    /how much/, /price of/, /what.*price/
  ];

  if (highPricePatterns.some(p => p.test(q))) {
    return { sortBy: 'price', order: 'desc', queryType: 'highest_price' };
  }

  if (lowPricePatterns.some(p => p.test(q))) {
    return { sortBy: 'price', order: 'asc', queryType: 'lowest_price' };
  }

  if (discountPatterns.some(p => p.test(q))) {
    return { sortBy: 'discount', order: 'desc', queryType: 'best_discount' };
  }

  if (ratingPatterns.some(p => p.test(q))) {
    return { sortBy: 'rating', order: 'desc', queryType: 'best_rated' };
  }

  if (priceComparePatterns.some(p => p.test(q))) {
    return { sortBy: null, order: null, queryType: 'price_inquiry' };
  }

  return { sortBy: null, order: null, queryType: null };
}

/**
 * Detect detail-specific queries (size, warranty, features, specs, etc.)
 * Returns: { detailType: string|null, patterns: string[] }
 */
function detectDetailQuery(query) {
  const q = query.toLowerCase();

  const detailPatterns = {
    'warranty': [/ضمان/, /كفالة/, /warranty/, /guarantee/],
    'size': [/حجم/, /قياس/, /أبعاد/, /ابعاد/, /مقاس/, /size/, /dimensions/],
    'weight': [/وزن/, /ثقيل/, /خفيف/, /weight/],
    'color': [/لون/, /ألوان/, /الوان/, /color/, /colours/],
    'capacity': [/سعة/, /لتر/, /كيلو/, /capacity/, /liters/, /litres/],
    'power': [/قوة/, /واط/, /كهرباء/, /استهلاك/, /power/, /watt/, /watts/],
    'features': [/مميزات/, /خصائص/, /ميزة/, /features/, /characteristics/],
    'specs': [/مواصفات/, /تفاصيل/, /specifications/, /specs/, /details/],
    'rating': [/تقييم/, /تقييمات/, /رأي/, /آراء/, /rating/, /ratings/, /reviews/],
    'model': [/موديل/, /إصدار/, /اصدار/, /model/, /version/],
    'brand_info': [/معلومات.*ماركة/, /عن الماركة/, /about.*brand/],
    'comparison': [/مقارنة/, /الفرق/, /أفضل/, /افضل/, /compare/, /difference/, /better/]
  };

  for (const [detailType, patterns] of Object.entries(detailPatterns)) {
    if (patterns.some(p => p.test(q))) {
      return { detailType, patterns: patterns.map(p => p.source) };
    }
  }

  return { detailType: null, patterns: [] };
}

/**
 * Sort products based on detected intent
 */
function sortProductsByIntent(products, sortingIntent) {
  if (!sortingIntent.sortBy || !products.length) return products;

  const sorted = [...products].sort((a, b) => {
    const priceA = a.price || 0;
    const priceB = b.price || 0;
    const discountA = a.discountPrice || 0;
    const discountB = b.discountPrice || 0;
    const finalPriceA = discountA > 0 ? priceA - discountA : priceA;
    const finalPriceB = discountB > 0 ? priceB - discountB : priceB;

    if (sortingIntent.sortBy === 'price') {
      return sortingIntent.order === 'desc' ? finalPriceB - finalPriceA : finalPriceA - finalPriceB;
    }

    if (sortingIntent.sortBy === 'discount') {
      // Sort by discount percentage or amount
      const discountPercentA = a.discountPercentage || (discountA > 0 ? (discountA / priceA) * 100 : 0);
      const discountPercentB = b.discountPercentage || (discountB > 0 ? (discountB / priceB) * 100 : 0);
      return sortingIntent.order === 'desc' ? discountPercentB - discountPercentA : discountPercentA - discountPercentB;
    }

    if (sortingIntent.sortBy === 'rating') {
      const ratingA = a.ratingsAverage || 0;
      const ratingB = b.ratingsAverage || 0;
      return sortingIntent.order === 'desc' ? ratingB - ratingA : ratingA - ratingB;
    }

    return 0;
  });

  return sorted;
}

/**
 * Generate sorting context for LLM prompt
 */
function generateSortingContext(products, sortingIntent) {
  if (!sortingIntent.queryType || !products.length) return '';

  const firstProduct = products[0];
  const title = firstProduct.ar?.title || firstProduct.en?.title || 'المنتج';
  const price = firstProduct.price || 0;
  const discountPrice = firstProduct.discountPrice || 0;
  const finalPrice = discountPrice > 0 ? price - discountPrice : price;
  const discountPercent = firstProduct.discountPercentage || (discountPrice > 0 ? Math.round((discountPrice / price) * 100) : 0);

  switch (sortingIntent.queryType) {
    case 'highest_price':
      return `
🎯 معلومة دقيقة (استخدمها في ردك):
أغلى منتج هو: "${title}" بسعر ${finalPrice} ريال
- هذه المعلومة مؤكدة من قاعدة البيانات
- لا تذكر منتج آخر على أنه الأغلى`;

    case 'lowest_price':
      return `
🎯 معلومة دقيقة (استخدمها في ردك):
أرخص منتج هو: "${title}" بسعر ${finalPrice} ريال
- هذه المعلومة مؤكدة من قاعدة البيانات
- لا تذكر منتج آخر على أنه الأرخص`;

    case 'best_discount':
      return `
🎯 معلومة دقيقة (استخدمها في ردك):
أفضل عرض هو: "${title}" بخصم ${discountPercent}% (وفّر ${discountPrice} ريال)
السعر بعد الخصم: ${finalPrice} ريال (بدلاً من ${price} ريال)
- هذه المعلومة مؤكدة من قاعدة البيانات
- لا تذكر منتج آخر على أنه الأفضل عرضاً`;

    case 'best_rated':
      const ratingProduct = products[0];
      const rTitle = ratingProduct.ar?.title || ratingProduct.en?.title || 'المنتج';
      const rAvg = ratingProduct.ratingsAverage || 0;
      const rCount = ratingProduct.ratingsQuantity || 0;
      return `
🎯 معلومة دقيقة (استخدمها في ردك):
أعلى منتج تقييماً هو: "${rTitle}" بتقييم ${rAvg}/5 (${rCount} تقييم)
- هذه المعلومة مؤكدة من قاعدة البيانات
- لا تذكر منتج آخر على أنه الأعلى تقييماً`;

    case 'price_inquiry':
      return `
🎯 أسعار المنتجات (معلومات دقيقة من قاعدة البيانات):
${products.slice(0, 5).map((p, i) => {
  const t = p.ar?.title || p.en?.title || 'منتج';
  const pr = p.price || 0;
  const dp = p.discountPrice || 0;
  const fp = dp > 0 ? pr - dp : pr;
  return `${i + 1}. ${t}: ${fp} ريال${dp > 0 ? ` (خصم ${dp} ريال)` : ''}`;
}).join('\n')}
- استخدم هذه الأسعار بالضبط في ردك`;

    default:
      return '';
  }
}

/**
 * Generate detail-specific context for LLM prompt
 */
function generateDetailContext(products, detailQuery) {
  if (!detailQuery.detailType || !products.length) return '';

  const detailLabels = {
    'warranty': 'الضمان',
    'size': 'الحجم/الأبعاد',
    'weight': 'الوزن',
    'color': 'الألوان',
    'capacity': 'السعة',
    'power': 'استهلاك الطاقة',
    'features': 'المميزات',
    'specs': 'المواصفات',
    'rating': 'التقييم',
    'model': 'الموديل',
    'comparison': 'المقارنة'
  };

  const label = detailLabels[detailQuery.detailType] || detailQuery.detailType;

  // Build detail info for each product
  const detailInfo = products.slice(0, 5).map((p, i) => {
    const title = p.ar?.title || p.en?.title || 'منتج';
    const specs = p.ar?.specifications || p.en?.specifications || [];
    const features = p.ar?.features || p.en?.features || [];
    const warranty = p.ar?.warranty || p.en?.warranty || 'غير محدد';

    let info = `${i + 1}. ${title}:`;

    switch (detailQuery.detailType) {
      case 'warranty':
        info += ` الضمان: ${warranty}`;
        break;

      case 'size':
      case 'weight':
      case 'capacity':
      case 'power':
        const relevantSpecs = specs.filter(s => {
          const key = (s.key || '').toLowerCase();
          const group = (s.group || '').toLowerCase();
          if (detailQuery.detailType === 'size') return key.includes('حجم') || key.includes('أبعاد') || key.includes('قياس') || key.includes('dimension') || key.includes('size');
          if (detailQuery.detailType === 'weight') return key.includes('وزن') || key.includes('weight');
          if (detailQuery.detailType === 'capacity') return key.includes('سعة') || key.includes('لتر') || key.includes('capacity') || key.includes('liter');
          if (detailQuery.detailType === 'power') return key.includes('واط') || key.includes('طاقة') || key.includes('استهلاك') || key.includes('power') || key.includes('watt');
          return false;
        });
        if (relevantSpecs.length > 0) {
          info += ` ${relevantSpecs.map(s => `${s.key}: ${s.value}${s.unit ? ' ' + s.unit : ''}`).join(' | ')}`;
        } else {
          info += ' غير متوفر';
        }
        break;

      case 'features':
        if (features.length > 0) {
          info += `\n   المميزات: ${features.slice(0, 5).join('، ')}`;
        } else {
          info += ' لا توجد مميزات مسجلة';
        }
        break;

      case 'specs':
        if (specs.length > 0) {
          info += `\n   ${specs.slice(0, 6).map(s => `${s.key}: ${s.value}${s.unit ? ' ' + s.unit : ''}`).join('\n   ')}`;
        } else {
          info += ' لا توجد مواصفات مسجلة';
        }
        break;

      case 'rating':
        const avg = p.ratingsAverage || 0;
        const count = p.ratingsQuantity || 0;
        info += ` التقييم: ${avg}/5 (${count} تقييم)`;
        break;

      case 'model':
        info += ` الموديل: ${p.modelNumber || 'غير محدد'}`;
        break;

      case 'comparison':
        const price = p.price || 0;
        const dp = p.discountPrice || 0;
        const fp = dp > 0 ? price - dp : price;
        info += `\n   - السعر: ${fp} ريال`;
        info += `\n   - الضمان: ${warranty}`;
        info += `\n   - التقييم: ${p.ratingsAverage || 0}/5`;
        if (features.length > 0) info += `\n   - المميزات: ${features.slice(0, 3).join('، ')}`;
        break;

      default:
        break;
    }

    return info;
  }).join('\n');

  return `
🎯 معلومات ${label} (من قاعدة البيانات):
${detailInfo}
- استخدم هذه المعلومات بالضبط في ردك`;
}

/**
 * Extract product type and brand from user query
 * Uses local mapping first, then falls back to LLM if needed
 */
async function extractProductFilters(query) {
  const queryLower = query.toLowerCase();
  let localFilters = { product_type: null, brand: null };

  // Sort keys by length (longer first) to avoid partial matches
  // e.g., "غلاية كهربائية" should match before "غلاية"
  const sortedProductTypes = Object.entries(PRODUCT_TYPE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  // Try local extraction first (faster)
  for (const [keyword, productType] of sortedProductTypes) {
    if (queryLower.includes(keyword.toLowerCase())) {
      localFilters.product_type = productType;
      console.log(`🎯 Local match: "${keyword}" → "${productType}"`);
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
  const price = p.price ?? 0;
  const discountPrice = p.discountPrice ?? 0;
  // Calculate final price (price - discountPrice), NOT using virtual field
  const calculatedFinalPrice = discountPrice > 0 ? price - discountPrice : price;

  // Extract specifications for common attributes (size, weight, color, capacity, etc.)
  const specs = p.ar?.specifications || p.en?.specifications || [];
  const specMap = {};
  specs.forEach(s => {
    if (s.key && s.value) {
      specMap[s.key.toLowerCase()] = s.value + (s.unit ? ` ${s.unit}` : '');
    }
  });

  // Extract details
  const details = p.ar?.details || p.en?.details || [];
  const detailMap = {};
  details.forEach(d => {
    if (d.key && d.value) {
      detailMap[d.key.toLowerCase()] = d.value;
    }
  });

  return {
    _id: p._id?.toString() || p._id,
    en: {
      title: p.en?.title || null,
      subTitle: p.en?.subTitle || null,
      description: p.en?.description || [],
      features: p.en?.features || [],
      warranty: p.en?.warranty || null,
      specifications: p.en?.specifications || [],
      details: p.en?.details || []
    },
    ar: {
      title: p.ar?.title || null,
      subTitle: p.ar?.subTitle || null,
      description: p.ar?.description || [],
      features: p.ar?.features || [],
      warranty: p.ar?.warranty || null,
      specifications: p.ar?.specifications || [],
      details: p.ar?.details || []
    },
    price: price,
    discountPrice: discountPrice > 0 ? discountPrice : null,
    discountPercentage: p.discountPercentage ?? null,
    finalPrice: calculatedFinalPrice,
    currency: p.currencyCode || "SAR",
    brand: p.brand?.en?.name || p.brand?.ar?.name || p.brand?.en?.slug || p.brand || null,
    category: p.category?.en?.name || p.category?.ar?.name || p.category?.en?.slug || p.category || null,
    stock: p.stock ?? null,
    images: Array.isArray(p.images) ? p.images : [],
    modelNumber: p.modelNumber || null,
    sku: p.sku || null,
    sizeType: p.sizeType || null,
    ratingsAverage: p.ratingsAverage ?? 0,
    ratingsQuantity: p.ratingsQuantity ?? 0,
    salesCount: p.salesCount ?? 0,
    tags: p.tags || [],
    // Quick access to common specs
    specs: specMap,
    details: detailMap,
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
    filters = {},
    sortingContext = '',
    detailContext = ''
  } = context;

  // Build conversation history
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "العميل" : "المساعد"}: ${m.content}`)
    .join("\n");

  // Build product list if available with FULL details
  const productList = products
    .slice(0, 5)
    .map((p, i) => {
      const title = p.ar?.title || p.en?.title || "منتج";
      const subTitle = p.ar?.subTitle || p.en?.subTitle || "";
      const price = p.price || 0;
      const discountPrice = p.discountPrice || 0;
      const finalPrice = discountPrice > 0 ? price - discountPrice : price;
      const brand = p.brand?.en?.name || p.brand?.ar?.name || p.brand?.en?.slug || p.brand || "غير محدد";
      const category = p.category?.en?.name || p.category?.ar?.name || p.category?.en?.slug || "غير محدد";
      const stock = p.stock || 0;
      const warranty = p.ar?.warranty || p.en?.warranty || "غير محدد";
      const features = p.ar?.features || p.en?.features || [];
      const specifications = p.ar?.specifications || p.en?.specifications || [];
      const modelNumber = p.modelNumber || "";
      const ratingsAverage = p.ratingsAverage || 0;
      const ratingsQuantity = p.ratingsQuantity || 0;
      const tags = p.tags || [];

      let priceText = `${finalPrice} ريال`;
      if (discountPrice > 0) {
        const discountPercent = p.discountPercentage || Math.round((discountPrice / price) * 100);
        priceText = `${finalPrice} ريال (خصم ${discountPercent}% - وفّر ${discountPrice} ريال)`;
      }

      // Build specifications text
      let specsText = "";
      if (specifications.length > 0) {
        const importantSpecs = specifications.slice(0, 6).map(s => {
          const unit = s.unit ? ` ${s.unit}` : "";
          return `${s.key}: ${s.value}${unit}`;
        });
        specsText = `\n   - المواصفات: ${importantSpecs.join(" | ")}`;
      }

      // Build features text
      let featuresText = "";
      if (features.length > 0) {
        featuresText = `\n   - المميزات: ${features.slice(0, 4).join("، ")}`;
      }

      // Build tags text
      let tagsText = "";
      if (tags.length > 0) {
        const tagLabels = {
          'best_seller': 'الأكثر مبيعاً',
          'hot': 'رائج',
          'new_arrival': 'وصل حديثاً',
          'trending': 'شائع',
          'featured': 'مميز',
          'on_sale': 'عرض خاص',
          'top_rated': 'الأعلى تقييماً'
        };
        const arabicTags = tags.map(t => tagLabels[t] || t).join("، ");
        tagsText = ` [${arabicTags}]`;
      }

      // Build rating text
      let ratingText = "";
      if (ratingsAverage > 0) {
        ratingText = `\n   - التقييم: ${ratingsAverage}/5 (${ratingsQuantity} تقييم)`;
      }

      return `${i + 1}. ${title}${tagsText}${subTitle ? `\n   ${subTitle}` : ""}${modelNumber ? `\n   - موديل: ${modelNumber}` : ""}
   - السعر: ${priceText}
   - الماركة: ${brand}
   - النوع: ${category}
   - الضمان: ${warranty}
   - المتوفر: ${stock} قطعة${specsText}${featuresText}${ratingText}`;
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
${sortingContext ? `${sortingContext}\n` : ""}${detailContext ? `${detailContext}\n` : ""}
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
- إذا وُجدت "معلومة دقيقة" في السياق، استخدمها بالضبط ولا تغير الأرقام أو المنتجات
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
// ============================================================
// IMPORTS
// ============================================================
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { HfInference } from "@huggingface/inference";
import mongoose from "mongoose";
import { z } from "zod";
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
    const prompt = `
Extract search filters from this query.
Return JSON only:
{ "category": "string or null", "brand": "string or null" }

Query: "${query}"
`;
    const res = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
    });

    const text = res.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch (e) {
    console.error("extractSearchIntent error:", e.message);
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
    ui: {
      type: "product_card",
      addToCart: true,
      viewDetails: true,
    },
  };
}

async function generateRecommendationReply(salesModel, userQuery, products) {
  try {
    const top = products
      .map((p) => p.en?.title || p.ar?.title)
      .filter(Boolean)
      .slice(0, 5);

    if (top.length === 0) {
      return "عندنا منتجات كتير تناسبك. تحب تقولّي الميزانية عشان أرشحلك الأنسب؟";
    }

    const prompt = `
أنت مساعد مبيعات محترف في متجر إلكترونيات وأجهزة منزلية.

رسالة العميل:
"${userQuery}"

دي المنتجات اللي عندنا (أسامي بس):
- ${top.join("\n- ")}

اكتب رد عربي قصير ومقنع يساعد العميل يختار (بدون اختراع مواصفات غير موجودة).
- اقترح 2-3 اختيارات من اللي فوق
- اسأل سؤال متابعة واحد ذكي يساعد في التصفية (ميزانية؟ مقاس؟ نوع تركيبه؟)
- خليك لطيف ومباشر
`;

    const res = await salesModel.invoke(prompt);
    return (res?.content || "").trim() || "دي أفضل اختيارات متاحة عندنا حاليًا. تحب ميزانية في حدود كام؟";
  } catch (e) {
    console.error("generateRecommendationReply error:", e.message);
    return "دي أفضل اختيارات متاحة عندنا حاليًا. تحب ميزانية في حدود كام؟";
  }
}

// ============================================================
// MAIN AGENT
// ============================================================

export async function callAgent(mongoClient, userQuery, threadId, clearHistory = false) {
  console.log("\n========== AGENT START ==========");
  console.log("Query:", userQuery);
  console.log("ThreadId:", threadId);

  const dbName = process.env.DB_NAME || "Alba-ECommerce";
  const productsCol = mongoClient.db(dbName).collection("products");

  // Shared state for this invocation
  const agentState = {
    userQuery,
    intent: null,
    finalResponse: null,
  };

  // ----------------------------------------------------------
  // TOOLS
  // ----------------------------------------------------------

  const classifyIntentTool = tool(
    async ({ query }) => {
      console.log("🔧 Tool: classify_intent called with:", query);
      try {
        const prompt = `
You are an e-commerce intent classifier.

Pick ONE intent:
- product_search        (explicit product lookup)
- recommendation        (buying advice, choosing, gift/wedding/home setup)
- support_request       (delivery/order issue, complaint)
- general_chat          (greeting/unclear)

Return JSON only:
{ "intent": "product_search | recommendation | support_request | general_chat" }

User message:
"${query}"
`;
        const res = await hf.chatCompletion({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 40,
        });

        const text = res.choices?.[0]?.message?.content || "";
        console.log("🔧 Intent raw response:", text);
        
        const match = text.match(/\{[\s\S]*\}/);
        const result = match ? match[0] : JSON.stringify({ intent: "general_chat" });
        console.log("🔧 Intent result:", result);
        return result;
      } catch (e) {
        console.error("🔧 classify_intent error:", e.message);
        return JSON.stringify({ intent: "general_chat" });
      }
    },
    {
      name: "classify_intent",
      description: "Classify user intent into product_search, recommendation, support_request, or general_chat",
      schema: z.object({ query: z.string().describe("The user query to classify") }),
    }
  );

  const productLookupTool = tool(
    async ({ query, n = 5 }) => {
      console.log("🔧 Tool: product_lookup called with:", query, "n:", n);
      try {
        const [vector, intent] = await Promise.all([
          embed(query),
          extractSearchIntent(query),
        ]);

        console.log("🔧 Vector length:", vector?.length);
        console.log("🔧 Search intent:", intent);

        const filter = {
          $and: [{ status: "active" }, { stock: { $gt: 0 } }],
        };

        if (intent.brand) filter.$and.push({ "brand.en.slug": intent.brand.toLowerCase() });
        if (intent.category) filter.$and.push({ "category.en.slug": intent.category.toLowerCase() });

        const pipeline = [
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: Binary.fromFloat32Array(new Float32Array(vector)),
              numCandidates: 80,
              limit: n,
              filter,
            },
          },
          {
            $project: {
              _id: 1,
              en: 1,
              ar: 1,
              price: 1,
              slug: 1,
              stock: 1,
              category: 1,
              brand: 1,
              images: 1,
              currency: 1,
            },
          },
        ];

        const results = await productsCol.aggregate(pipeline).toArray();
        console.log("🔧 Products found:", results.length);

        if (results.length === 0) {
          return "NO_PRODUCTS";
        }
        return JSON.stringify(results);
      } catch (e) {
        console.error("🔧 product_lookup error:", e);
        return "NO_PRODUCTS";
      }
    },
    {
      name: "product_lookup",
      description: "Search for products using semantic vector search",
      schema: z.object({
        query: z.string().describe("Search query"),
        n: z.number().optional().describe("Number of results"),
      }),
    }
  );

  const tools = [classifyIntentTool, productLookupTool];

  const salesModel = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    apiKey: process.env.GROQ_API_KEY,
  });

  // ----------------------------------------------------------
  // SIMPLIFIED GRAPH - Direct approach
  // ----------------------------------------------------------

  async function processNode(state) {
    console.log("\n📍 processNode called");
    console.log("Messages count:", state.messages?.length);
    console.log("Current intent:", agentState.intent);
    console.log("Has final response:", !!agentState.finalResponse);

    try {
      // If we already have a final response, just return
      if (agentState.finalResponse) {
        console.log("✅ Already have final response, ending");
        return { messages: [] };
      }

      const lastMsg = state.messages?.at(-1);
      const userMessage = lastMsg?.content || userQuery;
      console.log("Last message:", userMessage?.substring(0, 50));

      // Step 1: Classify intent if not done
      if (!agentState.intent) {
        console.log("📌 Classifying intent...");
        const intentResult = await classifyIntentTool.invoke({ query: userMessage });
        const parsed = safeParse(intentResult);
        agentState.intent = parsed?.intent || "general_chat";
        console.log("📌 Intent classified as:", agentState.intent);
      }

      // Step 2: Handle based on intent
      const intent = agentState.intent;

      if (intent === "support_request") {
        console.log("📌 Handling support request");
        agentState.finalResponse = {
          reply: "تمام 🙏 قولّي المشكلة بالتفصيل (مثلاً: الأوردر اتأخر؟ وصل ناقص؟) وكمان لو عندك رقم الطلب ابعته عشان أساعدك بسرعة.",
          products: [],
          sessionId: threadId,
        };
        return {
          messages: [new AIMessage({ content: agentState.finalResponse.reply })],
        };
      }

      if (intent === "general_chat") {
        console.log("📌 Handling general chat");
        agentState.finalResponse = {
          reply: "أهلاً 👋 تحب أدورلك على منتج معيّن ولا ترشيح حسب احتياجك؟ قولّي بتدور على إيه بالظبط.",
          products: [],
          sessionId: threadId,
        };
        return {
          messages: [new AIMessage({ content: agentState.finalResponse.reply })],
        };
      }

      // product_search or recommendation
      if (intent === "product_search" || intent === "recommendation") {
        console.log("📌 Searching for products...");
        const productResult = await productLookupTool.invoke({
          query: userMessage,
          n: 5,
        });

        if (productResult === "NO_PRODUCTS") {
          console.log("📌 No products found");
          agentState.finalResponse = {
            reply: "للأسف مفيش منتجات مطابقة دلوقتي. تحب تقولّي الميزانية أو الماركة المفضلة عشان أدورلك أكتر؟",
            products: [],
            sessionId: threadId,
          };
          return {
            messages: [new AIMessage({ content: agentState.finalResponse.reply })],
          };
        }

        const products = safeParse(productResult) || [];
        console.log("📌 Found", products.length, "products");

        const cards = products.map(populateProductCard);
        const recommendation = await generateRecommendationReply(
          salesModel,
          userMessage,
          products
        );

        console.log("📌 Generated recommendation:", recommendation?.substring(0, 100));

        agentState.finalResponse = {
          reply: recommendation,
          products: cards,
          sessionId: threadId,
        };

        return {
          messages: [new AIMessage({ content: recommendation })],
        };
      }

      // Fallback
      console.log("📌 Fallback case");
      agentState.finalResponse = {
        reply: "أهلاً! تحب أساعدك تلاقي منتج معين؟",
        products: [],
        sessionId: threadId,
      };
      return {
        messages: [new AIMessage({ content: agentState.finalResponse.reply })],
      };

    } catch (error) {
      console.error("❌ processNode error:", error);
      agentState.finalResponse = {
        reply: "حصلت مشكلة تقنية، ممكن تحاول تاني؟",
        products: [],
        sessionId: threadId,
        error: error.message,
      };
      return {
        messages: [new AIMessage({ content: agentState.finalResponse.reply })],
      };
    }
  }

  // ----------------------------------------------------------
  // SIMPLE SINGLE-NODE GRAPH
  // ----------------------------------------------------------

  const workflow = new StateGraph({
    channels: {
      messages: {
        value: (x, y) => x.concat(y),
        default: () => [],
      },
    },
  })
    .addNode("process", processNode)
    .addEdge("__start__", "process")
    .addEdge("process", "__end__");

  let checkpointer;
  try {
    checkpointer = new MongoDBSaver({ client: mongoClient, dbName });
  } catch (e) {
    console.warn("⚠️ MongoDBSaver init failed:", e.message);
    checkpointer = undefined;
  }

  if (clearHistory && checkpointer) {
    try {
      // Clear thread history
      const checkpointCollection = mongoClient.db(dbName).collection("checkpoints");
      await checkpointCollection.deleteMany({ thread_id: threadId });
      console.log("🗑️ Cleared history for thread:", threadId);
    } catch (e) {
      console.warn("⚠️ Could not clear history:", e.message);
    }
  }

  const app = workflow.compile({ checkpointer });

  console.log("🚀 Invoking graph...");

  try {
    const finalState = await app.invoke(
      {
        messages: [new HumanMessage(userQuery)],
      },
      {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: "chat",
          checkpoint_id: `${Date.now()}`,
        },
        recursionLimit: 5,
      }
    );

    console.log("✅ Graph completed");
    console.log("Final state messages:", finalState.messages?.length);

  } catch (invokeError) {
    console.error("❌ Graph invoke error:", invokeError);
    return {
      reply: "حصلت مشكلة في المعالجة، ممكن تحاول تاني؟",
      products: [],
      sessionId: threadId,
      error: invokeError.message,
    };
  }

  // Return the response we built
  const response = agentState.finalResponse || {
    reply: "حصلت مشكلة بسيطة، ممكن تعيد المحاولة؟",
    products: [],
    sessionId: threadId,
  };

  console.log("📤 Final response:", response.reply?.substring(0, 100));
  console.log("📤 Products count:", response.products?.length);
  console.log("========== AGENT END ==========\n");

  return response;
}
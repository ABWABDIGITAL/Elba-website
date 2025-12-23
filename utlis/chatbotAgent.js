import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StateGraph } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
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
  const output = await hf.featureExtraction({
    model: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    inputs: text,
  });
  return Array.isArray(output[0]) ? output[0] : output;
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
      max_tokens: 50,
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
    _id: p._id,
    en: {
      title: p.en?.title || null,
      subTitle: p.en?.subTitle || null,
    },
    ar: {
      title: p.ar?.title || null,
      subTitle: p.ar?.subTitle || null,
    },
    price: p.price ?? null,
    currency: p.currency || process.env.CURRENCY || "EGP",
    brand:
      p.brand?.en?.name ||
      p.brand?.slug ||
      p.brand ||
      null,
    category:
      p.category?.en?.slug ||
      p.category?.slug ||
      p.category ||
      null,
    stock: p.stock ?? null,
    images: Array.isArray(p.images) ? p.images : [],
    specifications:
      p.en?.specifications ||
      p.ar?.specifications ||
      [],
    features:
      p.en?.features ||
      p.ar?.features ||
      [],
    warranty:
      p.en?.warranty ||
      p.ar?.warranty ||
      null,
    link: p.slug ? `/product/${p.slug}` : null,
    ui: {
      type: "product_card",
      addToCart: true,
      viewDetails: true,
    },
  };
}

// ============================================================
// MAIN AGENT
// ============================================================

export async function callAgent(
  mongoClient,
  userQuery,
  threadId,
  clearHistory = false
) {
  const dbName = process.env.DB_NAME || "Alba-ECommerce";
  const productsCol = mongoClient.db(dbName).collection("products");
  const ticketsCol = mongoClient.db(dbName).collection("tickets");

  // ----------------------------------------------------------
  // TOOL: INTENT CLASSIFIER (NO HARDCODE)
  // ----------------------------------------------------------
  const classifyIntentTool = tool(
    async ({ query }) => {
      const prompt = `
Classify the user intent into ONE value only:
- product_search
- support_request
- general_chat

Return JSON only:
{ "intent": "product_search | support_request | general_chat" }

Message: "${query}"
`;
      const res = await hf.chatCompletion({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20,
      });

      const text = res.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      return match ? match[0] : JSON.stringify({ intent: "general_chat" });
    },
    {
      name: "classify_intent",
      description: "Classify user intent",
      schema: z.object({ query: z.string() }),
    }
  );

  // ----------------------------------------------------------
  // TOOL: PRODUCT LOOKUP
  // ----------------------------------------------------------
  const productLookupTool = tool(
    async ({ query, n = 5 }) => {
      try {
        const [vector, intent] = await Promise.all([
          embed(query),
          extractSearchIntent(query),
        ]);

        const filter = {
          $and: [{ status: "active" }, { stock: { $gt: 0 } }],
        };

        if (intent.brand)
          filter.$and.push({ "brand.en.slug": intent.brand });
        if (intent.category)
          filter.$and.push({ "category.en.slug": intent.category });

        const pipeline = [
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: Binary.fromFloat32Array(
                new Float32Array(vector)
              ),
              numCandidates: 50,
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
        return results.length ? JSON.stringify(results) : "NO_PRODUCTS";
      } catch {
        return "NO_PRODUCTS";
      }
    },
    {
      name: "product_lookup",
      description: "Search products",
      schema: z.object({
        query: z.string(),
        n: z.number().optional(),
      }),
    }
  );

  // ----------------------------------------------------------
  // TOOL: CREATE TICKET
  // ----------------------------------------------------------
  const createTicketTool = tool(
    async ({ issue_type, description }) => {
      const ticket = {
        issue_type,
        description,
        threadId,
        status: "open",
        createdAt: new Date(),
      };
      await ticketsCol.insertOne(ticket);
      return JSON.stringify({ success: true });
    },
    {
      name: "create_ticket",
      description: "Create support ticket",
      schema: z.object({
        issue_type: z.enum(["complaint", "inquiry", "return", "refund"]),
        description: z.string(),
      }),
    }
  );

  const tools = [
    classifyIntentTool,
    productLookupTool,
    createTicketTool,
  ];

  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  }).bindTools(tools);

  // ----------------------------------------------------------
  // GRAPH NODES
  // ----------------------------------------------------------
  async function agentNode(state) {
    const last = state.messages.at(-1);

    // Always classify intent first
    if (!state.intent) {
      return {
        messages: [
          {
            role: "assistant",
            tool_calls: [
              {
                id: "intent_call",
                name: "classify_intent",
                args: { query: last.content },
              },
            ],
          },
        ],
      };
    }

    // Route based on intent
    if (state.intent === "product_search") {
      return {
        messages: [
          {
            role: "assistant",
            tool_calls: [
              {
                id: "product_call",
                name: "product_lookup",
                args: { query: last.content },
              },
            ],
          },
        ],
      };
    }

if (state.intent === "support_request") {

  // أول مرة
  if (state.supportState === "start") {
    return {
      supportState: "ask_order_id",
      messages: [
        new AIMessage(JSON.stringify({
          reply: "حاضر 🙏 محتاج بس رقم الطلب علشان أقدر أتابع حالته.",
          action: "awaiting_order_id"
        }))
      ]
    };
  }

  // المستخدم رجع قال المشكلة تاني بدون رقم
  if (state.supportState === "ask_order_id") {
    return {
      messages: [
        new AIMessage(JSON.stringify({
          reply: "فاهمك 👍 بس علشان أتحرك، لازم رقم الطلب أو رقم الموبايل اللي اتحط في الأوردر.",
          action: "awaiting_order_id"
        }))
      ]
    };
  }
}


    // General chat
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are Alba, a helpful assistant."],
      new MessagesPlaceholder("messages"),
    ]);

    const formatted = await prompt.formatMessages({
      messages: state.messages,
    });

    const response = await model.invoke(formatted);
    return { messages: [response] };
  }

  async function toolNode(state) {
    const last = state.messages.at(-1);
    const toolMsgs = [];

    for (const call of last.tool_calls || []) {
      const toolImpl = tools.find((t) => t.name === call.name);
      if (!toolImpl) continue;

      const result = await toolImpl.invoke(call.args);

      // Intent result
      if (call.name === "classify_intent") {
        const parsed = safeParse(result);
        return {
          intent: parsed?.intent || "general_chat",
          messages: [],
        };
      }

      // Product results
      if (call.name === "product_lookup") {
        if (result === "NO_PRODUCTS") {
          return {
            messages: [
              new AIMessage(
                JSON.stringify({
                  reply: "للأسف مفيش منتجات مطابقة دلوقتي.",
                  products: [],
                })
              ),
            ],
          };
        }

        const parsed = safeParse(result) || [];
        return {
          messages: [
            new AIMessage(
              JSON.stringify({
                reply: "دي المنتجات المتاحة عندنا:",
                products: parsed.map(populateProductCard),
              })
            ),
          ],
        };
      }

      toolMsgs.push(
        new ToolMessage({
          name: call.name,
          content: result,
          tool_call_id: call.id,
        })
      );
    }

    return { messages: toolMsgs };
  }

  function shouldContinue(state) {
    return state.messages.at(-1)?.tool_calls?.length ? "tools" : "__end__";
  }

  // ----------------------------------------------------------
  // WORKFLOW
  // ----------------------------------------------------------
  const workflow = new StateGraph({
    channels: {
      messages: {
        value: (x, y) => x.concat(y),
        default: () => [],
      },
      intent: {
        value: (_, y) => y,
        default: () => null,
      },
    },
  })
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const checkpointer = new MongoDBSaver({
    client: mongoClient,
    dbName,
  });

  if (clearHistory) {
    await checkpointer.delete({
      configurable: { thread_id: threadId },
    });
  }

  const app = workflow.compile({ checkpointer });

  const finalState = await app.invoke(
    { messages: [new HumanMessage(userQuery)] },
    { configurable: { thread_id: threadId } }
  );

  return finalState.messages.at(-1)?.content || "";
}

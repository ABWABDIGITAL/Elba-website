import { ChatGroq } from "@langchain/groq";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StateGraph } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { HfInference } from "@huggingface/inference"; // 🟢 Added for Embeddings
import mongoose from "mongoose";
const { Binary } = mongoose.mongo;
import { z } from "zod";
import "dotenv/config";

// Initialize HuggingFace for Embeddings & Intent Extraction
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// ============================================================
// HELPER: Semantic Search Functions
// ============================================================

// 1. Convert text to Vector
async function embed(text) {
  const output = await hf.featureExtraction({
    model: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    inputs: text,
  });
  return Array.isArray(output[0]) ? output[0] : output;
}

// 2. Extract Intent (Brand vs Category)
async function extractSearchIntent(query) {
  try {
    const prompt = `
      Extract search filters from this Arabic or English query: "${query}"
      Identify:
      1. Category (translate to English slug, e.g., "refrigerators", "washing-machines")
      2. Brand (translate to English slug, e.g., "samsung", "lg")
      Return JSON ONLY: {"category": "string or null", "brand": "string or null"}
    `;
    
    // Using a small, fast model for extraction
    const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct", 
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
    });

    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/); 
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (err) {
    console.error("⚠️ Intent extraction failed:", err.message);
    return {}; 
  }
}

// ============================================================
// HELPER: Sanitize tool messages
// ============================================================
function sanitizeToolMessage(msg) {
  if (msg._getType && msg._getType() === "tool") {
    if (typeof msg.content === "string") return msg;
    if (Array.isArray(msg.content) && msg.content.length > 0) return msg;
    return new ToolMessage({
      content: JSON.stringify(msg.content || "No result"),
      tool_call_id: msg.tool_call_id || "unknown",
      name: msg.name || "unknown_tool",
    });
  }
  return msg;
}

// ============================================================
// MAIN AGENT FUNCTION
// ============================================================
export async function callAgent(
  mongoClient,
  userQuery,
  threadId,
  clearHistory = false
) {
  const dbName = process.env.DB_NAME || "Alba-ECommerce";
  const db = mongoClient.db(dbName);
  const productCollection = db.collection("products");
  const ticketCollection = db.collection("tickets");

 const productLookupTool = tool(
    async ({ query, n = 5 }) => {
      try {
        console.log(`🔎 Searching for: "${query}"`);
        const db = mongoClient.db(dbName); // Ensure we use the raw client for aggregation
        const collection = db.collection("products");

        // 1. Try Vector Search First
        try {
          const [queryVector, intent] = await Promise.all([
             embed(query),
             extractSearchIntent(query)
          ]);

          console.log("🧠 Intent:", intent);

          const filter = {
             $and: [
               { status: { $eq: "active" } },
               { stock: { $gt: 0 } }
             ]
          };

          if (intent.brand) filter.$and.push({ "brand.en.slug": { $eq: intent.brand } });
          if (intent.category) filter.$and.push({ "category.en.slug": { $eq: intent.category } });

          // ⚠️ KEY FIX: Use mongoose.mongo.Binary (or just ensure it matches your connection)
          // If you passed mongoClient from outside, ensure Binary matches that client's driver version.
          // Since we fixed the import above, this should work.
          
          const pipeline = [
            {
              $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector: Binary.fromFloat32Array(new Float32Array(queryVector)),
                numCandidates: 50,
                limit: n,
                filter: filter,
              },
            },
            { $project: { "en.title": 1, "ar.title": 1, price: 1, slug: 1, stock: 1 } }
          ];

          const results = await collection.aggregate(pipeline).toArray();
          if (results.length > 0) return JSON.stringify(results);
          console.log("⚠️ Vector search found nothing, trying text fallback...");

        } catch (vectorError) {
          console.error("❌ Vector Search Crashed:", vectorError.message);
          console.log("⚠️ Falling back to Standard Text Search...");
        }

        // 2. Fallback: Standard Text Search (Regex)
        // This runs if Vector search fails or returns 0 results
        const fallbackQuery = {
          $or: [
            { "en.title": { $regex: query, $options: "i" } },
            { "ar.title": { $regex: query, $options: "i" } },
            { "category.en.name": { $regex: query, $options: "i" } }
          ],
          status: "active",
          stock: { $gt: 0 }
        };

        const textResults = await collection.find(fallbackQuery).limit(n).toArray();
        
        if (textResults.length === 0) return "NO_PRODUCTS_FOUND";
        
        return JSON.stringify(textResults.map(p => ({
          name: p.en?.title || p.ar?.title,
          price: p.price,
          link: `/product/${p.slug}`
        })));

      } catch (error) {
        console.error("❌ FATAL SEARCH ERROR:", error);
        return "NO_PRODUCTS_FOUND";
      }
    },
    {
      name: "product_lookup",
      description: "Search for products.",
      schema: z.object({
        query: z.string(),
        n: z.number().optional(),
      }),
    }
  );
  // ----------------------------------------------------------
  // TOOL 2: Create Support Ticket (Kept Same)
  // ----------------------------------------------------------
  const createTicketTool = tool(
    async ({ issue_type, description, contact_info }) => {
      try {
        const newTicket = {
          issue_type, description, contact_info: contact_info || "Not provided",
          thread_id: threadId, status: "open", createdAt: new Date(),
        };
        const result = await ticketCollection.insertOne(newTicket);
        return JSON.stringify({ success: true, ticket_id: result.insertedId });
      } catch (e) {
        return JSON.stringify({ success: false, message: "Failed to create ticket." });
      }
    },
    {
      name: "create_ticket",
      description: "Create support ticket for returns/complaints.",
      schema: z.object({
        issue_type: z.enum(["complaint", "return", "inquiry", "refund"]),
        description: z.string(),
        contact_info: z.string().optional(),
      }),
    }
  );

  // ----------------------------------------------------------
  // AGENT SETUP
  // ----------------------------------------------------------
  const tools = [productLookupTool, createTicketTool];
  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  }).bindTools(tools);

  // Custom Tool Node
  async function customToolNode(state) {
    const lastMessage = state.messages.at(-1);
    const toolMessages = [];
    if (lastMessage?.tool_calls?.length) {
      for (const toolCall of lastMessage.tool_calls) {
        const selectedTool = tools.find((t) => t.name === toolCall.name);
        if (selectedTool) {
          try {
            const result = await selectedTool.invoke(toolCall.args);
            toolMessages.push(new ToolMessage({
              content: typeof result === "string" ? result : JSON.stringify(result),
              tool_call_id: toolCall.id, name: toolCall.name,
            }));
          } catch (err) {
            toolMessages.push(new ToolMessage({
              content: `Error: ${err.message}`, tool_call_id: toolCall.id, name: toolCall.name,
            }));
          }
        }
      }
    }
    return { messages: toolMessages };
  }

  // Graph Logic
  async function callModel(state) {
    const sanitizedMessages = state.messages.map(sanitizeToolMessage);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are Alba, an AI Sales Assistant.
      RULES:
      1. ALWAYS use 'product_lookup' for product questions.
      2. If products found, show: Name, Price, Discount, Link.
      3. If NO products found, apologize and suggest alternatives.
      4. Use 'create_ticket' for complaints.
      Current Time: {time}`],
      new MessagesPlaceholder("messages"),
    ]);
    const formattedPrompt = await prompt.formatMessages({
      time: new Date().toISOString(), messages: sanitizedMessages,
    });
    const response = await model.invoke(formattedPrompt);
    return { messages: [response] };
  }

  function shouldContinue(state) {
    return state.messages.at(-1)?.tool_calls?.length ? "tools" : "__end__";
  }

  // Workflow
  const workflow = new StateGraph({ channels: { messages: { value: (x, y) => x.concat(y), default: () => [] } } })
    .addNode("agent", callModel)
    .addNode("tools", customToolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const checkpointer = new MongoDBSaver({ client: mongoClient, dbName });
  if (clearHistory) await checkpointer.delete({ configurable: { thread_id: threadId } }); // Simplification

  const app = workflow.compile({ checkpointer });
  const finalState = await app.invoke(
    { messages: [new HumanMessage(userQuery)] },
    { configurable: { thread_id: threadId } }
  );
  return finalState.messages.at(-1)?.content || "No response.";
}
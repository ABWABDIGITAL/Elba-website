// // =======================
// // IMPORTS
// // =======================
// import "dotenv/config";

// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { AIMessage, HumanMessage } from "@langchain/core/messages";
// import {
//   ChatPromptTemplate,
//   MessagesPlaceholder,
// } from "@langchain/core/prompts";
// import { StateGraph, Annotation } from "@langchain/langgraph";
// import { tool } from "@langchain/core/tools";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
// import { MongoClient } from "mongodb";
// import { z } from "zod";

// // =======================
// // RETRY WITH BACKOFF
// // =======================
// async function retryWithBackoff(fn, maxRetries = 3) {
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       return await fn();
//     } catch (error) {
//       if (error?.status === 429 && attempt < maxRetries) {
//         const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
//         console.log(`Rate limit hit. Retrying in ${delay / 1000}s...`);
//         await new Promise((r) => setTimeout(r, delay));
//         continue;
//       }
//       throw error;
//     }
//   }
//   throw new Error("Max retries exceeded");
// }

// // =======================
// // MAIN AGENT FUNCTION
// // =======================
// export async function callAgent(client, query, thread_id) {
//   try {
//     // -----------------------
//     // DATABASE
//     // -----------------------
//     const dbName = "inventory_database";
//     const db = client.db(dbName);
//     const collection = db.collection("items"); // change to "products" if needed

//     // -----------------------
//     // GRAPH STATE
//     // -----------------------
//     const GraphState = Annotation.Root({
//       messages: Annotation({
//         reducer: (x, y) => x.concat(y),
//       }),
//     });

//     // =======================
//     // REGEX SEARCH TOOL
//     // =======================
//     const itemLookupTool = tool(
//       async ({ query, n = 10 }) => {
//         try {
//           console.log("Regex search query:", query);

//           const keywords = query.split(" ").filter(Boolean);

//           const results = await collection
//             .find({
//               status: "active",
//               $or: [
//                 { "en.title": { $regex: query, $options: "i" } },
//                 { "en.subTitle": { $regex: query, $options: "i" } },
//                 { "ar.title": { $regex: query, $options: "i" } },
//                 { "ar.subTitle": { $regex: query, $options: "i" } },
//                 { tags: { $in: keywords } },
//               ],
//             })
//             .limit(n)
//             .toArray();

//           if (!results.length) {
//             return JSON.stringify({
//               message: "لا توجد منتجات مطابقة لبحثك",
//               query,
//             });
//           }

//           return JSON.stringify({
//             results,
//             count: results.length,
//             searchType: "regex",
//           });
//         } catch (error) {
//           console.error("Regex search error:", error);
//           return JSON.stringify({
//             error: "حدث خطأ أثناء البحث",
//             details: error.message,
//           });
//         }
//       },
//       {
//         name: "item_lookup",
//         description:
//           "البحث عن المنتجات باستخدام MongoDB Regex (بدون Vector Search)",
//         schema: z.object({
//           query: z.string().describe("سؤال المستخدم"),
//           n: z.number().optional().default(10),
//         }),
//       }
//     );

//     // -----------------------
//     // TOOLS
//     // -----------------------
//     const tools = [itemLookupTool];
//     const toolNode = new ToolNode(tools);

//     // -----------------------
//     // AI MODEL (GEMINI)
//     // -----------------------
//     const model = new ChatGoogleGenerativeAI({
//       model: "gemini-2.0-flash",
//       temperature: 0,
//       maxRetries: 0,
//       maxOutputTokens:256,
//       apiKey: process.env.GOOGLE_API_KEY,
//     }).bindTools(tools);

//     // -----------------------
//     // DECISION FUNCTION
//     // -----------------------
//     function shouldContinue(state) {
//       const messages = state.messages;
//       const lastMessage = messages[messages.length - 1];
//       if (lastMessage?.tool_calls?.length) return "tools";
//       return "__end__";
//     }

//     // -----------------------
//     // CALL MODEL
//     // -----------------------
//     async function callModel(state) {
//       return retryWithBackoff(async () => {
//         const prompt = ChatPromptTemplate.fromMessages([
//           [
//             "system",
//             `أنت مساعد ذكي لمتجر إلكتروني.

// تعليمات مهمة:
// - استخدم أداة item_lookup دائمًا عند السؤال عن المنتجات
// - لو مفيش نتائج، اطلب من العميل توضيح أكتر
// - ردودك تكون واضحة ومفيدة وبالعربي لو السؤال عربي

// الوقت الحالي: {time}`,
//           ],
//           new MessagesPlaceholder("messages"),
//         ]);

//         const formattedPrompt = await prompt.formatMessages({
//           time: new Date().toISOString(),
//           messages: state.messages,
//         });

//         const result = await model.invoke(formattedPrompt);
//         return { messages: [result] };
//       });
//     }

//     // -----------------------
//     // WORKFLOW
//     // -----------------------
//     const workflow = new StateGraph(GraphState)
//       .addNode("agent", callModel)
//       .addNode("tools", toolNode)
//       .addEdge("__start__", "agent")
//       .addConditionalEdges("agent", shouldContinue)
//       .addEdge("tools", "agent");

//     // -----------------------
//     // MEMORY (CHAT HISTORY)
//     // -----------------------
//     const checkpointer = new MongoDBSaver({ client, dbName });
//     const app = workflow.compile({ checkpointer });

//     // -----------------------
//     // RUN AGENT
//     // -----------------------
//     const finalState = await app.invoke(
//       {
//         messages: [new HumanMessage(query)],
//       },
//       {
//         recursionLimit: 15,
//         configurable: { thread_id },
//       }
//     );

//     return finalState.messages[finalState.messages.length - 1].content;
//   } catch (error) {
//     console.error("Agent error:", error);
//     if (error?.status === 429)
//       throw new Error("الخدمة مشغولة حاليًا، حاول مرة أخرى");
//     if (error?.status === 401)
//       throw new Error("مشكلة في مفاتيح API");
//     throw new Error(`Agent failed: ${error.message}`);
//   }
// }
// // 
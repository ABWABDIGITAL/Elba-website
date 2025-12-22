import "dotenv/config";
import { ChatGroq } from "@langchain/groq";

async function test() {
  console.log("🔑 Testing Groq...");
  
  try {
    const model = new ChatGroq({
      model: "llama-3.3-70b-versatile",  // ✅ Updated model name
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY,
    });

    const response = await model.invoke([
      { role: "user", content: "Say 'Groq is working!' in exactly 3 words." }
    ]);

    console.log("✅ SUCCESS:", response.content);
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }
}

test();
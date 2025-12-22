import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GOOGLE_API_KEY;
console.log(`🔑 Testing key ending in: ...${key.slice(-4)}`);

const genAI = new GoogleGenerativeAI(key);

async function test() {
  try {
    // Test with the model we want to use
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say 'API working!' in exactly 2 words.");
    console.log("✅ SUCCESS:", result.response.text());
  } catch (error) {
    console.log("❌ FAILED:", error.message);
    
    if (error.message.includes("429")) {
      console.log("\n💡 This key has 0 quota. You need a fresh project.");
    }
    if (error.message.includes("404")) {
      console.log("\n💡 This model is blocked. Try 'gemini-flash-latest' instead.");
    }
  }
}

test();
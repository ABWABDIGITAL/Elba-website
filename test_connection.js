import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

async function test() {
  console.log("🚀 Testing Connection with your NEW key...");
  
  const key = process.env.GOOGLE_API_KEY;
  console.log(`🔑 Using key ending in: ...${key.slice(-4)}`);

  try {
    const genAI = new GoogleGenerativeAI(key);
    // Since you are on a personal Gmail now, we use the standard model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Hello! Are you working?");
    console.log("\n✅ SUCCESS! Google replied:");
    console.log(result.response.text());
    console.log("---------------------------------------------------");
    console.log("👉 GREAT NEWS: Your API key works perfectly.");
    console.log("👉 ACTION: Start your main server (node index.js) now.");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("404")) {
        console.log("💡 Tip: This key might be from the university account? It can't see '1.5-flash'.");
    }
  }
}

test();
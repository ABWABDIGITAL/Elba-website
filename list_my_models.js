import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

async function listModels() {
  const key = process.env.GOOGLE_API_KEY;
  console.log(`🔑 Checking models for key ending in: ...${key.slice(-4)}`);

  // Use the REST API directly to bypass SDK filtering
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        console.error("❌ API Error:", data.error.message);
        return;
    }

    console.log("\n✅ AVAILABLE MODELS FOR THIS KEY:");
    console.log("---------------------------------");
    const models = data.models || [];
    
    // Filter for "generateContent" models only
    const chatModels = models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
    
    chatModels.forEach(m => {
        console.log(`• ${m.name.replace("models/", "")}`);
    });
    console.log("---------------------------------");
    
  } catch (error) {
    console.error("Script failed:", error);
  }
}

listModels();
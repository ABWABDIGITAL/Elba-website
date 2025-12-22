import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GOOGLE_API_KEY;

async function debug() {
  if (!apiKey) {
    console.error("❌ NO API KEY FOUND in .env");
    return;
  }

  // 1. Verify we are using the NEW key
  console.log(`🔑 Using Key starting with: ${apiKey.substring(0, 4)}...`);

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // 2. Ask Google for the official list
    const response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; // Init
    // Note: The SDK method to list models is slightly hidden in the helper, 
    // so we use a direct fetch to the generic endpoint for debugging clarity.
    
    console.log("📡 Fetching model list from Google...");
    
    // We use the basic fetch to bypass SDK wrappers that might hide errors
    const fetch = (await import("node-fetch")).default || global.fetch;
    const rawParams = new URLSearchParams({ key: apiKey });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${rawParams}`);
    
    if (res.status !== 200) {
        const err = await res.json();
        console.error(`\n❌ API REJECTED CONNECTION (Status ${res.status}):`);
        console.error(JSON.stringify(err, null, 2));
        console.log("\n💡 FIX: Your API Key is likely invalid or the Project has no billing/quota set.");
        return;
    }

    const data = await res.json();
    const availableModels = data.models.map(m => m.name); // e.g. "models/gemini-1.5-flash"

    console.log("\n✅ CONNECTION SUCCESSFUL! Here are your available models:");
    console.log(availableModels.join("\n"));

    // 3. Check specifically for Flash
    const hasFlash = availableModels.some(m => m.includes("gemini-1.5-flash"));
    if (hasFlash) {
        console.log("\n🎉 GREAT NEWS: 'gemini-1.5-flash' IS available.");
        console.log("👉 If your chatbot fails, ensure you use the EXACT name shown above.");
    } else {
        console.log("\n⚠️ WARNING: Flash is NOT in your list. You must use one of the models listed above.");
    }

  } catch (error) {
    console.error("❌ SCRIPT CRASHED:", error);
  }
}

debug();
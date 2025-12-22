import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

async function verify() {
  const key = process.env.GOOGLE_API_KEY;

  console.log("\n🔍 --- DIAGNOSTIC START ---");
  
  // 1. CHECK THE KEY
  if (!key) {
    console.error("❌ CRITICAL: No API Key found in .env variable.");
    return;
  }
  
  // The new working key (Mohamed) ends with '...cwyE'. 
  // The old broken key (Abwab) ends with '...NNIY' or '...rzK0'.
  const last4 = key.slice(-4);
  console.log(`🔑 Key loaded from .env ends with: [ ****${last4} ]`);

  if (last4 !== "cwyE") {
    console.log("\n⚠️  MAJOR ISSUE FOUND: You are using the WRONG key!");
    console.log("👉 You updated the .env file, but the code is reading the old one.");
    console.log("👉 FIX: Stop the server completely (Ctrl+C) and run this script again.");
    return;
  } else {
    console.log("✅ Key matches the 'Mohamed' Free Tier project.");
  }

  // 2. ASK GOOGLE FOR THE EXACT MODEL NAME
  console.log("\n📡 Asking Google what models this key can use...");
  const genAI = new GoogleGenerativeAI(key);
  
  // We force a specific older model to check connectivity first
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Test connection");
    console.log("\n✅ SUCCESS! 'gemini-1.5-flash' works perfectly.");
    console.log("👉 ACTION: Update your agent.js to use 'gemini-1.5-flash' and RESTART.");
    return;
  } catch (e) {
    if (e.message.includes("404")) {
      console.log("❌ 'gemini-1.5-flash' gave 404. Trying fallback...");
    } else {
      console.log(`❌ Error: ${e.message}`);
    }
  }

  // If 1.5 failed, try the oldest, most stable model
  try {
    console.log("🔄 Trying 'gemini-pro' (The most stable fallback)...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    await model.generateContent("Test connection");
    console.log("\n✅ SUCCESS! 'gemini-pro' works.");
    console.log("👉 ACTION: Update your agent.js to use 'gemini-pro'.");
  } catch (e) {
    console.log("❌ CRITICAL: Even the backup model failed.");
    console.log(e.message);
  }
  console.log("---------------------------\n");
}

verify();
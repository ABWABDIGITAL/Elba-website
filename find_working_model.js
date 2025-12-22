import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// We will test ALL these models. One of them MUST work.
const candidateModels = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro",
  "gemini-2.0-flash-lite-preview-02-05", // The student account "Lite" option
  "gemini-2.0-flash-exp",
];

async function bruteForceTest() {
  const key = process.env.GOOGLE_API_KEY;
  console.log(`🔥 Starting Brute Force Check for key ending in: ...${key.slice(-4)}`);
  
  const genAI = new GoogleGenerativeAI(key);

  for (const modelName of candidateModels) {
    process.stdout.write(`👉 Testing: ${modelName.padEnd(35)} `);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent("Test");
      
      console.log("✅ SUCCESS! IT WORKS!");
      console.log("\n🎉 FOUND A WORKING MODEL!");
      console.log("=========================================");
      console.log(`PLEASE UPDATE YOUR agent.js TO USE:`);
      console.log(`model: "${modelName}"`);
      console.log("=========================================");
      return; // Stop after finding the first winner
    } catch (error) {
      if (error.message.includes("404")) {
        console.log("❌ Not Found (404)");
      } else if (error.message.includes("429")) {
        console.log("⚠️  Found but Quota Exceeded (429)");
      } else {
        console.log(`❌ Error: ${error.message.split('[')[0]}`); // Short error
      }
    }
  }
  
  console.log("\n💀 FAILURE: No working models found for this key.");
  console.log("This means the key is completely locked or the account has 0 quota.");
}

bruteForceTest();
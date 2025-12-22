import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function list() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
    const result = await model.generateContent("Hello");
    console.log("✅ Success! Model is working:", result.response.text());
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

list();
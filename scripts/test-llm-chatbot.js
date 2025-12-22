import { llmChatbot } from "../chatbot/llmChatbot.js";

const q = process.argv.slice(2).join(" ") || "عايز ثلاجة سامسونج";

const reply = await llmChatbot(q);
console.log("\n🤖 BOT:\n");
console.log(reply);

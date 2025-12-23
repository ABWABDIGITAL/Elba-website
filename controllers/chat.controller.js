import { callAgent } from "../utlis/chatbotAgent.js";
import mongoose from "mongoose";

export const chatController = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const threadId = sessionId || "guest_session";

    const mongoClient = mongoose.connection.getClient();

    const response = await callAgent(mongoClient, message, threadId);
    return res.status(200).json(response);


  } catch (error) {
    console.error("Chatbot Error:", error);
    return res.status(500).json({
      error: "Something went wrong processing your request."
    });
  }
};

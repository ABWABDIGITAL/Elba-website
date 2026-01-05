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
export const getConversationBySession = async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({ error: "threadId is required" });
    }

    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");

    const conversation = await conversationsCol.findOne({ threadId });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.status(200).json(conversation);

  } catch (error) {
    console.error("Get Conversation Error:", error);
    return res.status(500).json({
      error: "Failed to retrieve conversation",
    });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    const mongoClient = mongoose.connection.getClient();
    const db = mongoClient.db(process.env.DB_NAME || "Alba-ECommerce");
    const conversationsCol = db.collection("conversations");

    const conversations = await conversationsCol
      .find({})
      .sort({ lastActivity: -1 }) 
      .toArray();

    return res.status(200).json({
      count: conversations.length,
      conversations,
    });

  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({
      error: "Failed to retrieve conversations",
    });
  }
};
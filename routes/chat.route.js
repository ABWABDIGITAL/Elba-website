import express from "express";
import { callAgent } from "../agent.js";
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGO_URI);
const router = express.Router();
router.get("/", (req, res) => {
    res.send("Lang chain route");
});
router.post("/chat",async (req, res) => {
    const initialMessage = req.body.initialMessage;
    const threadId = Date.now().toString(); // to make the conversation can continue later.
    console.log(initialMessage);
    try {
        const response = await callAgent(client,initialMessage, threadId);
        res.json({
            message: response,
            threadId
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
            threadId
        })
    }
});
//Continue a Conversation
router.post("/chat/:thredId", async(req,res)=>{
    const threadId = req.params.thredId;
    const message = req.body.message;
    try {
        const response = await callAgent(client,message,threadId)
        res.json({response})
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
            threadId
        })
    }
})

export default router;
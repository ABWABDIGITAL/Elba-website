// setup-conversations.js
import { MongoClient } from "mongodb";
import "dotenv/config";

async function setup() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || "Alba-ECommerce");
    
    // Create collection (if not exists)
    const collections = await db.listCollections({ name: "conversations" }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection("conversations");
      console.log("✅ Created 'conversations' collection");
    } else {
      console.log("ℹ️ 'conversations' collection already exists");
    }
    
    // Create indexes
    await db.collection("conversations").createIndex(
      { threadId: 1 }, 
      { unique: true }
    );
    console.log("✅ Created index on threadId");
    
    // Optional: Auto-delete old conversations after 7 days
    await db.collection("conversations").createIndex(
      { lastActivity: 1 }, 
      { expireAfterSeconds: 604800 } // 7 days
    );
    console.log("✅ Created TTL index for auto-cleanup");
    
    console.log("\n🎉 Setup complete!");
    
  } catch (error) {
    console.error("❌ Setup error:", error);
  } finally {
    await client.close();
  }
}

setup();
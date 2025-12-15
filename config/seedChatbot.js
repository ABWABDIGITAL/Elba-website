import {chatGoogleGenerativeAI , chatGoogleGenerativeAIEmbeddings} from "@langchain/google-genai";
import {structuredOutputParser} from "@langchain/core/output_parsers";
import mongoose from "mongoose";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import Product from "../models/product.model.js";
import category from "../models/category.model.js";
import brand from "../models/brand.model.js";
import dotenv from "dotenv";
import {z} from "zod";
import connectDB from "./db";
dotenv.config();
const llm = new chatGoogleGenerativeAI({
  model: "gemini-2.0-flash",  
  temperature:0.7,
  apiKey:process.env.GOOGLE_API_KEY,
})

async function createVectorSearchIndex() {
  try{
    await connectDB();
    const collection = db.collection("products")
    const vectorSearch = new MongoDBAtlasVectorSearch(collection, {
      vectorField: "vector",
      key: "vector",
    })
    const index = await vectorSearch.createIndex();
    console.log(index);
  }
  catch(error){
    console.log(error);
  }
}
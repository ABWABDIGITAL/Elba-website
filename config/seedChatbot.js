import {chatGoogleGenerativeAI , chatGoogleGenerativeAIEmbeddings} from "@langchain/google-genai";
import {structuredOutputParser} from "@langchain/core/output_parsers";
import mongoose from "mongoose";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import dotenv from "dotenv";
dotenv.config();
import {z} from "zod";
import connectDB from "./db";
const llm = new chatGoogleGenerativeAI({
  model:"gemini-2.0-flash-exp",  
  temperature:0.7,
  apiKey:process.env.GOOGLE_API_KEY,
})
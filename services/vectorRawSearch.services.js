import "dotenv/config";
import { MongoClient, Binary } from "mongodb";
import { HfInference } from "@huggingface/inference";

const client = new MongoClient(process.env.MONGO_URI);
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const DB_NAME = "Alba-ECommerce";
const COLLECTION = "products";
const INDEX_NAME = "vector_index";
const MODEL = "sentence-transformers/all-mpnet-base-v2";
const DIM = 768;

function toVectorBinary(vector) {
  return Binary.fromFloat32Array(new Float32Array(vector));
}

async function embed(text) {
  const raw = await hf.featureExtraction({ model: MODEL, inputs: text });
  const vector = Array.isArray(raw[0]) ? raw[0] : raw;

  if (!Array.isArray(vector) || vector.length !== DIM) {
    throw new Error(`Invalid vector length: ${vector?.length}`);
  }
  return vector;
}

export async function vectorRawSearch(query, limit = 30) {
  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  const vectorArray = await embed(query);
  const queryVector = toVectorBinary(vectorArray);

  const results = await col
    .aggregate([
      {
        $vectorSearch: {
          index: INDEX_NAME,
          path: "embedding",
          queryVector,
          numCandidates: 1000,
          limit,
        },
      },
      {
        $project: {
          "ar.title": 1,
          "en.title": 1,
          price: 1,
          images: 1,
          category: 1,
          brand: 1,
          sizeType: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  return results;
}

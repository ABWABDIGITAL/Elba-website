import dotenv from "dotenv";
dotenv.config();

export default {
  baseUrl: process.env.MYFATORA_BASE_URL,
  merchantKey: process.env.MYFATORA_MERCHANT_KEY,
  secret: process.env.MYFATORA_SECRET,
};

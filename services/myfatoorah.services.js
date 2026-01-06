
import axios from "axios";

const MF_BASE_URL = process.env.MYFATOORAH_BASE_URL || "https://apitest.myfatoorah.com";
const MF_API_KEY = process.env.MF_API_KEY;

if (!MF_API_KEY) {
  throw new Error("MF_API_KEY is required in environment variables");
}

const mf = axios.create({
  baseURL: MF_BASE_URL,
  headers: {
    Authorization: `Bearer ${MF_API_KEY}`,
    "Content-Type": "application/json",
  },
});
export const initiateMyFatoorahSession = async ({
  orderId,
  amount,
  currency = "KWD",
  customerEmail,
  customerName,
}) => {
  try {
    const { data } = await mf.post("/v2/InitiateSession", {
      CustomerIdentifier: orderId.toString(),
      // Optional: Include more details for better tracking
      InvoiceValue: amount,
      CurrencyIso: currency,
      CustomerEmail: customerEmail,
      CustomerName: customerName,
    });

    if (!data.IsSuccess) {
      throw new Error(data.Message || "Failed to initiate session");
    }

    return data.Data;
  } catch (error) {
    console.error("MyFatoorah InitiateSession Error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.Message || 
      error.message || 
      "Failed to initiate payment session"
    );
  }
};

/**
 * STEP 2: Check Payment Status (Webhook / Polling)
 * @param {string} invoiceId - MyFatoorah Invoice ID
 * @returns {Promise<Object>} Payment data with status, amount, etc.
 */
export const getMyFatoorahPaymentStatus = async (invoiceId) => {
  try {
    const { data } = await mf.post("/v2/GetPaymentStatus", {
      Key: invoiceId,
      KeyType: "InvoiceId",
    });

    if (!data.IsSuccess) {
      throw new Error(data.Message || "Failed to verify payment");
    }

    return data.Data;
  } catch (error) {
    console.error("MyFatoorah GetPaymentStatus Error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.Message || 
      error.message || 
      "Failed to verify payment status"
    );
  }
};
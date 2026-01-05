import axios from "axios";

const MF_BASE_URL = "https://apitest.myfatoorah.com";
const MF_API_KEY = process.env.MF_API_KEY;

const mf = axios.create({
  baseURL: MF_BASE_URL,
  headers: {
    Authorization: `Bearer ${MF_API_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * STEP 1: Initiate Payment Session
 */
export const initiateMyFatoorahSession = async (orderId) => {
  const { data } = await mf.post("/v2/InitiateSession", {
    CustomerIdentifier: orderId.toString(),
  });

  if (!data.IsSuccess) {
    throw new Error(data.Message || "Failed to initiate session");
  }

  return data.Data;
};

/**
 * STEP 2: Check Payment Status (Webhook / Polling)
 */
export const getMyFatoorahPaymentStatus = async (invoiceId) => {
  const { data } = await mf.post("/v2/GetPaymentStatus", {
    Key: invoiceId,
    KeyType: "InvoiceId",
  });

  if (!data.IsSuccess) {
    throw new Error(data.Message || "Failed to verify payment");
  }

  return data.Data;
};

import axios from "axios";

const MF_BASE_URL = "https://apitest.myfatoorah.com"; // SAUDI TEST
const MF_API_KEY = process.env.MF_API_KEY;

const mf = axios.create({
  baseURL: MF_BASE_URL,
  headers: {
    Authorization: `Bearer ${MF_API_KEY}`,
    "Content-Type": "application/json",
  },
});
export const initiateMyFatoorahSession = async (orderId) => {
  try {
    console.log("=== MyFatoorah InitiateSession Request ===");
    console.log("Request CustomerIdentifier:", orderId);
    console.log("Using Base URL:", MF_BASE_URL);
    console.log("API Key present:", !!MF_API_KEY);
    console.log("API Key prefix:", MF_API_KEY ? MF_API_KEY.substring(0, 10) + "..." : "MISSING");

    const response = await axios.post(
      `${MF_BASE_URL}/v2/InitiateSession`,
      {
        CustomerIdentifier: orderId,
      },
      {
        headers: {
          Authorization: `Bearer ${MF_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("=== MyFatoorah InitiateSession Response ===");
    console.log("Response IsSuccess:", response.data.IsSuccess);
    console.log("Response Message:", response.data.Message);
    console.log("Response ValidationErrors:", response.data.ValidationErrors);
    console.log("Response Data:", JSON.stringify(response.data.Data, null, 2));
    console.log("==========================================");

    if (!response.data.IsSuccess) {
      throw new Error(response.data.Message);
    }

    return response.data.Data;
  } catch (error) {
    console.error("=== MyFatoorah InitiateSession Error ===");
    console.error("Error Message:", error.message);
    console.error("Error Response:", error.response?.data);
    console.error("Error Status:", error.response?.status);
    console.error("========================================");
    throw error;
  }
};

export const getMyFatoorahPaymentStatus = async (invoiceId) => {
  const response = await axios.post(
    `${MF_BASE_URL}/v2/GetPaymentStatus`,
    {
      Key: invoiceId,
      KeyType: "InvoiceId",
    },
    {
      headers: {
        Authorization: `Bearer ${MF_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data.IsSuccess) {
    throw new Error("Failed to verify payment");
  }

  return response.data.Data;
};
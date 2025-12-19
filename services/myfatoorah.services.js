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
export const initiateMyFatoorahSession = async ( orderId) => {
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

  if (!response.data.IsSuccess) {
    throw new Error(response.data.Message);
  }

  return response.data.Data;
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
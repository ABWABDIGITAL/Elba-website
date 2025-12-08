import axios from "axios";

const MF_BASE_URL = process.env.MYFATOORAH_BASE_URL || "https://apitest.myfatoorah.com";
const MF_API_KEY = process.env.MYFATOORAH_TOKEN;
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5000";

export const createMyFatoorahPayment = async (order, user) => {
  const finalAmount = order.totalPrice;

  const payload = {
    PaymentMethodId: 2,
    InvoiceValue: finalAmount,
    DisplayCurrencyIso: "SAR",

    CustomerName: order.shippingAddress.fullName,
    MobileCountryCode: "+966",
    CustomerMobile: order.shippingAddress.phone.replace(/^0/, ""),

    CustomerEmail: user.email || "test@test.com",
    Language: "en",
    CustomerReference: order._id.toString(),

    InvoiceItems: [
      { ItemName: "Order Total", Quantity: 1, UnitPrice: finalAmount }
    ],

    CallBackUrl: `${APP_BASE_URL}/api/payment/myfatoorah/success`,
    ErrorUrl: `${APP_BASE_URL}/api/payment/myfatoorah/error`
  };

  const res = await axios.post(`${MF_BASE_URL}/v2/ExecutePayment`, payload, {
    headers: { Authorization: `Bearer ${MF_API_KEY}` }
  });

  return res.data.Data;
};
export const getMyFatoorahPaymentStatus = async ({ paymentId }) => {
  const res = await axios.post(
    `${MF_BASE_URL}/v2/GetPaymentStatus`,
    { Key: paymentId, KeyType: "PaymentId" },
    { headers: { Authorization: `Bearer ${MF_API_KEY}` } }
  );

  const d = res.data.Data;
  const trx = d.PaymentTransactions?.[0];

  return {
    orderId: d.CustomerReference || d.UserDefinedField,
    status: d.InvoiceStatus, // return real MF status
    isPaid: d.InvoiceStatus === "Paid",
    transactionId: trx?.TransactionId || null,
    amount: trx?.PaidCurrencyValue || 0
  };
};

export default {
  createMyFatoorahPayment,
  getMyFatoorahPaymentStatus,
};
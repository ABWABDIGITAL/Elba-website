import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { getMyFatoorahPaymentStatus ,initiateMyFatoorahSession} from "../services/myfatoorah.services.js";
import { NotFound, BadRequest } from "../utlis/apiError.js";

export const myFatoorahWebhookController = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { Data } = req.body;
    const orderId = Data.UserDefinedField;

    if (!orderId) {
      return res.status(400).json({ message: "Missing order reference" });
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw NotFound("Order not found");
    }

    // ✅ Idempotency: already processed
    if (order.paymentStatus === "paid") {
      await session.commitTransaction();
      return res.json({ message: "Already processed" });
    }

    // 🔐 Verify payment with MyFatoorah
    const paymentData = await getMyFatoorahPaymentStatus(Data.InvoiceId);

    if (
      paymentData.InvoiceStatus !== "Paid" ||
      paymentData.InvoiceValue !== order.totalPrice
    ) {
      throw BadRequest("Payment verification failed");
    }

    // ✅ Update order payment
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paidAt = new Date();
    order.paymentResult = {
      id: paymentData.InvoiceId,
      status: "paid",
    };

    // ✅ Deduct stock AFTER payment
    for (const item of order.orderItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          stock: { $gte: item.quantity },
        },
        {
          $inc: {
            stock: -item.quantity,
            salesCount: item.quantity,
          },
        },
        { session }
      );

      if (!updated) {
        throw BadRequest("Insufficient stock during payment confirmation");
      }
    }

    // ✅ Clear cart
    await Cart.updateOne(
      { user: order.user },
      {
        $set: {
          cartItems: [],
          totalCartPrice: 0,
          totalPriceAfterDiscount: 0,
          appliedCoupon: undefined,
        },
      },
      { session }
    );

    await order.save({ session });

    await session.commitTransaction();
    res.json({ message: "Payment processed successfully" });

  } catch (err) {
    await session.abortTransaction();
    console.error("Webhook Error:", err);
    res.status(500).json({ message: "Webhook processing failed" });
  } finally {
    session.endSession();
  }
};

export const initiateEmbeddedPaymentSession = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      throw NotFound("Order not found or invalid payment method");
    }

    if (order.paymentStatus === "paid") {
      throw BadRequest("Order already paid");
    }

    const sessionData = await initiateMyFatoorahSession(orderId.toString());

    // Save MF data
    order.myFatoorah = {
      sessionId: sessionData.SessionId,
      countryCode: sessionData.CountryCode,
      customerIdentifier: orderId.toString(),
    };

    await order.save();

    res.json({
      OK: true,
      sessionId: sessionData.SessionId,
      countryCode: sessionData.CountryCode,
    });
  } catch (err) {
    next(err);
  }
};

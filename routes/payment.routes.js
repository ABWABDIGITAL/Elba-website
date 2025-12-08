import express from "express";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { protect } from "../middlewares/authMiddleware.js";
import { createMyFatoorahPayment, getMyFatoorahPaymentStatus } from "../services/myfatoorah.services.js";

const router = express.Router();
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";


// -----------------------------------------------------
// 1️⃣ CHECKOUT
// -----------------------------------------------------
router.post("/checkout", protect, async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ user: userId, isActive: true }).populate("cartItems.product");

    if (!cart || cart.cartItems.length === 0)
      return res.status(400).json({ success: false, message: "Cart is empty" });

    const orderItems = cart.cartItems.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.price
    }));

    const order = await Order.create({
      user: userId,
      orderItems,
      shippingAddress,
      itemsPrice: cart.totalCartPrice,
      totalPrice: cart.totalPriceAfterDiscount ?? cart.totalCartPrice,
      paymentStatus: "pending",
      orderStatus: "pending"
    });

    const payment = await createMyFatoorahPayment(order, user);

    await Order.findByIdAndUpdate(order._id, {
      paymentResult: { id: payment.InvoiceId, status: "pending" }
    });

    res.json({
      success: true,
      orderId: order._id,
      paymentUrl: payment.PaymentURL
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


  router.get("/myfatoorah/success", async (req, res) => {
    try {
      const { paymentId } = req.query;
      if (!paymentId) return res.redirect(`${FRONTEND}/checkout/error`);

      const paymentData = await getMyFatoorahPaymentStatus({ paymentId });

      if (!paymentData.isPaid) {
        return res.redirect(`${FRONTEND}/checkout/error`);
      }

      const order = await Order.findById(paymentData.orderId);
      if (!order) throw new Error("Order not found");

      // Update stock
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }

      order.paymentStatus = "paid";
      order.orderStatus = "completed";
      order.paymentResult = {
        id: paymentId,
        status: "paid",
        amount: paymentData.amount,
        transactionId: paymentData.transactionId
      };
      await order.save();

      // Clear cart
      await Cart.findOneAndUpdate(
        { user: order.user },
        { cartItems: [], totalCartPrice: 0, totalPriceAfterDiscount: 0, appliedCoupon: null }
      );

      return res.redirect(`${FRONTEND}/checkout/success?orderId=${order._id}`);

    } catch (err) {
      return res.redirect(`${FRONTEND}/checkout/error`);
    }
  });



// -----------------------------------------------------
// 3️⃣ ERROR CALLBACK
// -----------------------------------------------------
router.get("/myfatoorah/error", (req, res) => {
  return res.redirect(`${FRONTEND}/checkout/error`);
});

export default router;

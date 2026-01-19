// controllers/payment.controller.js
import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import PaymentLog from "../models/paymentLog.model.js"; // New model for audit
import {
  getMyFatoorahPaymentStatus,
  initiateMyFatoorahSession,
  getPaymentStatusBySession
} from "../services/myfatoorah.services.js";
import { NotFound, BadRequest, Forbidden } from "../utlis/apiError.js";

// ============================================
// WEBHOOK CONTROLLER (Secured)
// ============================================
export const myFatoorahWebhookController = async (req, res) => {
  const session = await mongoose.startSession();
  const startTime = Date.now();
  
  // Always log webhook attempts for audit
  const logEntry = {
    eventType: 'webhook_received',
    payload: sanitizeLogPayload(req.body),
    ip: req.ip,
    timestamp: new Date(),
    status: 'pending',
  };

  try {
    session.startTransaction();

    const { Event, Data } = req.body;
    
    // 1. Validate event type
    if (Event !== 'TransactionsStatusChanged') {
      logEntry.status = 'ignored';
      logEntry.reason = 'Unhandled event type';
      await PaymentLog.create(logEntry);
      return res.json({ message: 'Event ignored' });
    }

    const orderId = Data.UserDefinedField;
    const invoiceId = Data.InvoiceId;

    // 2. Validate orderId format
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      logEntry.status = 'rejected';
      logEntry.reason = 'Invalid order reference';
      await PaymentLog.create(logEntry);
      return res.status(400).json({ message: 'Invalid request' });
    }

    logEntry.orderId = orderId;

    // 3. Find order with session
    const order = await Order.findById(orderId).session(session);
    
    if (!order) {
      logEntry.status = 'rejected';
      logEntry.reason = 'Order not found';
      await PaymentLog.create(logEntry);
      throw NotFound("Order not found");
    }

    // 4. Idempotency check - already processed
    if (order.paymentStatus === "paid") {
      logEntry.status = 'duplicate';
      await PaymentLog.create(logEntry);
      await session.commitTransaction();
      return res.json({ message: "Already processed" });
    }

    // 5. Verify order is in valid state for payment
    if (order.paymentStatus !== "pending") {
      logEntry.status = 'rejected';
      logEntry.reason = `Invalid order status: ${order.paymentStatus}`;
      await PaymentLog.create(logEntry);
      throw BadRequest("Order not eligible for payment");
    }

    // 6. Check order age (reject payments for very old orders)
    const orderAgeHours = (Date.now() - order.createdAt) / (1000 * 60 * 60);
    const maxOrderAgeHours = parseInt(process.env.MAX_ORDER_AGE_HOURS) || 24;
    
    if (orderAgeHours > maxOrderAgeHours) {
      logEntry.status = 'rejected';
      logEntry.reason = 'Order expired';
      await PaymentLog.create(logEntry);
      throw BadRequest("Order has expired");
    }

    // 7. 🔐 CRITICAL: Verify payment with MyFatoorah API
    const paymentData = await getMyFatoorahPaymentStatus(invoiceId);

    // 8. Verify payment status
    if (paymentData.InvoiceStatus !== "Paid") {
      logEntry.status = 'payment_not_completed';
      logEntry.paymentStatus = paymentData.InvoiceStatus;
      await PaymentLog.create(logEntry);
      
      // Update order with failed payment info
      order.paymentStatus = 'failed';
      order.paymentResult = {
        id: invoiceId,
        status: paymentData.InvoiceStatus,
        failedAt: new Date(),
      };
      await order.save({ session });
      await session.commitTransaction();
      
      return res.json({ message: "Payment status updated" });
    }

    // 9. 🔐 CRITICAL: Verify amount with tolerance for floating point
    const expectedAmount = order.totalPrice;
    const paidAmount = paymentData.InvoiceValue;
    const tolerance = 0.01; // 1 cent tolerance
    
    if (Math.abs(paidAmount - expectedAmount) > tolerance) {
      logEntry.status = 'amount_mismatch';
      logEntry.expectedAmount = expectedAmount;
      logEntry.paidAmount = paidAmount;
      await PaymentLog.create(logEntry);
      
      console.error(`Amount mismatch for order ${orderId}: expected ${expectedAmount}, got ${paidAmount}`);
      throw BadRequest("Payment verification failed");
    }

    // 10. 🔐 Verify currency matches
    if (paymentData.Currency !== order.currency) {
      logEntry.status = 'currency_mismatch';
      await PaymentLog.create(logEntry);
      throw BadRequest("Currency mismatch");
    }

    // 11. ✅ Update order payment status
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paidAt = new Date();
    order.paymentResult = {
      id: invoiceId,
      status: "paid",
      transactionId: paymentData.TransactionId,
      paymentMethod: paymentData.PaymentMethodName,
      paidAmount: paidAmount,
      paidAt: new Date(),
    };

    // 12. ✅ Deduct stock atomically
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
        { session, new: true }
      );

      if (!updated) {
        // This is a critical error - payment received but stock depleted
        logEntry.status = 'stock_error';
        logEntry.productId = item.product;
        await PaymentLog.create(logEntry);
        
        // Mark order for manual review instead of failing
        order.orderStatus = "pending_review";
        order.adminNotes = `Stock issue for product ${item.product} at payment time`;
        
        // Don't throw - we received the payment, need manual intervention
        console.error(`CRITICAL: Stock depleted for paid order ${orderId}`);
      }
    }

    // 13. ✅ Clear cart
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

    // 14. Log successful payment
    logEntry.status = 'success';
    logEntry.processingTime = Date.now() - startTime;
    await PaymentLog.create(logEntry);

    // 15. TODO: Send confirmation email/notification (async, don't block response)
    setImmediate(() => {
      sendOrderConfirmationEmail(order).catch(console.error);
    });

    res.json({ message: "Payment processed successfully" });

  } catch (err) {
    await session.abortTransaction();
    
    logEntry.status = 'error';
    logEntry.error = err.message;
    logEntry.processingTime = Date.now() - startTime;
    await PaymentLog.create(logEntry).catch(console.error);
    
    console.error("Webhook Error:", err);
    
    // Don't leak error details to external callers
    res.status(500).json({ message: "Webhook processing failed" });
    
  } finally {
    session.endSession();
  }
};

// ============================================
// INITIATE PAYMENT SESSION (Secured)
// ============================================
export const initiateEmbeddedPaymentSession = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw BadRequest("Invalid order ID");
    }

    // 2. Find order and verify ownership
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      throw NotFound("Order not found");
    }

    // 3. Verify payment method
    if (order.paymentMethod !== "myfatoorah") {
      throw BadRequest("Invalid payment method for this order");
    }

    // 4. Check payment status
    if (order.paymentStatus === "paid") {
      throw BadRequest("Order already paid");
    }

    if (order.paymentStatus === "failed") {
      // Allow retry for failed payments
      order.paymentStatus = "pending";
    }

    // 5. Check order status
    if (order.orderStatus === "cancelled") {
      throw BadRequest("Cannot pay for cancelled order");
    }

    // 6. Check order age
    const orderAgeHours = (Date.now() - order.createdAt) / (1000 * 60 * 60);
    const maxOrderAgeHours = parseInt(process.env.MAX_ORDER_AGE_HOURS) || 24;
    
    if (orderAgeHours > maxOrderAgeHours) {
      throw BadRequest("Order has expired. Please create a new order.");
    }

    // 7. Verify stock is still available (pre-check)
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product).select('stock title');
      if (!product || product.stock < item.quantity) {
        throw BadRequest(`Insufficient stock for ${product?.title || 'product'}`);
      }
    }

    // 8. Rate limiting check (per user)
    const recentAttempts = await Order.countDocuments({
      user: userId,
      'myFatoorah.initiatedAt': { 
        $gte: new Date(Date.now() - 60000) // Last minute
      }
    });

    if (recentAttempts >= 5) {
      throw BadRequest("Too many payment attempts. Please wait.");
    }

    // 9. Initiate session with MyFatoorah
    const sessionData = await initiateMyFatoorahSession({
      orderId: orderId.toString(),
      amount: order.totalPrice,
      currency: order.currency || 'KWD',
      customerEmail: req.user.email,
      customerName: req.user.name,
    });

    // 10. Save session data
    order.myFatoorah = {
      sessionId: sessionData.SessionId,
      countryCode: sessionData.CountryCode,
      customerIdentifier: orderId.toString(),
      initiatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
    };

    await order.save();

    // 11. Log payment initiation
    await PaymentLog.create({
      eventType: 'payment_initiated',
      orderId: orderId,
      userId: userId,
      sessionId: sessionData.SessionId,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      sessionId: sessionData.SessionId,
      countryCode: sessionData.CountryCode,
    });

  } catch (err) {
    next(err);
  }
};

// ============================================
// VERIFY PAYMENT (Called by Frontend after Embedded Payment)
// ============================================
export const verifyEmbeddedPayment = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { orderId } = req.body;
    const userId = req.user._id;

    console.log("=== Verify Embedded Payment ===");
    console.log("OrderId:", orderId);
    console.log("UserId:", userId);

    // 1. Validate orderId
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw BadRequest("Invalid order ID");
    }

    // 2. Find the order
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw NotFound("Order not found");
    }

    // 3. Verify order belongs to user
    if (order.user.toString() !== userId.toString()) {
      throw Forbidden("Not authorized to verify this order");
    }

    // 4. Check if already paid
    if (order.paymentStatus === "paid") {
      await session.commitTransaction();
      return res.json({
        success: true,
        message: "Payment already verified",
        paymentStatus: "paid",
        orderStatus: order.orderStatus,
      });
    }

    // 5. Get sessionId from order
    const sessionId = order.myFatoorah?.sessionId;
    if (!sessionId) {
      throw BadRequest("No payment session found for this order");
    }

    console.log("SessionId from order:", sessionId);

    // 6. Verify payment status with MyFatoorah
    let paymentData;
    try {
      paymentData = await getPaymentStatusBySession(sessionId);
    } catch (error) {
      console.error("MyFatoorah verification error:", error.message);
      throw BadRequest("Unable to verify payment status");
    }

    console.log("Payment Status:", paymentData.InvoiceStatus);

    // 7. Check payment status
    if (paymentData.InvoiceStatus !== "Paid") {
      // Payment not completed yet
      order.paymentStatus = paymentData.InvoiceStatus === "Failed" ? "failed" : "pending";
      await order.save({ session });
      await session.commitTransaction();

      return res.json({
        success: false,
        message: `Payment ${paymentData.InvoiceStatus.toLowerCase()}`,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      });
    }

    // 8. Verify amount (with tolerance)
    const expectedAmount = order.totalPrice;
    const paidAmount = paymentData.InvoiceValue;
    const tolerance = 0.01;

    if (Math.abs(paidAmount - expectedAmount) > tolerance) {
      console.error(`Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`);
      throw BadRequest("Payment amount mismatch");
    }

    // 9. Update order to paid
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paidAt = new Date();
    order.paymentResult = {
      id: paymentData.InvoiceId,
      status: "paid",
      transactionId: paymentData.InvoiceTransactions?.[0]?.TransactionId,
      paymentMethod: paymentData.InvoiceTransactions?.[0]?.PaymentGateway,
      paidAmount: paidAmount,
      paidAt: new Date(),
    };

    // 10. Deduct stock
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }

    // 11. Clear user's cart
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [], totalPrice: 0 } },
      { session }
    );

    // 12. Add status history
    order.statusHistory.push({
      status: "confirmed",
      timestamp: new Date(),
    });

    await order.save({ session });

    // 13. Log successful payment
    await PaymentLog.create({
      eventType: "payment_verified",
      orderId: orderId,
      userId: userId,
      invoiceId: paymentData.InvoiceId,
      amount: paidAmount,
      timestamp: new Date(),
      status: "success",
    });

    await session.commitTransaction();

    console.log("=== Payment Verified Successfully ===");

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentStatus: "paid",
      orderStatus: "confirmed",
      orderId: order._id,
      orderNumber: order.orderNumber,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Verify payment error:", error);
    next(error);
  } finally {
    session.endSession();
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function sanitizeLogPayload(payload) {
  // Remove sensitive data before logging
  const sanitized = { ...payload };
  if (sanitized.Data) {
    sanitized.Data = {
      InvoiceId: sanitized.Data.InvoiceId,
      InvoiceStatus: sanitized.Data.InvoiceStatus,
      UserDefinedField: sanitized.Data.UserDefinedField,
      // Don't log card details, customer info, etc.
    };
  }
  return sanitized;
}

async function sendOrderConfirmationEmail(order) {
  // Implement email sending
}
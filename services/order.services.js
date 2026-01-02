import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Coupon from "../models/coupon.model.js";
import User from "../models/user.model.js";
import ApiError ,{ BadRequest, NotFound, ServerError, Forbidden } from "../utlis/apiError.js";
import mongoose from "mongoose";
import { sendOrderUpdateWhatsApp } from "./whatsapp.services.js";
import { trackOrderPlaced, trackOrderStatusChange } from '../services/analytics.services.js';


/* --------------------------------------------------
   HELPER FUNCTIONS
--------------------------------------------------- */

// Calculate tax (15% VAT for Saudi Arabia)
const calculateTax = (price) => {
  const VAT_RATE = 0.15;
  return Number((price * VAT_RATE).toFixed(2));
};

// Calculate shipping based on order total
const calculateShipping = (totalPrice) => {
  const FREE_SHIPPING_THRESHOLD = 200;
  const STANDARD_SHIPPING = 25;

  return totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
};

/* --------------------------------------------------
   CREATE ORDER FROM CART (WITH ATOMIC STOCK UPDATES)
--------------------------------------------------- */
export const createOrderService = async (userId, shippingAddress, paymentMethod = "cash_on_delivery") => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Get user's active cart
    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate("cartItems.product")
      .session(session);

    if (!cart || cart.cartItems.length === 0) {
      throw BadRequest("Cart is empty");
    }

    // 2) Validate & reserve stock
    const orderItems = [];

    for (const item of cart.cartItems) {
      const product = item.product;
      //TODO: implement stock reservation by my fatoorah webhook that will update the stock and the payment status
      // const updatedProduct = await Product.findOneAndUpdate(
      //   {
      //     _id: product._id,
      //     stock: { $gte: item.quantity },
      //     status: "active",
      //   },
      //   { $inc: { stock: -item.quantity, salesCount: item.quantity } },
      //   { new: true, session }
      // );

      // if (!updatedProduct) {
      //   throw BadRequest(`Insufficient stock for ${product.en?.name}`);
      // }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        color: item.color,
        price: item.price,
        productName: {
          en: product.en?.name,
          ar: product.ar?.name,
        },
        productSku: product.sku,
      });
    }

    // 3) Calculate pricing
    const itemsPrice = cart.totalCartPrice;
    const shippingPrice = 0;
    const discountAmount = itemsPrice - cart.totalPriceAfterDiscount;
    const subtotal = itemsPrice - discountAmount + shippingPrice;
    const taxPrice = 0;
    const totalPrice = subtotal + taxPrice;

    // 4) Create order object (NOT SAVED YET)
    const order = new Order({
      user: userId,
      orderItems,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountAmount,
      totalPrice: Number(totalPrice.toFixed(2)),
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
    });
console.log("Running hooks? isNew =", order.isNew);

    // 5) Save the order ONCE (Triggers pre-save hook → generates orderNumber)
    await order.save({ session });

    console.log("✔ Order saved. OrderNumber =", order.orderNumber);

    if (paymentMethod === "credit_card") {
      await session.commitTransaction();
      session.endSession();
      
      return {
        OK: true,
        message: "Order created, proceed to payment",
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentRequired: true
      };
    }


    // -------------------------------------------
    // 7) CASH ON DELIVERY (normal flow)
    // -------------------------------------------
    await Cart.updateOne(
      { _id: cart._id },
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

    await session.commitTransaction();
    session.endSession();
     await trackOrderPlaced(req, order);
    return {
      OK: true,
      message: "Order created successfully",
      data: order,
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (err instanceof ApiError) throw err;
    throw ServerError("Failed to create order", err.message);
  }
};


/* --------------------------------------------------
   GET USER ORDERS
--------------------------------------------------- */
export const getUserOrdersService = async (userId, query) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { user: userId, isActive: true };

    // Filter by status if provided
    if (query.status) {
      filter.orderStatus = query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select("orderNumber orderStatus totalPrice createdAt") 
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      OK: true,
      message: "Orders retrieved successfully",
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    throw ServerError("Failed to get orders", err);
  }
};

/* --------------------------------------------------
   GET ORDER BY ID
--------------------------------------------------- */
export const getOrderByIdService = async (userId, orderId, isAdmin = false) => {
  try {
    const filter = { _id: orderId, isActive: true };

    // Non-admin users can only see their own orders
    if (!isAdmin) {
      filter.user = userId;
    }

    const order = await Order.findOne(filter)
      .populate("orderItems.product", "en.title ar.title   en.images ar.images sku")
      .populate("user", "firstName lastName email phone")
      .populate("appliedCoupon", "code discountType discountValue");

    if (!order) {
      throw NotFound("Order not found");
    }

    return {
      OK: true,
      message: "Order retrieved successfully",
      data: order,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof ApiError) {
      throw err;
    }
    throw ServerError("Failed to get order", err);
  }
};

/* --------------------------------------------------
   GET ALL ORDERS (ADMIN)
--------------------------------------------------- */
export const getAllOrdersService = async (query) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    // Filter by status
    if (query.status) {
      filter.orderStatus = query.status;
    }

    // Filter by payment status
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "firstName lastName email phone")
        .populate("orderItems.product", "en.name ar.name sku")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      OK: true,
      message: "Orders retrieved successfully",
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    throw ServerError("Failed to get orders", err);
  }
};

/* --------------------------------------------------
   UPDATE ORDER STATUS (ADMIN)
--------------------------------------------------- */
export const updateOrderStatusService = async (orderId, status, note = null) => {
  try {
    const order = await Order.findById(orderId).populate("user");
    if (!order) {
      throw NotFound("Order not found");
    }

    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: ["returned"],
      cancelled: [],
      returned: [],
    };

    if (!validTransitions[order.orderStatus]?.includes(status)) {
      throw BadRequest(
        `Cannot transition from ${order.orderStatus} to ${status}`
      );
    }

    order.orderStatus = status;

    // Update specific timestamps
    if (status === "shipped") {
      order.shippedAt = new Date();
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
      order.paymentStatus = "paid"; // Auto-mark as paid on delivery for COD
    } else if (status === "cancelled") {
      order.cancelledAt = new Date();
    }

    // Add note to status history
    if (note) {
      order.statusHistory[order.statusHistory.length - 1].note = note;
    }

    await order.save();

    // Send WhatsApp notification for important status changes
    if (["confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      const user = order.user._id ? order.user : await User.findById(order.user);
      sendOrderUpdateWhatsApp(order, user, status).catch(err => {
        console.error("Failed to send order update WhatsApp:", err);
      });
    }
    await trackOrderStatusChange(order, status, req);
    return {
      OK: true,
      message: `Order status updated to ${status}`,
      data: order,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof BadRequest || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to update order status", err);
  }
};

/* --------------------------------------------------
   CANCEL ORDER (USER)
--------------------------------------------------- */
export const cancelOrderService = async (userId, orderId, reason = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      isActive: true,
    }).session(session);

    if (!order) {
      throw NotFound("Order not found");
    }

    if (!order.canBeCancelled) {
      throw BadRequest(
        `Cannot cancel order with status: ${order.orderStatus}`
      );
    }

    // Restore stock for all items
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: item.quantity,
            salesCount: item.quantity,
          },
        },
        { session }
      );
    }

    // Restore coupon usage count
    if (order.appliedCoupon) {
      await Coupon.findByIdAndUpdate(
        order.appliedCoupon,
        { $inc: { usedCount: -1 } },
        { session }
      );
    }

    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();
    if (reason) {
      order.cancellationReason = reason;
    }

    await order.save({ session });
    await session.commitTransaction();

    return {
      OK: true,
      message: "Order cancelled successfully",
      data: order,
    };
  } catch (err) {
    await session.abortTransaction();

    if (err.name === "ApiError" || err instanceof BadRequest || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to cancel order", err);
  } finally {
    session.endSession();
  }
};

/* --------------------------------------------------
   UPDATE PAYMENT STATUS (ADMIN/PAYMENT GATEWAY WEBHOOK)
--------------------------------------------------- */
export const updatePaymentStatusService = async (orderId, paymentData) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw NotFound("Order not found");
    }

    order.paymentStatus = paymentData.status;

    if (paymentData.status === "paid") {
      order.paidAt = new Date();
      order.paymentResult = {
        id: paymentData.transactionId,
        status: paymentData.status,
        update_time: new Date(),
        email_address: paymentData.email,
      };

      // Auto-confirm order on successful payment
      if (order.orderStatus === "pending") {
        order.orderStatus = "confirmed";
      }
    }

    await order.save();

    return {
      OK: true,
      message: "Payment status updated successfully",
      data: order,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to update payment status", err);
  }
};

/* --------------------------------------------------
   UPDATE TRACKING INFO (ADMIN)
--------------------------------------------------- */
export const updateTrackingInfoService = async (orderId, trackingNumber, carrier, estimatedDelivery = null) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw NotFound("Order not found");
    }

    order.trackingNumber = trackingNumber;
    order.carrier = carrier;

    if (estimatedDelivery) {
      order.estimatedDelivery = new Date(estimatedDelivery);
    }

    await order.save();

    return {
      OK: true,
      message: "Tracking information updated successfully",
      data: order,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to update tracking info", err);
  }
};

/* --------------------------------------------------
   GET ORDER STATISTICS (ADMIN)
--------------------------------------------------- */
export const getOrderStatsService = async () => {
  try {
    const stats = await Order.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments({ isActive: true });
    const totalRevenue = await Order.aggregate([
      { $match: { isActive: true, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    return {
      OK: true,
      message: "Order statistics retrieved successfully",
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        byStatus: stats,
      },
    };
  } catch (err) {
    throw ServerError("Failed to get order statistics", err);
  }
};

/* --------------------------------------------------
   BULK UPDATE ORDER STATUS (ADMIN)
--------------------------------------------------- */
export const bulkUpdateOrderStatusService = async (orderIds, status, note = null) => {
  try {
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw BadRequest(`Invalid status: ${status}`);
    }

    const orders = await Order.find({
      _id: { $in: orderIds },
      isActive: true,
    }).populate("user");

    if (orders.length === 0) {
      throw NotFound("No orders found");
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const order of orders) {
      try {
        const validTransitions = {
          pending: ["confirmed", "cancelled"],
          confirmed: ["processing", "cancelled"],
          processing: ["shipped", "cancelled"],
          shipped: ["delivered"],
          delivered: ["returned"],
          cancelled: [],
          returned: [],
        };

        if (!validTransitions[order.orderStatus]?.includes(status)) {
          results.failed.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            reason: `Cannot transition from ${order.orderStatus} to ${status}`,
          });
          continue;
        }

        order.orderStatus = status;

        if (status === "shipped") {
          order.shippedAt = new Date();
        } else if (status === "delivered") {
          order.deliveredAt = new Date();
          order.paymentStatus = "paid";
        } else if (status === "cancelled") {
          order.cancelledAt = new Date();
        }

        if (note) {
          order.statusHistory[order.statusHistory.length - 1].note = note;
        }

        await order.save();

        // Send WhatsApp notification
        if (["confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
          const user = order.user._id ? order.user : await User.findById(order.user);
          sendOrderUpdateWhatsApp(order, user, status).catch(err => {
            console.error("Failed to send order update WhatsApp:", err);
          });
        }

        results.success.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
        });
      } catch (err) {
        results.failed.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason: err.message,
        });
      }
    }

    return {
      OK: true,
      message: `Bulk update completed: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    };
  } catch (err) {
    if (err.name === "ApiError" || err instanceof BadRequest || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to bulk update orders", err);
  }
};

/* --------------------------------------------------
   BULK EXPORT ORDERS (ADMIN)
--------------------------------------------------- */
export const bulkExportOrdersService = async (filters = {}) => {
  try {
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = filters;

    const query = { isActive: true };

    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      query.totalPrice = {};
      if (minAmount) query.totalPrice.$gte = parseFloat(minAmount);
      if (maxAmount) query.totalPrice.$lte = parseFloat(maxAmount);
    }

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("orderItems.product", "en.name ar.name sku")
      .sort({ createdAt: -1 })
      .lean();

    // Transform to export format (CSV-friendly)
    const exportData = orders.map(order => ({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || "N/A",
      customerPhone: order.user?.phone || "N/A",
      customerEmail: order.user?.email || "N/A",
      orderDate: order.createdAt,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      totalPrice: order.totalPrice,
      itemsCount: order.orderItems.length,
      shippingAddress: `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.region}`,
      shippingPhone: order.shippingAddress.phone,
    }));

    return {
      OK: true,
      message: `Exported ${exportData.length} orders`,
      data: exportData,
      totalRecords: exportData.length,
    };
  } catch (err) {
    throw ServerError("Failed to export orders", err);
  }
};

/* --------------------------------------------------
   GET ORDER ANALYTICS (ADMIN)
--------------------------------------------------- */
export const getOrderAnalyticsService = async (startDate, endDate) => {
  try {
    const matchStage = { isActive: true };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalPrice" },
                avgOrderValue: { $avg: "$totalPrice" },
                totalItems: { $sum: { $size: "$orderItems" } },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: "$orderStatus",
                count: { $sum: 1 },
                revenue: { $sum: "$totalPrice" },
              },
            },
            { $sort: { count: -1 } },
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: "$paymentMethod",
                count: { $sum: 1 },
                revenue: { $sum: "$totalPrice" },
              },
            },
          ],
          byPaymentStatus: [
            {
              $group: {
                _id: "$paymentStatus",
                count: { $sum: 1 },
                revenue: { $sum: "$totalPrice" },
              },
            },
          ],
          dailyOrders: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                  day: { $dayOfMonth: "$createdAt" },
                },
                orders: { $sum: 1 },
                revenue: { $sum: "$totalPrice" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
            { $limit: 30 },
          ],
          topCustomers: [
            {
              $group: {
                _id: "$user",
                orders: { $sum: 1 },
                totalSpent: { $sum: "$totalPrice" },
              },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "customer",
              },
            },
            { $unwind: "$customer" },
            {
              $project: {
                _id: 1,
                name: "$customer.name",
                phone: "$customer.phone",
                orders: 1,
                totalSpent: 1,
              },
            },
          ],
        },
      },
    ]);

    const result = {
      overview: analytics[0].overview[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        totalItems: 0,
      },
      byStatus: analytics[0].byStatus,
      byPaymentMethod: analytics[0].byPaymentMethod,
      byPaymentStatus: analytics[0].byPaymentStatus,
      dailyOrders: analytics[0].dailyOrders,
      topCustomers: analytics[0].topCustomers,
    };

    return {
      OK: true,
      message: "Order analytics retrieved successfully",
      data: result,
    };
  } catch (err) {
    throw ServerError("Failed to get order analytics", err);
  }
};

import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Coupon from "../models/coupon.model.js";
import { BadRequest, NotFound, ServerError, Forbidden } from "../utlis/apiError.js";
import mongoose from "mongoose";

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
    // 1. Get user's cart
    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate("cartItems.product")
      .session(session);

    if (!cart || cart.cartItems.length === 0) {
      throw BadRequest("Cart is empty");
    }

    // 2. Validate and reserve stock atomically for all products
    const orderItems = [];

    for (const item of cart.cartItems) {
      const product = item.product;

      // Atomic stock update with stock validation
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: item.quantity },
          status: "active",
        },
        {
          $inc: {
            stock: -item.quantity,
            salesCount: 1,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedProduct) {
        throw BadRequest(
          `Insufficient stock for ${product.en?.name || product.ar?.name}. Only ${product.stock} available.`
        );
      }

      // Create order item with product snapshot
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

    // 3. Calculate pricing
    const itemsPrice = cart.totalCartPrice;
    const shippingPrice = calculateShipping(itemsPrice);
    const discountAmount = itemsPrice - cart.totalPriceAfterDiscount;
    const subtotal = itemsPrice - discountAmount + shippingPrice;
    const taxPrice = calculateTax(subtotal);
    const totalPrice = subtotal + taxPrice;

    // 4. Create order
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
      paymentStatus: paymentMethod === "cash_on_delivery" ? "pending" : "pending",
      orderStatus: "pending",
    });

    // 5. Handle coupon if applied
    if (cart.appliedCoupon) {
      const coupon = await Coupon.findById(cart.appliedCoupon).session(session);
      if (coupon) {
        order.appliedCoupon = coupon._id;
        order.couponCode = coupon.code;

        // Increment coupon usage count
        await Coupon.findByIdAndUpdate(
          coupon._id,
          { $inc: { usedCount: 1 } },
          { session }
        );
      }
    }

    await order.save({ session });

    // 6. Clear cart after successful order
    cart.cartItems = [];
    cart.totalCartPrice = 0;
    cart.totalPriceAfterDiscount = 0;
    cart.appliedCoupon = undefined;
    await cart.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate order details
    await order.populate([
      {
        path: "orderItems.product",
        select: "en.name ar.name en.images ar.images sku",
      },
      {
        path: "user",
        select: "firstName lastName email phone",
      },
    ]);

    return {
      OK: true,
      message: "Order created successfully",
      data: order,
    };
  } catch (err) {
    await session.abortTransaction();

    if (err.name === "ApiError" || err instanceof BadRequest || err instanceof NotFound) {
      throw err;
    }
    throw ServerError("Failed to create order", err);
  } finally {
    session.endSession();
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
        .populate("orderItems.product", "en.name ar.name en.images ar.images sku")
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
      .populate("orderItems.product", "en.name ar.name en.images ar.images sku")
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
    if (err.name === "ApiError" || err instanceof NotFound) {
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
    const order = await Order.findById(orderId);
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
            salesCount: -1,
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

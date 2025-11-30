import {
  createOrderService,
  getUserOrdersService,
  getOrderByIdService,
  getAllOrdersService,
  updateOrderStatusService,
  cancelOrderService,
  updatePaymentStatusService,
  updateTrackingInfoService,
  getOrderStatsService,
  bulkUpdateOrderStatusService,
  bulkExportOrdersService,
  getOrderAnalyticsService,
} from "../services/order.services.js";
import { StatusCodes } from "http-status-codes";

/* --------------------------------------------------
   CREATE ORDER
--------------------------------------------------- */
export const createOrderController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shippingAddress, paymentMethod } = req.body;

    const result = await createOrderService(userId, shippingAddress, paymentMethod);

    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET USER ORDERS
--------------------------------------------------- */
export const getUserOrdersController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await getUserOrdersService(userId, req.query);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ORDER BY ID
--------------------------------------------------- */
export const getOrderByIdController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

    const result = await getOrderByIdService(userId, orderId, isAdmin);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ALL ORDERS (ADMIN)
--------------------------------------------------- */
export const getAllOrdersController = async (req, res, next) => {
  try {
    const result = await getAllOrdersService(req.query);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE ORDER STATUS (ADMIN)
--------------------------------------------------- */
export const updateOrderStatusController = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const result = await updateOrderStatusService(orderId, status, note);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   CANCEL ORDER (USER)
--------------------------------------------------- */
export const cancelOrderController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { reason } = req.body;

    const result = await cancelOrderService(userId, orderId, reason);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE PAYMENT STATUS (WEBHOOK/ADMIN)
--------------------------------------------------- */
export const updatePaymentStatusController = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const paymentData = req.body;

    const result = await updatePaymentStatusService(orderId, paymentData);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   UPDATE TRACKING INFO (ADMIN)
--------------------------------------------------- */
export const updateTrackingInfoController = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, carrier, estimatedDelivery } = req.body;

    const result = await updateTrackingInfoService(
      orderId,
      trackingNumber,
      carrier,
      estimatedDelivery
    );

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ORDER STATISTICS (ADMIN)
--------------------------------------------------- */
export const getOrderStatsController = async (req, res, next) => {
  try {
    const result = await getOrderStatsService();

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   BULK UPDATE ORDER STATUS (ADMIN)
--------------------------------------------------- */
export const bulkUpdateOrderStatusController = async (req, res, next) => {
  try {
    const { orderIds, status, note } = req.body;

    const result = await bulkUpdateOrderStatusService(orderIds, status, note);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   BULK EXPORT ORDERS (ADMIN)
--------------------------------------------------- */
export const bulkExportOrdersController = async (req, res, next) => {
  try {
    const filters = req.query;
    const result = await bulkExportOrdersService(filters);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
   GET ORDER ANALYTICS (ADMIN)
--------------------------------------------------- */
export const getOrderAnalyticsController = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await getOrderAnalyticsService(startDate, endDate);

    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    next(err);
  }
};

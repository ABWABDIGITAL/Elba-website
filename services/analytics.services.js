// services/analytics.service.js

import Event from "../models/event.model.js";
import { redis } from "../config/redis.js";
import crypto from "crypto";

const REALTIME_PREFIX = "analytics:realtime:";
const COUNTER_TTL = 86400; // 24 hours

/**
 * Core event tracking function
 */
export const trackEvent = async ({
  eventName,
  eventCategory,
  userId = null,
  sessionId,
  anonymousId = null,
  page = {},
  product = {},
  cart = {},
  order = {},
  search = {},
  attribution = {},
  device = {},
  geo = {},
  properties = {},
  error = {},
}) => {
  try {
    const event = await Event.create({
      eventName,
      eventCategory,
      userId,
      sessionId,
      anonymousId,
      isAuthenticated: !!userId,
      page: Object.keys(page).length > 0 ? page : undefined,
      product: Object.keys(product).length > 0 ? product : undefined,
      cart: Object.keys(cart).length > 0 ? cart : undefined,
      order: Object.keys(order).length > 0 ? order : undefined,
      search: Object.keys(search).length > 0 ? search : undefined,
      attribution: Object.keys(attribution).length > 0 ? attribution : undefined,
      device: Object.keys(device).length > 0 ? device : undefined,
      geo: Object.keys(geo).length > 0 ? geo : undefined,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      error: Object.keys(error).length > 0 ? error : undefined,
    });

    // Update real-time counters (fire-and-forget)
    updateRealtimeCounters(eventName, product, order).catch(console.error);

    return event;
  } catch (err) {
    console.error("Event tracking failed:", err);
    return null;
  }
};

/**
 * Update real-time counters in Redis
 */
const updateRealtimeCounters = async (eventName, product, order) => {
  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().getHours();

  const multi = redis.multi();

  // Daily event counter
  multi.hincrby(`${REALTIME_PREFIX}events:${today}`, eventName, 1);
  multi.expire(`${REALTIME_PREFIX}events:${today}`, COUNTER_TTL);

  // Hourly event counter
  multi.hincrby(`${REALTIME_PREFIX}hourly:${today}:${hour}`, eventName, 1);
  multi.expire(`${REALTIME_PREFIX}hourly:${today}:${hour}`, COUNTER_TTL);

  // Product views
  if (product?.productId && eventName === "product_viewed") {
    multi.zincrby(
      `${REALTIME_PREFIX}products:viewed:${today}`,
      1,
      product.productId.toString()
    );
    multi.expire(`${REALTIME_PREFIX}products:viewed:${today}`, COUNTER_TTL);
  }

  // Cart additions
  if (product?.productId && eventName === "product_added_to_cart") {
    multi.zincrby(
      `${REALTIME_PREFIX}products:carted:${today}`,
      1,
      product.productId.toString()
    );
    multi.expire(`${REALTIME_PREFIX}products:carted:${today}`, COUNTER_TTL);
  }

  // Revenue counter
  if (order?.totalAmount && eventName === "order_placed") {
    multi.incrbyfloat(`${REALTIME_PREFIX}revenue:${today}`, order.totalAmount);
    multi.hincrby(`${REALTIME_PREFIX}orders:${today}`, "count", 1);
    multi.hincrby(`${REALTIME_PREFIX}orders:${today}`, "items", order.itemCount || 0);
    multi.expire(`${REALTIME_PREFIX}revenue:${today}`, COUNTER_TTL);
    multi.expire(`${REALTIME_PREFIX}orders:${today}`, COUNTER_TTL);
  }

  await multi.exec();
};

/**
 * Track page view
 */
export const trackPageView = async (req, pageData = {}) => {
  return trackEvent({
    eventName: "page_view",
    eventCategory: "page",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    anonymousId: req.cookies?.anonymousId,
    page: {
      url: req.originalUrl,
      path: req.path,
      title: pageData.title,
      referrer: req.headers.referer,
      type: pageData.type || "other",
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
    geo: extractGeoInfo(req),
  });
};

/**
 * Track product view
 */
export const trackProductView = async (req, product, listContext = {}) => {
  return trackEvent({
    eventName: "product_viewed",
    eventCategory: "product",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    page: {
      url: req.originalUrl,
      type: "product",
    },
    product: {
      productId: product._id,
      sku: product.sku,
      name: product.en?.name || product.name,
      nameAr: product.ar?.name,
      category: product.category?._id || product.category,
      categoryName: product.category?.en?.name || product.categoryName,
      brand: product.brand?._id || product.brand,
      brandName: product.brand?.en?.name || product.brandName,
      price: product.finalPrice || product.price,
      originalPrice: product.price,
      discount: product.discount,
      position: listContext.position,
      listName: listContext.listName,
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
  });
};

/**
 * Track add to cart
 */
export const trackAddToCart = async (req, product, quantity, cartData = {}) => {
  return trackEvent({
    eventName: "product_added_to_cart",
    eventCategory: "cart",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    product: {
      productId: product._id,
      sku: product.sku,
      name: product.en?.name || product.name,
      price: product.finalPrice || product.price,
      quantity,
      category: product.category?._id || product.category,
      brand: product.brand?._id || product.brand,
    },
    cart: {
      cartId: cartData._id?.toString() || cartData.cartId,
      itemCount: cartData.items?.length || cartData.itemCount || 0,
      totalValue: cartData.totalAmount || cartData.totalValue || 0,
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
  });
};

/**
 * Track remove from cart
 */
export const trackRemoveFromCart = async (req, product, quantity, cartData = {}) => {
  return trackEvent({
    eventName: "product_removed_from_cart",
    eventCategory: "cart",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    product: {
      productId: product._id,
      sku: product.sku,
      name: product.en?.name || product.name,
      price: product.finalPrice || product.price,
      quantity,
    },
    cart: {
      cartId: cartData._id?.toString() || cartData.cartId,
      itemCount: cartData.items?.length || cartData.itemCount || 0,
      totalValue: cartData.totalAmount || cartData.totalValue || 0,
    },
    device: extractDeviceInfo(req),
  });
};

/**
 * Track checkout started
 */
export const trackCheckoutStarted = async (req, cart) => {
  return trackEvent({
    eventName: "checkout_started",
    eventCategory: "checkout",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    cart: {
      cartId: cart._id?.toString(),
      itemCount: cart.items?.length || 0,
      totalValue: cart.totalAmount || 0,
      items: cart.items?.map((item) => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        price: item.price,
      })),
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
  });
};

/**
 * Track order placed
 */
export const trackOrderPlaced = async (req, order) => {
  return trackEvent({
    eventName: "order_placed",
    eventCategory: "order",
    userId: req.user?.id || req.user?._id || order.user,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["session-id"],
    order: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      itemCount: order.items?.length || 0,
      paymentMethod: order.paymentMethod,
      shippingMethod: order.shippingMethod,
      shippingCity: order.shippingAddress?.city,
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
  });
};

/**
 * Track order status change
 */
export const trackOrderStatusChange = async (order, newStatus, req = null) => {
  const eventNames = {
    confirmed: "order_confirmed",
    cancelled: "order_cancelled",
    shipped: "order_shipped",
    delivered: "order_delivered",
    returned: "order_returned",
  };

  const eventName = eventNames[newStatus];
  if (!eventName) return null;

  return trackEvent({
    eventName,
    eventCategory: "order",
    userId: order.user,
    sessionId: req?.sessionId || `system_${Date.now()}`,
    order: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    },
    properties: {
      previousStatus: order.status,
      newStatus,
    },
  });
};

/**
 * Track search
 */
export const trackSearch = async (req, query, results) => {
  return trackEvent({
    eventName: "search_performed",
    eventCategory: "search",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    page: {
      url: req.originalUrl,
      type: "search",
    },
    search: {
      query,
      resultsCount: results.total || results.length || 0,
      hasResults: (results.total || results.length || 0) > 0,
      filters: results.appliedFilters || req.query,
      sortBy: results.sortBy || req.query.sort,
      page: results.page || parseInt(req.query.page) || 1,
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
  });
};

/**
 * Track user registration
 */
export const trackUserRegistration = async (req, user) => {
  return trackEvent({
    eventName: "user_registered",
    eventCategory: "user",
    userId: user._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    properties: {
      registrationMethod: req.body.method || "email",
    },
    attribution: extractAttribution(req),
    device: extractDeviceInfo(req),
    geo: extractGeoInfo(req),
  });
};

/**
 * Track user login
 */
export const trackUserLogin = async (req, user) => {
  return trackEvent({
    eventName: "user_logged_in",
    eventCategory: "user",
    userId: user._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    properties: {
      loginMethod: req.body.method || "phone",
    },
    device: extractDeviceInfo(req),
  });
};

/**
 * Track payment failure
 */
export const trackPaymentFailure = async (req, order, errorDetails) => {
  return trackEvent({
    eventName: "payment_failed",
    eventCategory: "error",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    order: {
      orderId: order?._id,
      totalAmount: order?.totalAmount,
      paymentMethod: order?.paymentMethod,
    },
    error: {
      code: errorDetails.code,
      message: errorDetails.message,
      context: errorDetails.context,
    },
    device: extractDeviceInfo(req),
  });
};

/**
 * Track coupon applied
 */
export const trackCouponApplied = async (req, couponCode, discountAmount, success) => {
  return trackEvent({
    eventName: success ? "coupon_applied" : "coupon_failed",
    eventCategory: "engagement",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    properties: {
      couponCode,
      discountAmount: success ? discountAmount : 0,
      failureReason: success ? null : discountAmount, // discountAmount contains error message if failed
    },
    device: extractDeviceInfo(req),
  });
};

/**
 * Track wishlist actions
 */
export const trackWishlistAction = async (req, product, action = "add") => {
  return trackEvent({
    eventName: action === "add" ? "product_added_to_wishlist" : "product_removed_from_wishlist",
    eventCategory: "wishlist",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    product: {
      productId: product._id,
      sku: product.sku,
      name: product.en?.name || product.name,
      price: product.finalPrice || product.price,
      category: product.category?._id || product.category,
    },
    device: extractDeviceInfo(req),
  });
};

/**
 * Track review submission
 */
export const trackReviewSubmitted = async (req, product, rating, hasText) => {
  return trackEvent({
    eventName: "review_submitted",
    eventCategory: "engagement",
    userId: req.user?.id || req.user?._id,
    sessionId: req.sessionId || req.cookies?.sessionId || req.headers["x-session-id"],
    product: {
      productId: product._id,
      name: product.en?.name || product.name,
    },
    properties: {
      rating,
      hasText,
    },
    device: extractDeviceInfo(req),
  });
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const extractAttribution = (req) => {
  const query = req.query || {};
  const cookies = req.cookies || {};

  return {
    source: query.utm_source || cookies.utm_source || "direct",
    medium: query.utm_medium || cookies.utm_medium || "none",
    campaign: query.utm_campaign || cookies.utm_campaign,
    term: query.utm_term,
    content: query.utm_content,
    referrer: req.headers.referer || req.headers.referrer,
    landingPage: cookies.landingPage || req.originalUrl,
  };
};

const extractDeviceInfo = (req) => {
  const ua = req.headers["user-agent"] || "";

  return {
    type: /mobile/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop",
    browser: extractBrowser(ua),
    os: extractOS(ua),
    language: req.headers["accept-language"]?.split(",")[0] || "en",
  };
};

const extractGeoInfo = (req) => {
  return {
    country: req.headers["cf-ipcountry"] || "SA",
    city: req.headers["cf-ipcity"],
    region: req.headers["cf-region"],
  };
};

const extractBrowser = (ua) => {
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/opera|opr/i.test(ua)) return "Opera";
  return "Other";
};

const extractOS = (ua) => {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "MacOS";
  if (/linux/i.test(ua) && !/android/i.test(ua)) return "Linux";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  return "Other";
};

// ============================================
// REALTIME DATA GETTERS
// ============================================

export const getRealtimeStats = async () => {
  const today = new Date().toISOString().split("T")[0];

  const [events, revenue, orders, topViewed, topCarted] = await Promise.all([
    redis.hgetall(`${REALTIME_PREFIX}events:${today}`),
    redis.get(`${REALTIME_PREFIX}revenue:${today}`),
    redis.hgetall(`${REALTIME_PREFIX}orders:${today}`),
    redis.zrevrange(`${REALTIME_PREFIX}products:viewed:${today}`, 0, 9, "WITHSCORES"),
    redis.zrevrange(`${REALTIME_PREFIX}products:carted:${today}`, 0, 9, "WITHSCORES"),
  ]);

  return {
    date: today,
    events: events || {},
    revenue: parseFloat(revenue) || 0,
    orders: {
      count: parseInt(orders?.count) || 0,
      items: parseInt(orders?.items) || 0,
    },
    topViewedProducts: parseRedisZset(topViewed),
    topCartedProducts: parseRedisZset(topCarted),
  };
};

const parseRedisZset = (arr) => {
  const result = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push({
      id: arr[i],
      count: parseInt(arr[i + 1]),
    });
  }
  return result;
};
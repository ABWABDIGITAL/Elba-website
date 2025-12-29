/**
 * Analytics SDK - Type-safe tracking functions
 *
 * This SDK provides type-safe functions for tracking user behavior,
 * conversion funnels, and business analytics events.
 *
 * Usage:
 *   <script src="/js/analytics.js"></script>
 *   <script>
 *     Analytics.trackProductView('SKU-123', 'Product Name', 'Category');
 *   </script>
 *
 * Or with ES modules:
 *   import * as Analytics from '/js/analytics.js';
 *   Analytics.trackProductView('SKU-123');
 */

const ANALYTICS_BASE_URL = '/analytics';

// ============================================
// INTERNAL - Do not call directly
// ============================================

async function _track(event, data) {
  try {
    const response = await fetch(`${ANALYTICS_BASE_URL}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data })
    });
    return response.json();
  } catch (error) {
    console.error(`Analytics tracking failed for ${event}:`, error);
    return { success: false, error };
  }
}

// ============================================
// PRODUCT TRACKING
// ============================================

/**
 * Track when a user views a product page
 * @param {string} productId - The product SKU/ID (required)
 * @param {string} [productName] - Optional product name
 * @param {string} [category] - Optional product category
 * @returns {Promise<{success: boolean}>}
 */
async function trackProductView(productId, productName = null, category = null) {
  if (!productId) throw new Error('productId is required');
  return _track('view_product', { productId, productName, category });
}

/**
 * Track when a user adds a product to their cart
 * @param {string} productId - The product SKU/ID (required)
 * @param {number} quantity - Quantity added (required)
 * @param {number} price - Unit price of the product (required)
 * @param {string} [productName] - Optional product name
 * @returns {Promise<{success: boolean}>}
 */
async function trackAddToCart(productId, quantity, price, productName = null) {
  if (!productId) throw new Error('productId is required');
  if (typeof quantity !== 'number' || quantity < 1) throw new Error('quantity must be a positive number');
  if (typeof price !== 'number' || price < 0) throw new Error('price must be a non-negative number');
  return _track('add_to_cart', { productId, quantity, price, productName });
}

/**
 * Track when a user removes a product from their cart
 * @param {string} productId - The product SKU/ID (required)
 * @param {number} [quantity] - Quantity removed (defaults to all)
 * @returns {Promise<{success: boolean}>}
 */
async function trackRemoveFromCart(productId, quantity = null) {
  if (!productId) throw new Error('productId is required');
  return _track('remove_from_cart', { productId, quantity });
}

/**
 * Track when a user views their cart
 * @param {number} [cartTotal] - Optional current cart total
 * @param {number} [itemCount] - Optional number of items in cart
 * @returns {Promise<{success: boolean}>}
 */
async function trackCartView(cartTotal = null, itemCount = null) {
  return _track('view_cart', { cartTotal, itemCount });
}

/**
 * Track when a user adds a product to their wishlist
 * @param {string} productId - The product SKU/ID (required)
 * @param {string} [productName] - Optional product name
 * @returns {Promise<{success: boolean}>}
 */
async function trackAddToWishlist(productId, productName = null) {
  if (!productId) throw new Error('productId is required');
  return _track('add_to_wishlist', { productId, productName });
}

// ============================================
// CHECKOUT TRACKING
// ============================================

/**
 * Track when a user starts the checkout process
 * @param {number} cartTotal - Total cart value (required)
 * @param {number} itemCount - Number of items in cart (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackCheckoutStart(cartTotal, itemCount) {
  if (typeof cartTotal !== 'number') throw new Error('cartTotal must be a number');
  if (typeof itemCount !== 'number') throw new Error('itemCount must be a number');
  return _track('checkout', { cartTotal, itemCount });
}

/**
 * Track when a user reaches the payment step
 * @param {string} paymentMethod - Payment method selected (required) - e.g., 'credit_card', 'paypal'
 * @param {number} amount - Payment amount (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackPaymentStart(paymentMethod, amount) {
  if (!paymentMethod) throw new Error('paymentMethod is required');
  if (typeof amount !== 'number') throw new Error('amount must be a number');
  return _track('payment', { paymentMethod, amount });
}

/**
 * Track a completed order
 * @param {string} orderId - Unique order ID (required)
 * @param {number} amount - Total order amount (required)
 * @param {Array<{id: string, quantity: number, price: number}>} products - Array of purchased products (required)
 * @param {string} [paymentMethod] - Optional payment method used
 * @param {string} [couponCode] - Optional coupon code used
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderComplete(orderId, amount, products, paymentMethod = null, couponCode = null) {
  if (!orderId) throw new Error('orderId is required');
  if (typeof amount !== 'number') throw new Error('amount must be a number');
  if (!Array.isArray(products)) throw new Error('products must be an array');
  return _track('order_complete', { orderId, amount, products, paymentMethod, couponCode });
}

/**
 * Track when an order is cancelled
 * @param {string} orderId - The cancelled order ID (required)
 * @param {string} [reason] - Optional cancellation reason
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderCancelled(orderId, reason = null) {
  if (!orderId) throw new Error('orderId is required');
  return _track('order_cancelled', { orderId, reason });
}

/**
 * Track cart abandonment (call when user leaves with items in cart)
 * @param {number} cartValue - Total value of abandoned cart (required)
 * @param {number} itemCount - Number of items in cart (required)
 * @param {Array<string>} [productIds] - Optional array of product IDs in cart
 * @returns {Promise<{success: boolean}>}
 */
async function trackCartAbandoned(cartValue, itemCount, productIds = null) {
  if (typeof cartValue !== 'number') throw new Error('cartValue must be a number');
  return _track('cart_abandoned', { cartValue, itemCount, productIds });
}

// ============================================
// USER TRACKING
// ============================================

/**
 * Track when a new user signs up (simple)
 * @param {string} userId - The new user's ID (required)
 * @param {string} [source] - Acquisition source - e.g., 'google', 'facebook', 'direct'
 * @param {string} [referralCode] - Optional referral code used
 * @returns {Promise<{success: boolean}>}
 */
async function trackUserSignup(userId, source = 'direct', referralCode = null) {
  if (!userId) throw new Error('userId is required');
  return _track('user_signup', { userId, source, referralCode });
}

/**
 * Track when a user logs in
 * @param {string} userId - The user's ID (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackUserLogin(userId) {
  if (!userId) throw new Error('userId is required');
  return _track('user_login', { userId });
}

/**
 * Track when a user logs out
 * @param {string} userId - The user's ID (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackUserLogout(userId) {
  if (!userId) throw new Error('userId is required');
  return _track('user_logout', { userId });
}

// ============================================
// SEARCH & NAVIGATION TRACKING
// ============================================

/**
 * Track a search query
 * @param {string} query - The search query (required)
 * @param {number} resultsCount - Number of results returned (required)
 * @param {string} [category] - Optional category filter applied
 * @returns {Promise<{success: boolean}>}
 */
async function trackSearch(query, resultsCount, category = null) {
  if (!query) throw new Error('query is required');
  if (typeof resultsCount !== 'number') throw new Error('resultsCount must be a number');
  return _track('search', { query, resultsCount, category });
}

/**
 * Track when a user applies filters
 * @param {Object} filters - The filters applied (required) - e.g., { category: 'electronics', priceRange: '100-500' }
 * @param {number} resultsCount - Number of results after filtering (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackFilterApplied(filters, resultsCount) {
  if (!filters || typeof filters !== 'object') throw new Error('filters must be an object');
  return _track('filter_applied', { filters, resultsCount });
}

// ============================================
// ENGAGEMENT TRACKING
// ============================================

/**
 * Track when a user shares content
 * @param {string} contentType - Type of content shared (required) - e.g., 'product', 'article'
 * @param {string} contentId - ID of the shared content (required)
 * @param {string} platform - Platform shared to (required) - e.g., 'facebook', 'twitter', 'email'
 * @returns {Promise<{success: boolean}>}
 */
async function trackShare(contentType, contentId, platform) {
  if (!contentType) throw new Error('contentType is required');
  if (!contentId) throw new Error('contentId is required');
  if (!platform) throw new Error('platform is required');
  return _track('share', { contentType, contentId, platform });
}

/**
 * Track when a user submits a review
 * @param {string} productId - The reviewed product ID (required)
 * @param {number} rating - Rating given 1-5 (required)
 * @param {boolean} [hasText] - Whether the review includes text
 * @returns {Promise<{success: boolean}>}
 */
async function trackReviewSubmitted(productId, rating, hasText = false) {
  if (!productId) throw new Error('productId is required');
  if (typeof rating !== 'number' || rating < 1 || rating > 5) throw new Error('rating must be 1-5');
  return _track('review_submitted', { productId, rating, hasText });
}

/**
 * Track a newsletter subscription
 * @param {string} email - Subscriber email (required)
 * @param {string} [source] - Where they subscribed from
 * @returns {Promise<{success: boolean}>}
 */
async function trackNewsletterSubscribe(email, source = 'website') {
  if (!email) throw new Error('email is required');
  return _track('newsletter_subscribe', { email, source });
}

// ============================================
// SIGNUP FLOW TRACKING (DETAILED)
// ============================================

/**
 * Track when user lands on signup/registration page
 * @param {string} [source] - Traffic source - e.g., 'google', 'facebook', 'email_campaign'
 * @param {string} [landingPage] - The landing page URL
 * @returns {Promise<{success: boolean}>}
 */
async function trackSignupPageView(source = 'direct', landingPage = null) {
  return _track('signup_page_view', { source, landingPage, timestamp: Date.now() });
}

/**
 * Track when user starts filling the signup form
 * @param {string} [formType] - Type of signup form - e.g., 'email', 'social', 'phone'
 * @returns {Promise<{success: boolean}>}
 */
async function trackSignupFormStart(formType = 'email') {
  return _track('signup_form_start', { formType, timestamp: Date.now() });
}

/**
 * Track signup form field completion (for drop-off analysis)
 * @param {string} fieldName - Name of the field completed (required) - e.g., 'email', 'password', 'name'
 * @param {number} stepNumber - Step number in the form 1, 2, 3... (required)
 * @param {number} totalSteps - Total number of steps in the form (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackSignupFieldComplete(fieldName, stepNumber, totalSteps) {
  if (!fieldName) throw new Error('fieldName is required');
  if (typeof stepNumber !== 'number') throw new Error('stepNumber must be a number');
  return _track('signup_field_complete', { fieldName, stepNumber, totalSteps, timestamp: Date.now() });
}

/**
 * Track when user submits signup form (before verification)
 * @param {string} [method] - Signup method - e.g., 'email', 'google', 'facebook', 'apple'
 * @returns {Promise<{success: boolean}>}
 */
async function trackSignupFormSubmit(method = 'email') {
  return _track('signup_form_submit', { method, timestamp: Date.now() });
}

/**
 * Track email/phone verification sent
 * @param {string} [verificationType] - Type of verification - 'email', 'sms', 'phone'
 * @returns {Promise<{success: boolean}>}
 */
async function trackVerificationSent(verificationType = 'email') {
  return _track('verification_sent', { verificationType, timestamp: Date.now() });
}

/**
 * Track successful verification
 * @param {string} [verificationType] - Type of verification - 'email', 'sms', 'phone'
 * @param {number} [timeToVerifyMs] - Time taken to verify in milliseconds
 * @returns {Promise<{success: boolean}>}
 */
async function trackVerificationComplete(verificationType = 'email', timeToVerifyMs = null) {
  return _track('verification_complete', { verificationType, timeToVerifyMs, timestamp: Date.now() });
}

/**
 * Track signup completion (account created)
 * @param {string} userId - The new user's ID (required)
 * @param {string} method - Signup method used (required)
 * @param {string} [source] - Acquisition source
 * @param {number} [totalTimeMs] - Total time from page view to completion
 * @returns {Promise<{success: boolean}>}
 */
async function trackSignupComplete(userId, method, source = 'direct', totalTimeMs = null) {
  if (!userId) throw new Error('userId is required');
  return _track('signup_complete', { userId, method, source, totalTimeMs, timestamp: Date.now() });
}

/**
 * Track signup drop-off/abandonment
 * @param {string} dropOffStep - Step where user dropped off (required) - e.g., 'form_start', 'email_field', 'verification'
 * @param {string} [reason] - Reason if known - e.g., 'validation_error', 'timeout', 'closed_page'
 * @param {Object} [formData] - Partial form data (non-sensitive fields only)
 * @returns {Promise<{success: boolean}>}
 */
async function trackSignupDropOff(dropOffStep, reason = null, formData = null) {
  if (!dropOffStep) throw new Error('dropOffStep is required');
  return _track('signup_drop_off', { dropOffStep, reason, formData, timestamp: Date.now() });
}

/**
 * Track first action after signup (onboarding completion indicator)
 * @param {string} userId - User ID (required)
 * @param {string} actionType - Type of first action (required) - e.g., 'profile_complete', 'first_purchase', 'browse_products'
 * @returns {Promise<{success: boolean}>}
 */
async function trackFirstActionAfterSignup(userId, actionType) {
  if (!userId) throw new Error('userId is required');
  if (!actionType) throw new Error('actionType is required');
  return _track('first_action_after_signup', { userId, actionType, timestamp: Date.now() });
}

// ============================================
// ORDER FLOW TRACKING (WITH TIMING)
// ============================================

/**
 * Track order flow start (user begins shopping session)
 * @param {string} [sessionId] - Optional session identifier
 * @param {string} [entryPoint] - Where user entered - e.g., 'homepage', 'product_page', 'search'
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderFlowStart(sessionId = null, entryPoint = 'homepage') {
  const flowId = sessionId || `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('orderFlowId', flowId);
    sessionStorage.setItem('orderFlowStart', Date.now().toString());
  }
  return _track('order_flow_start', { flowId, entryPoint, timestamp: Date.now() });
}

/**
 * Track product browsing in order flow
 * @param {string} productId - Product being viewed (required)
 * @param {number} [timeOnPageMs] - Time spent on previous page
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderFlowProductView(productId, timeOnPageMs = null) {
  if (!productId) throw new Error('productId is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  return _track('order_flow_product_view', { flowId, productId, timeOnPageMs, timestamp: Date.now() });
}

/**
 * Track add to cart in order flow (with timing)
 * @param {string} productId - Product added (required)
 * @param {number} quantity - Quantity added (required)
 * @param {number} price - Unit price (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderFlowAddToCart(productId, quantity, price) {
  if (!productId) throw new Error('productId is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const timeInFlowMs = flowStart ? Date.now() - flowStart : null;
  return _track('order_flow_add_to_cart', { flowId, productId, quantity, price, timeInFlowMs, timestamp: Date.now() });
}

/**
 * Track cart view in order flow
 * @param {number} cartTotal - Current cart total (required)
 * @param {number} itemCount - Number of items (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderFlowCartView(cartTotal, itemCount) {
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const timeInFlowMs = flowStart ? Date.now() - flowStart : null;
  return _track('order_flow_cart_view', { flowId, cartTotal, itemCount, timeInFlowMs, timestamp: Date.now() });
}

/**
 * Track checkout step in order flow
 * @param {number} stepNumber - Checkout step (required) - 1=shipping, 2=payment, 3=review, etc.
 * @param {string} stepName - Step name (required) - e.g., 'shipping_address', 'payment_method', 'order_review'
 * @param {number} [timeOnPreviousStepMs] - Time spent on previous step
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderFlowCheckoutStep(stepNumber, stepName, timeOnPreviousStepMs = null) {
  if (typeof stepNumber !== 'number') throw new Error('stepNumber must be a number');
  if (!stepName) throw new Error('stepName is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const timeInFlowMs = flowStart ? Date.now() - flowStart : null;
  return _track('order_flow_checkout_step', { flowId, stepNumber, stepName, timeOnPreviousStepMs, timeInFlowMs, timestamp: Date.now() });
}

/**
 * Track order flow completion with full timing data
 * @param {string} orderId - The order ID (required)
 * @param {number} amount - Order total (required)
 * @param {Array} products - Products purchased (required)
 * @param {string} [paymentMethod] - Payment method used
 * @returns {Promise<{success: boolean}>}
 */
async function trackOrderFlowComplete(orderId, amount, products, paymentMethod = null) {
  if (!orderId) throw new Error('orderId is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const totalFlowTimeMs = flowStart ? Date.now() - flowStart : null;

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('orderFlowId');
    sessionStorage.removeItem('orderFlowStart');
  }

  return _track('order_flow_complete', {
    flowId,
    orderId,
    amount,
    products,
    paymentMethod,
    totalFlowTimeMs,
    timestamp: Date.now()
  });
}

// ============================================
// DROP-OFF / ABANDONMENT TRACKING
// ============================================

/**
 * Track when user drops off during product browsing
 * @param {string} lastProductViewed - Last product ID viewed (required)
 * @param {number} productsViewed - Total products viewed in session (required)
 * @param {number} [timeOnSiteMs] - Total time on site
 * @returns {Promise<{success: boolean}>}
 */
async function trackBrowsingDropOff(lastProductViewed, productsViewed, timeOnSiteMs = null) {
  return _track('browsing_drop_off', { lastProductViewed, productsViewed, timeOnSiteMs, timestamp: Date.now() });
}

/**
 * Track cart abandonment with detailed info
 * @param {number} cartValue - Total cart value (required)
 * @param {Array<{id: string, name: string, price: number, quantity: number}>} items - Items in cart (required)
 * @param {string} lastAction - Last action before abandonment (required) - e.g., 'viewed_cart', 'started_checkout'
 * @param {number} [timeInCartMs] - Time since first item added to cart
 * @returns {Promise<{success: boolean}>}
 */
async function trackCartDropOff(cartValue, items, lastAction, timeInCartMs = null) {
  if (typeof cartValue !== 'number') throw new Error('cartValue must be a number');
  if (!Array.isArray(items)) throw new Error('items must be an array');
  return _track('cart_drop_off', { cartValue, items, lastAction, timeInCartMs, timestamp: Date.now() });
}

/**
 * Track checkout abandonment at specific step
 * @param {number} stepNumber - Step where user dropped off (required)
 * @param {string} stepName - Name of the step (required) - e.g., 'shipping', 'payment', 'review'
 * @param {number} cartValue - Cart value at abandonment (required)
 * @param {string} [reason] - Reason if detectable - e.g., 'payment_failed', 'shipping_too_high', 'closed_page'
 * @param {Object} [partialData] - Any partial data entered (non-sensitive)
 * @returns {Promise<{success: boolean}>}
 */
async function trackCheckoutDropOff(stepNumber, stepName, cartValue, reason = null, partialData = null) {
  if (typeof stepNumber !== 'number') throw new Error('stepNumber must be a number');
  if (!stepName) throw new Error('stepName is required');
  return _track('checkout_drop_off', { stepNumber, stepName, cartValue, reason, partialData, timestamp: Date.now() });
}

/**
 * Track payment failure
 * @param {string} paymentMethod - Payment method attempted (required)
 * @param {string} errorCode - Error code from payment processor (required)
 * @param {string} [errorMessage] - Human readable error message
 * @param {number} amount - Amount attempted (required)
 * @returns {Promise<{success: boolean}>}
 */
async function trackPaymentDropOff(paymentMethod, errorCode, errorMessage = null, amount) {
  if (!paymentMethod) throw new Error('paymentMethod is required');
  if (!errorCode) throw new Error('errorCode is required');
  return _track('payment_drop_off', { paymentMethod, errorCode, errorMessage, amount, timestamp: Date.now() });
}

/**
 * Track form validation errors (causes of drop-off)
 * @param {string} formName - Name of the form (required) - e.g., 'signup', 'checkout_shipping', 'payment'
 * @param {string} fieldName - Field with error (required)
 * @param {string} errorType - Type of error (required) - e.g., 'required', 'invalid_format', 'too_short'
 * @param {number} [attemptNumber] - Which attempt this is (1st, 2nd, etc.)
 * @returns {Promise<{success: boolean}>}
 */
async function trackFormValidationError(formName, fieldName, errorType, attemptNumber = 1) {
  if (!formName) throw new Error('formName is required');
  if (!fieldName) throw new Error('fieldName is required');
  if (!errorType) throw new Error('errorType is required');
  return _track('form_validation_error', { formName, fieldName, errorType, attemptNumber, timestamp: Date.now() });
}

/**
 * Track page exit intent (mouse leaving viewport, back button, etc.)
 * @param {string} pageName - Current page name (required)
 * @param {string} exitType - Type of exit intent (required) - 'mouse_leave', 'back_button', 'close_tab', 'navigate_away'
 * @param {number} timeOnPageMs - Time spent on page (required)
 * @param {Object} [pageState] - Current page state - e.g., { cartItems: 2, formProgress: 50 }
 * @returns {Promise<{success: boolean}>}
 */
async function trackExitIntent(pageName, exitType, timeOnPageMs, pageState = null) {
  if (!pageName) throw new Error('pageName is required');
  if (!exitType) throw new Error('exitType is required');
  return _track('exit_intent', { pageName, exitType, timeOnPageMs, pageState, timestamp: Date.now() });
}

// ============================================
// SESSION TIMING HELPERS
// ============================================

/**
 * Start timing a user action (stores timestamp in sessionStorage)
 * @param {string} actionName - Name of the action being timed (required)
 */
function startTiming(actionName) {
  if (!actionName) throw new Error('actionName is required');
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(`timing_${actionName}`, Date.now().toString());
  }
}

/**
 * End timing and get duration
 * @param {string} actionName - Name of the action being timed (required)
 * @returns {number|null} Duration in milliseconds, or null if not started
 */
function endTiming(actionName) {
  if (!actionName) throw new Error('actionName is required');
  if (typeof sessionStorage !== 'undefined') {
    const startTime = sessionStorage.getItem(`timing_${actionName}`);
    if (startTime) {
      const duration = Date.now() - parseInt(startTime);
      sessionStorage.removeItem(`timing_${actionName}`);
      return duration;
    }
  }
  return null;
}

/**
 * Track timed action (automatically calculates duration if startTiming was called)
 * @param {string} actionName - Name of the action (required)
 * @param {Object} [additionalData] - Additional data to track
 * @returns {Promise<{success: boolean}>}
 */
async function trackTimedAction(actionName, additionalData = {}) {
  if (!actionName) throw new Error('actionName is required');
  const duration = endTiming(actionName);
  return _track('timed_action', { actionName, durationMs: duration, ...additionalData, timestamp: Date.now() });
}

// ============================================
// CUSTOM EVENT TRACKING
// ============================================

/**
 * Track a custom event (use sparingly - prefer specific functions above)
 * @param {string} eventName - Custom event name (required)
 * @param {Object} [eventData] - Event data
 * @returns {Promise<{success: boolean}>}
 */
async function trackCustomEvent(eventName, eventData = {}) {
  if (!eventName) throw new Error('eventName is required');
  return _track(eventName, eventData);
}

// ============================================
// ANALYTICS DATA FETCHING
// ============================================

/**
 * Get real-time visitor statistics
 * @returns {Promise<{activeVisitors: number, currentPages: Array, lastMinuteRequests: number}>}
 */
async function getRealtimeStats() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/realtime`);
  return response.json();
}

/**
 * Get business/revenue metrics
 * @returns {Promise<Object>} Business metrics including revenue, orders, carts
 */
async function getBusinessMetrics() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/business/json`);
  return response.json();
}

/**
 * Get user analytics
 * @returns {Promise<Object>} User metrics including visitors, sessions, engagement
 */
async function getUserAnalytics() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/users/json`);
  return response.json();
}

/**
 * Get conversion funnel data
 * @returns {Promise<Object>} Funnel data with step-by-step conversion rates
 */
async function getFunnelData() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/funnels/json`);
  return response.json();
}

/**
 * Get customer segments
 * @returns {Promise<Object>} Segment data (behavioral, value, engagement)
 */
async function getSegments() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/segments/json`);
  return response.json();
}

/**
 * Get RFM analysis data
 * @returns {Promise<Object>} RFM scores and segment breakdown
 */
async function getRFMAnalysis() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/rfm/json`);
  return response.json();
}

/**
 * Get customer lifetime value data
 * @returns {Promise<Object>} LTV metrics and top customers
 */
async function getLTVData() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/ltv/json`);
  return response.json();
}

/**
 * Get predictive analytics
 * @returns {Promise<Object>} Trends, forecasts, and churn risk
 */
async function getPredictions() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/predictions/json`);
  return response.json();
}

/**
 * Get AI-generated insights
 * @returns {Promise<Object>} Alerts, opportunities, recommendations
 */
async function getInsights() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/insights/json`);
  return response.json();
}

/**
 * Get historical analytics data
 * @param {number} [days=30] - Number of days of historical data
 * @returns {Promise<Object>} Daily historical data and summary
 */
async function getHistoricalData(days = 30) {
  const response = await fetch(`${ANALYTICS_BASE_URL}/historical?range=${days}`);
  return response.json();
}

/**
 * Set a business goal
 * @param {string} type - Goal type (required) - 'revenue', 'orders', 'conversion', 'newCustomers', or custom
 * @param {number} target - Target value (required)
 * @param {string} [period='monthly'] - Goal period - 'daily', 'weekly', 'monthly', 'yearly'
 * @returns {Promise<Object>} Updated goals
 */
async function setGoal(type, target, period = 'monthly') {
  if (!type) throw new Error('type is required');
  if (typeof target !== 'number') throw new Error('target must be a number');
  const response = await fetch(`${ANALYTICS_BASE_URL}/goal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, target, period })
  });
  return response.json();
}

// ============================================
// EXPORT FOR GLOBAL AND MODULE USE
// ============================================

// Create global Analytics object for script tag usage
const Analytics = {
  // Product Tracking
  trackProductView,
  trackAddToCart,
  trackRemoveFromCart,
  trackCartView,
  trackAddToWishlist,

  // Checkout Tracking
  trackCheckoutStart,
  trackPaymentStart,
  trackOrderComplete,
  trackOrderCancelled,
  trackCartAbandoned,

  // User Tracking
  trackUserSignup,
  trackUserLogin,
  trackUserLogout,

  // Search & Navigation
  trackSearch,
  trackFilterApplied,

  // Engagement
  trackShare,
  trackReviewSubmitted,
  trackNewsletterSubscribe,

  // Signup Flow (Detailed)
  trackSignupPageView,
  trackSignupFormStart,
  trackSignupFieldComplete,
  trackSignupFormSubmit,
  trackVerificationSent,
  trackVerificationComplete,
  trackSignupComplete,
  trackSignupDropOff,
  trackFirstActionAfterSignup,

  // Order Flow (with Timing)
  trackOrderFlowStart,
  trackOrderFlowProductView,
  trackOrderFlowAddToCart,
  trackOrderFlowCartView,
  trackOrderFlowCheckoutStep,
  trackOrderFlowComplete,

  // Drop-off Tracking
  trackBrowsingDropOff,
  trackCartDropOff,
  trackCheckoutDropOff,
  trackPaymentDropOff,
  trackFormValidationError,
  trackExitIntent,

  // Timing Helpers
  startTiming,
  endTiming,
  trackTimedAction,

  // Custom Events
  trackCustomEvent,

  // Data Fetching
  getRealtimeStats,
  getBusinessMetrics,
  getUserAnalytics,
  getFunnelData,
  getSegments,
  getRFMAnalysis,
  getLTVData,
  getPredictions,
  getInsights,
  getHistoricalData,
  setGoal
};

// Make available globally
if (typeof window !== 'undefined') {
  window.Analytics = Analytics;
}

// Export for ES modules
export {
  // Product Tracking
  trackProductView,
  trackAddToCart,
  trackRemoveFromCart,
  trackCartView,
  trackAddToWishlist,

  // Checkout Tracking
  trackCheckoutStart,
  trackPaymentStart,
  trackOrderComplete,
  trackOrderCancelled,
  trackCartAbandoned,

  // User Tracking
  trackUserSignup,
  trackUserLogin,
  trackUserLogout,

  // Search & Navigation
  trackSearch,
  trackFilterApplied,

  // Engagement
  trackShare,
  trackReviewSubmitted,
  trackNewsletterSubscribe,

  // Signup Flow (Detailed)
  trackSignupPageView,
  trackSignupFormStart,
  trackSignupFieldComplete,
  trackSignupFormSubmit,
  trackVerificationSent,
  trackVerificationComplete,
  trackSignupComplete,
  trackSignupDropOff,
  trackFirstActionAfterSignup,

  // Order Flow (with Timing)
  trackOrderFlowStart,
  trackOrderFlowProductView,
  trackOrderFlowAddToCart,
  trackOrderFlowCartView,
  trackOrderFlowCheckoutStep,
  trackOrderFlowComplete,

  // Drop-off Tracking
  trackBrowsingDropOff,
  trackCartDropOff,
  trackCheckoutDropOff,
  trackPaymentDropOff,
  trackFormValidationError,
  trackExitIntent,

  // Timing Helpers
  startTiming,
  endTiming,
  trackTimedAction,

  // Custom Events
  trackCustomEvent,

  // Data Fetching
  getRealtimeStats,
  getBusinessMetrics,
  getUserAnalytics,
  getFunnelData,
  getSegments,
  getRFMAnalysis,
  getLTVData,
  getPredictions,
  getInsights,
  getHistoricalData,
  setGoal
};

export default Analytics;

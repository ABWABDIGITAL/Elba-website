# Business Analytics API Documentation

This document describes all API endpoints available for the frontend to interact with the analytics system.

## Base Path

All endpoints are prefixed with `/analytics` (configurable via `basePath` option).

---

## Dashboard Endpoints (HTML)

These endpoints return visual HTML dashboards:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/dashboard` | GET | Main analytics dashboard |
| `/analytics/executive` | GET | Executive summary dashboard |
| `/analytics/users` | GET | User analytics dashboard |
| `/analytics/business` | GET | Revenue/business metrics dashboard |
| `/analytics/funnels` | GET | Conversion funnels dashboard |
| `/analytics/segments` | GET | Customer segments dashboard |
| `/analytics/cohorts` | GET | Cohort analysis dashboard |
| `/analytics/rfm` | GET | RFM (Recency, Frequency, Monetary) dashboard |
| `/analytics/ltv` | GET | Customer Lifetime Value dashboard |
| `/analytics/predictions` | GET | Predictive analytics dashboard |
| `/analytics/insights` | GET | AI-powered insights dashboard |

---

## JSON API Endpoints

### 1. User Analytics

**GET** `/analytics/users/json`

Returns user and visitor analytics data.

**Response:**
```json
{
  "totalVisitors": 1250,
  "totalSessions": 3420,
  "newUsers": 450,
  "returningUsers": 800,
  "activeUsers": {
    "daily": 120,
    "weekly": 580,
    "monthly": 1100
  },
  "engagement": {
    "avgSessionDuration": 185000,
    "avgPagesPerSession": 4.2,
    "bounceRate": 42.5
  },
  "devices": {
    "types": {
      "desktop": 650,
      "mobile": 480,
      "tablet": 120
    },
    "browsers": {
      "Chrome": 580,
      "Safari": 320,
      "Firefox": 180,
      "Edge": 120,
      "Opera": 50
    },
    "os": {
      "Windows": 420,
      "macOS": 380,
      "iOS": 250,
      "Android": 180,
      "Linux": 20
    }
  },
  "geographic": {
    "countries": {},
    "cities": {},
    "languages": {
      "en": 850,
      "es": 200,
      "fr": 120
    }
  }
}
```

---

### 2. Business/Revenue Analytics

**GET** `/analytics/business/json`

Returns business and revenue metrics.

**Response:**
```json
{
  "revenue": {
    "total": 125000.50,
    "today": 4500.00,
    "byDay": {
      "2024-01-15": 4200.00,
      "2024-01-14": 3800.00
    }
  },
  "orders": {
    "total": 850,
    "today": 32,
    "completed": 780,
    "cancelled": 45,
    "pending": 25
  },
  "carts": {
    "created": 1200,
    "abandoned": 520,
    "converted": 680
  },
  "averageOrderValue": 160.26,
  "conversionRate": 56.67,
  "abandonmentRate": 43.33,
  "topProducts": {
    "byViews": [
      ["product-123", 450],
      ["product-456", 320]
    ],
    "byAddToCart": [
      ["product-123", 180],
      ["product-789", 150]
    ],
    "byPurchases": [
      ["product-123", 95],
      ["product-456", 72]
    ]
  }
}
```

---

### 3. Page Analytics

**GET** `/analytics/pages`

Returns page view analytics.

**Response:**
```json
{
  "totalPageViews": 15420,
  "topPages": [
    ["/products", 3200],
    ["/", 2800],
    ["/cart", 1500]
  ],
  "byHour": [120, 85, 45, 30, 25, 40, 180, 350, 520, 680, 720, 750, 780, 720, 680, 620, 580, 520, 450, 380, 320, 280, 220, 180],
  "byDay": {
    "2024-01-15": 1250,
    "2024-01-14": 1180
  },
  "entryPages": [
    ["/", 850],
    ["/products", 420]
  ],
  "exitPages": [
    ["/checkout/complete", 320],
    ["/cart", 180]
  ]
}
```

---

### 4. Conversion Funnels

**GET** `/analytics/funnels/json`

Returns conversion funnel data.

**Response:**
```json
{
  "checkout": {
    "name": "Checkout Funnel",
    "steps": ["view_product", "add_to_cart", "view_cart", "checkout", "payment", "order_complete"],
    "data": {
      "2024-01-15": {
        "view_product": 500,
        "add_to_cart": 180,
        "view_cart": 150,
        "checkout": 120,
        "payment": 95,
        "order_complete": 85
      }
    }
  },
  "signup": {
    "name": "Signup Funnel",
    "steps": ["landing", "signup_start", "signup_complete", "first_action"],
    "data": {}
  }
}
```

---

### 5. Custom Events

**GET** `/analytics/events`

Returns tracked events data.

**Response:**
```json
{
  "recentEvents": [
    {
      "name": "add_to_cart",
      "data": { "productId": "SKU-123", "quantity": 2 },
      "timestamp": "2024-01-15T14:30:00.000Z",
      "sessionId": "abc123"
    }
  ],
  "eventCounts": {
    "view_product": 1250,
    "add_to_cart": 420,
    "order_complete": 85
  }
}
```

---

### 6. Track Custom Event

**POST** `/analytics/track`

Track a custom event from the frontend.

**Request Body:**
```json
{
  "event": "add_to_cart",
  "data": {
    "productId": "SKU-123",
    "productName": "Sample Product",
    "price": 29.99,
    "quantity": 1
  },
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true
}
```

#### Supported Event Names:

| Event Name | Description | Data Fields |
|------------|-------------|-------------|
| `view_product` | User viewed a product | `productId` |
| `add_to_cart` | Item added to cart | `productId`, `quantity`, `price` |
| `remove_from_cart` | Item removed from cart | `productId` |
| `view_cart` | User viewed cart | - |
| `checkout` | User started checkout | - |
| `payment` | User reached payment | `paymentMethod` |
| `order_complete` | Order completed | `amount`, `orderId`, `products[]` |
| `order_cancelled` | Order cancelled | `orderId`, `reason` |
| `cart_abandoned` | Cart was abandoned | `cartValue` |
| `user_signup` | New user registered | `userId`, `source` |
| `user_login` | User logged in | `userId` |

---

### 7. Real-time Stats

**GET** `/analytics/realtime`

Returns real-time visitor statistics.

**Response:**
```json
{
  "activeVisitors": 45,
  "currentPages": [
    ["/products", 12],
    ["/", 8],
    ["/cart", 5]
  ],
  "lastMinuteRequests": 156
}
```

---

### 8. Customer Segments

**GET** `/analytics/segments/json`

Returns customer segmentation data.

**Response:**
```json
{
  "behavioral": {
    "browsers": 250,
    "wishlisters": 80,
    "cartAbandoners": 120,
    "oneTimeBuyers": 180,
    "repeatBuyers": 95,
    "loyalists": 45,
    "inactive": 60
  },
  "value": {
    "vip": 25,
    "highValue": 85,
    "mediumValue": 180,
    "lowValue": 260
  },
  "engagement": {
    "superActive": 30,
    "active": 120,
    "casual": 250,
    "dormant": 150
  }
}
```

---

### 9. Cohort Analysis

**GET** `/analytics/cohorts/json`

Returns cohort analysis data.

**Response:**
```json
{
  "byMonth": {
    "2024-01": {
      "users": ["user1", "user2"],
      "retention": {
        "month1": "85.0",
        "month2": "72.0",
        "month3": "65.0"
      },
      "revenue": 12500
    }
  },
  "byWeek": {
    "2024-W03": {
      "users": ["user1"],
      "retention": {},
      "revenue": 2500
    }
  },
  "bySource": {
    "google": {
      "users": ["user1", "user2"],
      "revenue": 8500,
      "conversions": 45
    }
  },
  "overallRetention": {
    "day1": 82.5,
    "day7": 65.2,
    "day14": 55.8,
    "day30": 42.3,
    "day60": 35.1,
    "day90": 28.7
  }
}
```

---

### 10. RFM Analysis

**GET** `/analytics/rfm/json`

Returns RFM (Recency, Frequency, Monetary) scoring data.

**Response:**
```json
{
  "lastUpdated": "2024-01-15T14:30:00.000Z",
  "totalScored": 550,
  "segments": {
    "champions": 25,
    "loyalCustomers": 45,
    "potentialLoyalist": 80,
    "newCustomers": 120,
    "promising": 65,
    "needsAttention": 40,
    "aboutToSleep": 35,
    "atRisk": 50,
    "cantLoseThem": 15,
    "hibernating": 45,
    "lost": 30
  },
  "segmentDetails": {
    "champions": {
      "count": 25,
      "description": "Best customers - high recency, frequency, and monetary"
    },
    "atRisk": {
      "count": 50,
      "description": "Spent big, now inactive - WIN BACK"
    }
  },
  "topScores": [
    {
      "customerId": "cust-123",
      "recency": 5,
      "frequency": 5,
      "monetary": 5,
      "score": "555",
      "segment": "champions",
      "totalSpent": 2500,
      "orderCount": 15,
      "daysSinceLastPurchase": 3
    }
  ]
}
```

---

### 11. Customer Lifetime Value (LTV)

**GET** `/analytics/ltv/json`

Returns customer lifetime value analysis.

**Response:**
```json
{
  "summary": {
    "averageLTV": 285.50,
    "totalCustomers": 550,
    "segments": {
      "high": 55,
      "medium": 165,
      "low": 280,
      "churned": 50
    }
  },
  "topCustomers": [
    {
      "customerId": "cust-123",
      "totalSpent": 3500.00,
      "predictedLTV": 5200.00,
      "orderCount": 18,
      "healthScore": 92.5,
      "daysSinceLastPurchase": 5
    }
  ],
  "distribution": {
    "high": 55,
    "medium": 220,
    "low": 275
  }
}
```

---

### 12. Predictive Analytics

**GET** `/analytics/predictions/json`

Returns predictive analytics and trend data.

**Response:**
```json
{
  "trends": {
    "revenue": {
      "direction": "up",
      "change": "12.5",
      "current": 4500,
      "previous": 4000
    },
    "orders": {
      "direction": "stable",
      "change": "2.1",
      "current": 32,
      "previous": 31
    },
    "traffic": {
      "direction": "up",
      "change": "8.3",
      "current": 1250,
      "previous": 1154
    }
  },
  "revenueForecasts": [
    {
      "date": "2024-01-16",
      "predicted": "4650.00",
      "confidence": 85
    },
    {
      "date": "2024-01-17",
      "predicted": "4720.00",
      "confidence": 80
    }
  ],
  "seasonality": {
    "patterns": [],
    "peakDays": ["Saturday", "Sunday", "Friday"],
    "peakHours": [10, 14, 19]
  },
  "churnRisk": [
    {
      "customerId": "cust-456",
      "probability": 0.85,
      "factors": ["no_purchase_60_days", "declining_visits"]
    }
  ]
}
```

---

### 13. Actionable Insights

**GET** `/analytics/insights/json`

Returns AI-generated insights and recommendations.

**Response:**
```json
{
  "alerts": [
    {
      "type": "critical",
      "category": "conversion",
      "title": "High Cart Abandonment Rate",
      "message": "Cart abandonment is at 75.2%. Consider implementing exit-intent popups or email recovery campaigns.",
      "metric": 75.2,
      "threshold": 70
    }
  ],
  "opportunities": [
    {
      "type": "growth",
      "title": "Revenue Growing",
      "message": "Revenue is up 12.5% vs last week. Consider increasing ad spend to capitalize on momentum.",
      "impact": "high"
    }
  ],
  "recommendations": [
    {
      "category": "timing",
      "title": "Optimal Posting Times",
      "message": "Peak traffic hours are 10:00, 14:00, 19:00. Schedule promotions around these times."
    }
  ],
  "anomalies": [
    {
      "type": "traffic_spike",
      "title": "Unusual Traffic Spike",
      "message": "Today's traffic is 85% higher than average. Check for viral content or bot traffic.",
      "severity": "medium"
    }
  ],
  "lastGenerated": "2024-01-15T14:30:00.000Z"
}
```

---

### 14. Set/Track Goals

**POST** `/analytics/goal`

Set or update business goals.

**Request Body:**
```json
{
  "type": "revenue",
  "target": 50000,
  "period": "monthly"
}
```

**Supported Goal Types:**
- `revenue` - Revenue target
- `orders` - Order count target
- `conversion` - Conversion rate target
- `newCustomers` - New customer acquisition target
- Custom types are stored in `goals.custom[]`

**Response:**
```json
{
  "success": true,
  "goals": {
    "revenue": { "target": 50000, "current": 12500, "period": "monthly" },
    "orders": { "target": 0, "current": 0, "period": "monthly" },
    "conversion": { "target": 0, "current": 0, "period": "monthly" },
    "newCustomers": { "target": 0, "current": 0, "period": "monthly" },
    "custom": []
  }
}
```

---

### 15. Historical Data

**GET** `/analytics/historical?range=30`

Returns historical analytics data.

**Query Parameters:**
- `range` (optional): Number of days of historical data (default: 30)

**Response:**
```json
{
  "daily": [
    {
      "date": "2024-01-15",
      "revenue": 4500,
      "orders": 32,
      "visitors": 1250,
      "sessions": 1580,
      "pageViews": 4200,
      "conversion": 5.2,
      "avgOrderValue": 140.63,
      "bounceRate": 42.5
    }
  ],
  "summary": {
    "totalDays": 30,
    "totalRevenue": 125000,
    "totalOrders": 850,
    "avgDailyRevenue": 4166.67
  }
}
```

---

## Frontend Integration - Analytics SDK

Copy this SDK to your frontend to get type-safe analytics tracking functions.

### Analytics SDK (analytics.js)

```javascript
/**
 * Analytics SDK - Type-safe tracking functions
 * Copy this file to your frontend: /src/utils/analytics.js
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
 * @param {string} productId - The product SKU/ID
 * @param {string} [productName] - Optional product name
 * @param {string} [category] - Optional product category
 */
export async function trackProductView(productId, productName = null, category = null) {
  if (!productId) throw new Error('productId is required');
  return _track('view_product', { productId, productName, category });
}

/**
 * Track when a user adds a product to their cart
 * @param {string} productId - The product SKU/ID
 * @param {number} quantity - Quantity added
 * @param {number} price - Unit price of the product
 * @param {string} [productName] - Optional product name
 */
export async function trackAddToCart(productId, quantity, price, productName = null) {
  if (!productId) throw new Error('productId is required');
  if (typeof quantity !== 'number' || quantity < 1) throw new Error('quantity must be a positive number');
  if (typeof price !== 'number' || price < 0) throw new Error('price must be a non-negative number');
  return _track('add_to_cart', { productId, quantity, price, productName });
}

/**
 * Track when a user removes a product from their cart
 * @param {string} productId - The product SKU/ID
 * @param {number} [quantity] - Quantity removed (defaults to all)
 */
export async function trackRemoveFromCart(productId, quantity = null) {
  if (!productId) throw new Error('productId is required');
  return _track('remove_from_cart', { productId, quantity });
}

/**
 * Track when a user views their cart
 * @param {number} [cartTotal] - Optional current cart total
 * @param {number} [itemCount] - Optional number of items in cart
 */
export async function trackCartView(cartTotal = null, itemCount = null) {
  return _track('view_cart', { cartTotal, itemCount });
}

/**
 * Track when a user adds a product to their wishlist
 * @param {string} productId - The product SKU/ID
 * @param {string} [productName] - Optional product name
 */
export async function trackAddToWishlist(productId, productName = null) {
  if (!productId) throw new Error('productId is required');
  return _track('add_to_wishlist', { productId, productName });
}

// ============================================
// CHECKOUT TRACKING
// ============================================

/**
 * Track when a user starts the checkout process
 * @param {number} cartTotal - Total cart value
 * @param {number} itemCount - Number of items in cart
 */
export async function trackCheckoutStart(cartTotal, itemCount) {
  if (typeof cartTotal !== 'number') throw new Error('cartTotal must be a number');
  if (typeof itemCount !== 'number') throw new Error('itemCount must be a number');
  return _track('checkout', { cartTotal, itemCount });
}

/**
 * Track when a user reaches the payment step
 * @param {string} paymentMethod - Payment method selected (e.g., 'credit_card', 'paypal')
 * @param {number} amount - Payment amount
 */
export async function trackPaymentStart(paymentMethod, amount) {
  if (!paymentMethod) throw new Error('paymentMethod is required');
  if (typeof amount !== 'number') throw new Error('amount must be a number');
  return _track('payment', { paymentMethod, amount });
}

/**
 * Track a completed order
 * @param {string} orderId - Unique order ID
 * @param {number} amount - Total order amount
 * @param {Array<{id: string, quantity: number, price: number}>} products - Array of purchased products
 * @param {string} [paymentMethod] - Optional payment method used
 * @param {string} [couponCode] - Optional coupon code used
 */
export async function trackOrderComplete(orderId, amount, products, paymentMethod = null, couponCode = null) {
  if (!orderId) throw new Error('orderId is required');
  if (typeof amount !== 'number') throw new Error('amount must be a number');
  if (!Array.isArray(products)) throw new Error('products must be an array');
  return _track('order_complete', { orderId, amount, products, paymentMethod, couponCode });
}

/**
 * Track when an order is cancelled
 * @param {string} orderId - The cancelled order ID
 * @param {string} [reason] - Optional cancellation reason
 */
export async function trackOrderCancelled(orderId, reason = null) {
  if (!orderId) throw new Error('orderId is required');
  return _track('order_cancelled', { orderId, reason });
}

/**
 * Track cart abandonment (call when user leaves with items in cart)
 * @param {number} cartValue - Total value of abandoned cart
 * @param {number} itemCount - Number of items in cart
 * @param {Array<string>} [productIds] - Optional array of product IDs in cart
 */
export async function trackCartAbandoned(cartValue, itemCount, productIds = null) {
  if (typeof cartValue !== 'number') throw new Error('cartValue must be a number');
  return _track('cart_abandoned', { cartValue, itemCount, productIds });
}

// ============================================
// USER TRACKING
// ============================================

/**
 * Track when a new user signs up
 * @param {string} userId - The new user's ID
 * @param {string} [source] - Acquisition source (e.g., 'google', 'facebook', 'direct')
 * @param {string} [referralCode] - Optional referral code used
 */
export async function trackUserSignup(userId, source = 'direct', referralCode = null) {
  if (!userId) throw new Error('userId is required');
  return _track('user_signup', { userId, source, referralCode });
}

/**
 * Track when a user logs in
 * @param {string} userId - The user's ID
 */
export async function trackUserLogin(userId) {
  if (!userId) throw new Error('userId is required');
  return _track('user_login', { userId });
}

/**
 * Track when a user logs out
 * @param {string} userId - The user's ID
 */
export async function trackUserLogout(userId) {
  if (!userId) throw new Error('userId is required');
  return _track('user_logout', { userId });
}

// ============================================
// SEARCH & NAVIGATION TRACKING
// ============================================

/**
 * Track a search query
 * @param {string} query - The search query
 * @param {number} resultsCount - Number of results returned
 * @param {string} [category] - Optional category filter applied
 */
export async function trackSearch(query, resultsCount, category = null) {
  if (!query) throw new Error('query is required');
  if (typeof resultsCount !== 'number') throw new Error('resultsCount must be a number');
  return _track('search', { query, resultsCount, category });
}

/**
 * Track when a user applies filters
 * @param {Object} filters - The filters applied (e.g., { category: 'electronics', priceRange: '100-500' })
 * @param {number} resultsCount - Number of results after filtering
 */
export async function trackFilterApplied(filters, resultsCount) {
  if (!filters || typeof filters !== 'object') throw new Error('filters must be an object');
  return _track('filter_applied', { filters, resultsCount });
}

// ============================================
// ENGAGEMENT TRACKING
// ============================================

/**
 * Track when a user shares content
 * @param {string} contentType - Type of content shared (e.g., 'product', 'article')
 * @param {string} contentId - ID of the shared content
 * @param {string} platform - Platform shared to (e.g., 'facebook', 'twitter', 'email')
 */
export async function trackShare(contentType, contentId, platform) {
  if (!contentType) throw new Error('contentType is required');
  if (!contentId) throw new Error('contentId is required');
  if (!platform) throw new Error('platform is required');
  return _track('share', { contentType, contentId, platform });
}

/**
 * Track when a user submits a review
 * @param {string} productId - The reviewed product ID
 * @param {number} rating - Rating given (1-5)
 * @param {boolean} hasText - Whether the review includes text
 */
export async function trackReviewSubmitted(productId, rating, hasText = false) {
  if (!productId) throw new Error('productId is required');
  if (typeof rating !== 'number' || rating < 1 || rating > 5) throw new Error('rating must be 1-5');
  return _track('review_submitted', { productId, rating, hasText });
}

/**
 * Track a newsletter subscription
 * @param {string} email - Subscriber email
 * @param {string} [source] - Where they subscribed from
 */
export async function trackNewsletterSubscribe(email, source = 'website') {
  if (!email) throw new Error('email is required');
  return _track('newsletter_subscribe', { email, source });
}

// ============================================
// SIGNUP FLOW TRACKING
// ============================================

/**
 * Track when user lands on signup/registration page
 * @param {string} [source] - Traffic source (e.g., 'google', 'facebook', 'email_campaign')
 * @param {string} [landingPage] - The landing page URL
 */
export async function trackSignupPageView(source = 'direct', landingPage = null) {
  return _track('signup_page_view', { source, landingPage, timestamp: Date.now() });
}

/**
 * Track when user starts filling the signup form
 * @param {string} [formType] - Type of signup form (e.g., 'email', 'social', 'phone')
 */
export async function trackSignupFormStart(formType = 'email') {
  return _track('signup_form_start', { formType, timestamp: Date.now() });
}

/**
 * Track signup form field completion (for drop-off analysis)
 * @param {string} fieldName - Name of the field completed (e.g., 'email', 'password', 'name')
 * @param {number} stepNumber - Step number in the form (1, 2, 3...)
 * @param {number} totalSteps - Total number of steps in the form
 */
export async function trackSignupFieldComplete(fieldName, stepNumber, totalSteps) {
  if (!fieldName) throw new Error('fieldName is required');
  if (typeof stepNumber !== 'number') throw new Error('stepNumber must be a number');
  return _track('signup_field_complete', { fieldName, stepNumber, totalSteps, timestamp: Date.now() });
}

/**
 * Track when user submits signup form (before verification)
 * @param {string} method - Signup method (e.g., 'email', 'google', 'facebook', 'apple')
 */
export async function trackSignupFormSubmit(method = 'email') {
  return _track('signup_form_submit', { method, timestamp: Date.now() });
}

/**
 * Track email/phone verification sent
 * @param {string} verificationType - Type of verification ('email', 'sms', 'phone')
 */
export async function trackVerificationSent(verificationType = 'email') {
  return _track('verification_sent', { verificationType, timestamp: Date.now() });
}

/**
 * Track successful verification
 * @param {string} verificationType - Type of verification ('email', 'sms', 'phone')
 * @param {number} [timeToVerifyMs] - Time taken to verify in milliseconds
 */
export async function trackVerificationComplete(verificationType = 'email', timeToVerifyMs = null) {
  return _track('verification_complete', { verificationType, timeToVerifyMs, timestamp: Date.now() });
}

/**
 * Track signup completion (account created)
 * @param {string} userId - The new user's ID
 * @param {string} method - Signup method used
 * @param {string} [source] - Acquisition source
 * @param {number} [totalTimeMs] - Total time from page view to completion
 */
export async function trackSignupComplete(userId, method, source = 'direct', totalTimeMs = null) {
  if (!userId) throw new Error('userId is required');
  return _track('signup_complete', { userId, method, source, totalTimeMs, timestamp: Date.now() });
}

/**
 * Track signup drop-off/abandonment
 * @param {string} dropOffStep - Step where user dropped off (e.g., 'form_start', 'email_field', 'verification')
 * @param {string} [reason] - Reason if known (e.g., 'validation_error', 'timeout', 'closed_page')
 * @param {Object} [formData] - Partial form data (non-sensitive fields only)
 */
export async function trackSignupDropOff(dropOffStep, reason = null, formData = null) {
  if (!dropOffStep) throw new Error('dropOffStep is required');
  return _track('signup_drop_off', { dropOffStep, reason, formData, timestamp: Date.now() });
}

/**
 * Track first action after signup (onboarding completion indicator)
 * @param {string} userId - User ID
 * @param {string} actionType - Type of first action (e.g., 'profile_complete', 'first_purchase', 'browse_products')
 */
export async function trackFirstActionAfterSignup(userId, actionType) {
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
 * @param {string} [entryPoint] - Where user entered (e.g., 'homepage', 'product_page', 'search')
 */
export async function trackOrderFlowStart(sessionId = null, entryPoint = 'homepage') {
  const flowId = sessionId || `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Store flow start time in sessionStorage for timing calculations
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('orderFlowId', flowId);
    sessionStorage.setItem('orderFlowStart', Date.now().toString());
  }
  return _track('order_flow_start', { flowId, entryPoint, timestamp: Date.now() });
}

/**
 * Track product browsing in order flow
 * @param {string} productId - Product being viewed
 * @param {number} [timeOnPageMs] - Time spent on previous page
 */
export async function trackOrderFlowProductView(productId, timeOnPageMs = null) {
  if (!productId) throw new Error('productId is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  return _track('order_flow_product_view', { flowId, productId, timeOnPageMs, timestamp: Date.now() });
}

/**
 * Track add to cart in order flow (with timing)
 * @param {string} productId - Product added
 * @param {number} quantity - Quantity added
 * @param {number} price - Unit price
 */
export async function trackOrderFlowAddToCart(productId, quantity, price) {
  if (!productId) throw new Error('productId is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const timeInFlowMs = flowStart ? Date.now() - flowStart : null;
  return _track('order_flow_add_to_cart', { flowId, productId, quantity, price, timeInFlowMs, timestamp: Date.now() });
}

/**
 * Track cart view in order flow
 * @param {number} cartTotal - Current cart total
 * @param {number} itemCount - Number of items
 */
export async function trackOrderFlowCartView(cartTotal, itemCount) {
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const timeInFlowMs = flowStart ? Date.now() - flowStart : null;
  return _track('order_flow_cart_view', { flowId, cartTotal, itemCount, timeInFlowMs, timestamp: Date.now() });
}

/**
 * Track checkout step in order flow
 * @param {number} stepNumber - Checkout step (1=shipping, 2=payment, 3=review, etc.)
 * @param {string} stepName - Step name (e.g., 'shipping_address', 'payment_method', 'order_review')
 * @param {number} [timeOnPreviousStepMs] - Time spent on previous step
 */
export async function trackOrderFlowCheckoutStep(stepNumber, stepName, timeOnPreviousStepMs = null) {
  if (typeof stepNumber !== 'number') throw new Error('stepNumber must be a number');
  if (!stepName) throw new Error('stepName is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const timeInFlowMs = flowStart ? Date.now() - flowStart : null;
  return _track('order_flow_checkout_step', { flowId, stepNumber, stepName, timeOnPreviousStepMs, timeInFlowMs, timestamp: Date.now() });
}

/**
 * Track order flow completion with full timing data
 * @param {string} orderId - The order ID
 * @param {number} amount - Order total
 * @param {Array} products - Products purchased
 * @param {string} [paymentMethod] - Payment method used
 */
export async function trackOrderFlowComplete(orderId, amount, products, paymentMethod = null) {
  if (!orderId) throw new Error('orderId is required');
  const flowId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('orderFlowId') : null;
  const flowStart = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('orderFlowStart') || '0') : 0;
  const totalFlowTimeMs = flowStart ? Date.now() - flowStart : null;

  // Clear flow data
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
 * @param {string} lastProductViewed - Last product ID viewed
 * @param {number} productsViewed - Total products viewed in session
 * @param {number} [timeOnSiteMs] - Total time on site
 */
export async function trackBrowsingDropOff(lastProductViewed, productsViewed, timeOnSiteMs = null) {
  return _track('browsing_drop_off', { lastProductViewed, productsViewed, timeOnSiteMs, timestamp: Date.now() });
}

/**
 * Track cart abandonment with detailed info
 * @param {number} cartValue - Total cart value
 * @param {Array<{id: string, name: string, price: number, quantity: number}>} items - Items in cart
 * @param {string} lastAction - Last action before abandonment (e.g., 'viewed_cart', 'started_checkout')
 * @param {number} [timeInCartMs] - Time since first item added to cart
 */
export async function trackCartDropOff(cartValue, items, lastAction, timeInCartMs = null) {
  if (typeof cartValue !== 'number') throw new Error('cartValue must be a number');
  if (!Array.isArray(items)) throw new Error('items must be an array');
  return _track('cart_drop_off', { cartValue, items, lastAction, timeInCartMs, timestamp: Date.now() });
}

/**
 * Track checkout abandonment at specific step
 * @param {number} stepNumber - Step where user dropped off
 * @param {string} stepName - Name of the step (e.g., 'shipping', 'payment', 'review')
 * @param {number} cartValue - Cart value at abandonment
 * @param {string} [reason] - Reason if detectable (e.g., 'payment_failed', 'shipping_too_high', 'closed_page')
 * @param {Object} [partialData] - Any partial data entered (non-sensitive)
 */
export async function trackCheckoutDropOff(stepNumber, stepName, cartValue, reason = null, partialData = null) {
  if (typeof stepNumber !== 'number') throw new Error('stepNumber must be a number');
  if (!stepName) throw new Error('stepName is required');
  return _track('checkout_drop_off', { stepNumber, stepName, cartValue, reason, partialData, timestamp: Date.now() });
}

/**
 * Track payment failure
 * @param {string} paymentMethod - Payment method attempted
 * @param {string} errorCode - Error code from payment processor
 * @param {string} [errorMessage] - Human readable error message
 * @param {number} amount - Amount attempted
 */
export async function trackPaymentDropOff(paymentMethod, errorCode, errorMessage = null, amount) {
  if (!paymentMethod) throw new Error('paymentMethod is required');
  if (!errorCode) throw new Error('errorCode is required');
  return _track('payment_drop_off', { paymentMethod, errorCode, errorMessage, amount, timestamp: Date.now() });
}

/**
 * Track form validation errors (causes of drop-off)
 * @param {string} formName - Name of the form (e.g., 'signup', 'checkout_shipping', 'payment')
 * @param {string} fieldName - Field with error
 * @param {string} errorType - Type of error (e.g., 'required', 'invalid_format', 'too_short')
 * @param {number} attemptNumber - Which attempt this is (1st, 2nd, etc.)
 */
export async function trackFormValidationError(formName, fieldName, errorType, attemptNumber = 1) {
  if (!formName) throw new Error('formName is required');
  if (!fieldName) throw new Error('fieldName is required');
  if (!errorType) throw new Error('errorType is required');
  return _track('form_validation_error', { formName, fieldName, errorType, attemptNumber, timestamp: Date.now() });
}

/**
 * Track page exit intent (mouse leaving viewport, back button, etc.)
 * @param {string} pageName - Current page name
 * @param {string} exitType - Type of exit intent ('mouse_leave', 'back_button', 'close_tab', 'navigate_away')
 * @param {number} timeOnPageMs - Time spent on page
 * @param {Object} [pageState] - Current page state (e.g., { cartItems: 2, formProgress: 50 })
 */
export async function trackExitIntent(pageName, exitType, timeOnPageMs, pageState = null) {
  if (!pageName) throw new Error('pageName is required');
  if (!exitType) throw new Error('exitType is required');
  return _track('exit_intent', { pageName, exitType, timeOnPageMs, pageState, timestamp: Date.now() });
}

// ============================================
// SESSION TIMING HELPERS
// ============================================

/**
 * Start timing a user action (stores timestamp in sessionStorage)
 * @param {string} actionName - Name of the action being timed
 */
export function startTiming(actionName) {
  if (!actionName) throw new Error('actionName is required');
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(`timing_${actionName}`, Date.now().toString());
  }
}

/**
 * End timing and get duration
 * @param {string} actionName - Name of the action being timed
 * @returns {number|null} Duration in milliseconds, or null if not started
 */
export function endTiming(actionName) {
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
 * @param {string} actionName - Name of the action
 * @param {Object} [additionalData] - Additional data to track
 */
export async function trackTimedAction(actionName, additionalData = {}) {
  if (!actionName) throw new Error('actionName is required');
  const duration = endTiming(actionName);
  return _track('timed_action', { actionName, durationMs: duration, ...additionalData, timestamp: Date.now() });
}

// ============================================
// CUSTOM EVENT TRACKING
// ============================================

/**
 * Track a custom event (use sparingly - prefer specific functions above)
 * @param {string} eventName - Custom event name
 * @param {Object} eventData - Event data
 */
export async function trackCustomEvent(eventName, eventData = {}) {
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
export async function getRealtimeStats() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/realtime`);
  return response.json();
}

/**
 * Get business/revenue metrics
 * @returns {Promise<Object>} Business metrics including revenue, orders, carts
 */
export async function getBusinessMetrics() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/business/json`);
  return response.json();
}

/**
 * Get user analytics
 * @returns {Promise<Object>} User metrics including visitors, sessions, engagement
 */
export async function getUserAnalytics() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/users/json`);
  return response.json();
}

/**
 * Get conversion funnel data
 * @returns {Promise<Object>} Funnel data with step-by-step conversion rates
 */
export async function getFunnelData() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/funnels/json`);
  return response.json();
}

/**
 * Get customer segments
 * @returns {Promise<Object>} Segment data (behavioral, value, engagement)
 */
export async function getSegments() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/segments/json`);
  return response.json();
}

/**
 * Get RFM analysis data
 * @returns {Promise<Object>} RFM scores and segment breakdown
 */
export async function getRFMAnalysis() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/rfm/json`);
  return response.json();
}

/**
 * Get customer lifetime value data
 * @returns {Promise<Object>} LTV metrics and top customers
 */
export async function getLTVData() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/ltv/json`);
  return response.json();
}

/**
 * Get predictive analytics
 * @returns {Promise<Object>} Trends, forecasts, and churn risk
 */
export async function getPredictions() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/predictions/json`);
  return response.json();
}

/**
 * Get AI-generated insights
 * @returns {Promise<Object>} Alerts, opportunities, recommendations
 */
export async function getInsights() {
  const response = await fetch(`${ANALYTICS_BASE_URL}/insights/json`);
  return response.json();
}

/**
 * Get historical analytics data
 * @param {number} [days=30] - Number of days of historical data
 * @returns {Promise<Object>} Daily historical data and summary
 */
export async function getHistoricalData(days = 30) {
  const response = await fetch(`${ANALYTICS_BASE_URL}/historical?range=${days}`);
  return response.json();
}

/**
 * Set a business goal
 * @param {'revenue'|'orders'|'conversion'|'newCustomers'|string} type - Goal type
 * @param {number} target - Target value
 * @param {'daily'|'weekly'|'monthly'|'yearly'} [period='monthly'] - Goal period
 * @returns {Promise<Object>} Updated goals
 */
export async function setGoal(type, target, period = 'monthly') {
  if (!type) throw new Error('type is required');
  if (typeof target !== 'number') throw new Error('target must be a number');
  const response = await fetch(`${ANALYTICS_BASE_URL}/goal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, target, period })
  });
  return response.json();
}
```

---

## Usage Examples

### Product Page
```javascript
import { trackProductView, trackAddToCart, trackAddToWishlist } from './utils/analytics';

// When product page loads
trackProductView('SKU-123', 'Wireless Headphones', 'Electronics');

// When user clicks "Add to Cart"
trackAddToCart('SKU-123', 1, 79.99, 'Wireless Headphones');

// When user clicks "Add to Wishlist"
trackAddToWishlist('SKU-123', 'Wireless Headphones');
```

### Cart Page
```javascript
import { trackCartView, trackRemoveFromCart, trackCheckoutStart } from './utils/analytics';

// When cart page loads
trackCartView(159.98, 2);

// When user removes an item
trackRemoveFromCart('SKU-123', 1);

// When user clicks "Proceed to Checkout"
trackCheckoutStart(79.99, 1);
```

### Checkout Flow
```javascript
import { trackPaymentStart, trackOrderComplete } from './utils/analytics';

// When user selects payment method
trackPaymentStart('credit_card', 79.99);

// When order is confirmed
trackOrderComplete(
  'ORD-2024-001',
  79.99,
  [{ id: 'SKU-123', quantity: 1, price: 79.99 }],
  'credit_card',
  'SAVE10'
);
```

### User Authentication
```javascript
import { trackUserSignup, trackUserLogin, trackUserLogout } from './utils/analytics';

// After successful registration
trackUserSignup('user-456', 'google_ads', 'REF-ABC');

// After successful login
trackUserLogin('user-456');

// After logout
trackUserLogout('user-456');
```

### Search & Filters
```javascript
import { trackSearch, trackFilterApplied } from './utils/analytics';

// After search completes
trackSearch('wireless headphones', 42, 'Electronics');

// After applying filters
trackFilterApplied(
  { category: 'Electronics', brand: 'Sony', priceRange: '50-100' },
  12
);
```

### Signup Flow Tracking (Complete Example)
```javascript
import {
  trackSignupPageView,
  trackSignupFormStart,
  trackSignupFieldComplete,
  trackSignupFormSubmit,
  trackVerificationSent,
  trackVerificationComplete,
  trackSignupComplete,
  trackSignupDropOff,
  trackFirstActionAfterSignup,
  trackFormValidationError,
  startTiming
} from './utils/analytics';

// 1. When signup page loads
startTiming('signup_flow'); // Start timing the entire flow
trackSignupPageView('google_ads', '/signup');

// 2. When user clicks into first form field
trackSignupFormStart('email');

// 3. Track each field completion for drop-off analysis
function onFieldComplete(fieldName, stepNumber) {
  trackSignupFieldComplete(fieldName, stepNumber, 4); // 4 total fields
}

onFieldComplete('email', 1);
onFieldComplete('password', 2);
onFieldComplete('name', 3);
onFieldComplete('phone', 4);

// 4. Track validation errors (helps identify friction points)
function onValidationError(field, error, attempt) {
  trackFormValidationError('signup', field, error, attempt);
}

// 5. When form is submitted
trackSignupFormSubmit('email');

// 6. Verification flow
trackVerificationSent('email');

// 7. When user verifies (calculate time to verify)
const verifyStartTime = Date.now();
// ... user clicks verification link ...
trackVerificationComplete('email', Date.now() - verifyStartTime);

// 8. Signup complete
trackSignupComplete('user-123', 'email', 'google_ads', endTiming('signup_flow'));

// 9. Track first action after signup
trackFirstActionAfterSignup('user-123', 'browse_products');

// Handle drop-off (call on page unload if signup incomplete)
window.addEventListener('beforeunload', () => {
  if (!signupComplete) {
    trackSignupDropOff(currentStep, 'closed_page', { email: userEmail });
  }
});
```

### Order Flow Tracking with Timing
```javascript
import {
  trackOrderFlowStart,
  trackOrderFlowProductView,
  trackOrderFlowAddToCart,
  trackOrderFlowCartView,
  trackOrderFlowCheckoutStep,
  trackOrderFlowComplete,
  startTiming,
  endTiming
} from './utils/analytics';

// 1. Start tracking when user begins shopping
trackOrderFlowStart(null, 'homepage');

// 2. Track product views in the flow
trackOrderFlowProductView('SKU-123');
trackOrderFlowProductView('SKU-456');

// 3. Track add to cart (timing is automatic)
trackOrderFlowAddToCart('SKU-123', 2, 49.99);

// 4. Track cart view
trackOrderFlowCartView(99.98, 2);

// 5. Track each checkout step with timing
startTiming('checkout_shipping');
// ... user fills shipping form ...
trackOrderFlowCheckoutStep(1, 'shipping_address', endTiming('checkout_shipping'));

startTiming('checkout_payment');
// ... user fills payment info ...
trackOrderFlowCheckoutStep(2, 'payment_method', endTiming('checkout_payment'));

startTiming('checkout_review');
// ... user reviews order ...
trackOrderFlowCheckoutStep(3, 'order_review', endTiming('checkout_review'));

// 6. Complete order (total flow time calculated automatically)
trackOrderFlowComplete(
  'ORD-2024-001',
  99.98,
  [{ id: 'SKU-123', quantity: 2, price: 49.99 }],
  'credit_card'
);
```

### Drop-off Detection (Complete Example)
```javascript
import {
  trackBrowsingDropOff,
  trackCartDropOff,
  trackCheckoutDropOff,
  trackPaymentDropOff,
  trackExitIntent,
  trackFormValidationError
} from './utils/analytics';

// Track browsing drop-off
let productsViewed = [];
let sessionStartTime = Date.now();

window.addEventListener('beforeunload', () => {
  if (productsViewed.length > 0 && !hasAddedToCart) {
    trackBrowsingDropOff(
      productsViewed[productsViewed.length - 1],
      productsViewed.length,
      Date.now() - sessionStartTime
    );
  }
});

// Track cart drop-off with detailed info
function detectCartAbandonment() {
  if (cartItems.length > 0 && !checkoutStarted) {
    trackCartDropOff(
      cartTotal,
      cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      'viewed_cart',
      Date.now() - cartCreatedTime
    );
  }
}

// Track checkout drop-off at specific step
function onCheckoutAbandon(stepNumber, stepName, reason = null) {
  trackCheckoutDropOff(stepNumber, stepName, cartTotal, reason, {
    hasShippingAddress: !!shippingAddress,
    hasPaymentMethod: !!paymentMethod
  });
}

// Track payment failures
async function processPayment() {
  try {
    const result = await paymentProcessor.charge(amount);
    // success...
  } catch (error) {
    trackPaymentDropOff(
      selectedPaymentMethod,
      error.code,
      error.message,
      amount
    );
  }
}

// Track exit intent (mouse leaving viewport)
document.addEventListener('mouseout', (e) => {
  if (e.clientY < 0) { // Mouse left viewport at top
    trackExitIntent(
      currentPage,
      'mouse_leave',
      Date.now() - pageLoadTime,
      { cartItems: cartItems.length, formProgress: getFormProgress() }
    );
  }
});

// Track form validation errors
function validateForm(formName, field, value) {
  const error = validate(field, value);
  if (error) {
    trackFormValidationError(formName, field, error.type, validationAttempts[field]++);
  }
}
```

### Using Timing Helpers
```javascript
import { startTiming, endTiming, trackTimedAction } from './utils/analytics';

// Time how long user spends on product page
startTiming('product_page_view');

// ... user browses product ...

// When they leave, track the duration
const duration = endTiming('product_page_view');
console.log(`User spent ${duration}ms on product page`);

// Or use trackTimedAction for automatic tracking
startTiming('checkout_form');
// ... user fills form ...
trackTimedAction('checkout_form', { formCompleted: true, fieldsCount: 5 });
```

### Cart Abandonment Detection
```javascript
import { trackCartAbandoned } from './utils/analytics';

// When user navigates away with items in cart
window.addEventListener('beforeunload', () => {
  if (cartHasItems) {
    trackCartAbandoned(cartTotal, cartItemCount, cartProductIds);
  }
});
```

### Dashboard Widget (React)
```jsx
import { useState, useEffect } from 'react';
import { getBusinessMetrics, getRealtimeStats } from './utils/analytics';

function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [realtime, setRealtime] = useState(null);

  useEffect(() => {
    // Fetch initial data
    getBusinessMetrics().then(setMetrics);
    getRealtimeStats().then(setRealtime);

    // Refresh realtime stats every 30 seconds
    const interval = setInterval(() => {
      getRealtimeStats().then(setRealtime);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div>
      <h2>Revenue: ${metrics.revenue.total.toLocaleString()}</h2>
      <p>Orders: {metrics.orders.completed}</p>
      <p>Conversion Rate: {metrics.conversionRate.toFixed(1)}%</p>
      {realtime && <p>Active Visitors: {realtime.activeVisitors}</p>}
    </div>
  );
}
```

---

## TypeScript Definitions

If using TypeScript, add these type definitions:

```typescript
// analytics.d.ts

export function trackProductView(productId: string, productName?: string, category?: string): Promise<{success: boolean}>;
export function trackAddToCart(productId: string, quantity: number, price: number, productName?: string): Promise<{success: boolean}>;
export function trackRemoveFromCart(productId: string, quantity?: number): Promise<{success: boolean}>;
export function trackCartView(cartTotal?: number, itemCount?: number): Promise<{success: boolean}>;
export function trackAddToWishlist(productId: string, productName?: string): Promise<{success: boolean}>;
export function trackCheckoutStart(cartTotal: number, itemCount: number): Promise<{success: boolean}>;
export function trackPaymentStart(paymentMethod: string, amount: number): Promise<{success: boolean}>;
export function trackOrderComplete(orderId: string, amount: number, products: Array<{id: string, quantity: number, price: number}>, paymentMethod?: string, couponCode?: string): Promise<{success: boolean}>;
export function trackOrderCancelled(orderId: string, reason?: string): Promise<{success: boolean}>;
export function trackCartAbandoned(cartValue: number, itemCount: number, productIds?: string[]): Promise<{success: boolean}>;
export function trackUserSignup(userId: string, source?: string, referralCode?: string): Promise<{success: boolean}>;
export function trackUserLogin(userId: string): Promise<{success: boolean}>;
export function trackUserLogout(userId: string): Promise<{success: boolean}>;
export function trackSearch(query: string, resultsCount: number, category?: string): Promise<{success: boolean}>;
export function trackFilterApplied(filters: Record<string, any>, resultsCount: number): Promise<{success: boolean}>;
export function trackShare(contentType: string, contentId: string, platform: string): Promise<{success: boolean}>;
export function trackReviewSubmitted(productId: string, rating: number, hasText?: boolean): Promise<{success: boolean}>;
export function trackNewsletterSubscribe(email: string, source?: string): Promise<{success: boolean}>;
export function trackCustomEvent(eventName: string, eventData?: Record<string, any>): Promise<{success: boolean}>;

export function getRealtimeStats(): Promise<{activeVisitors: number, currentPages: [string, number][], lastMinuteRequests: number}>;
export function getBusinessMetrics(): Promise<BusinessMetrics>;
export function getUserAnalytics(): Promise<UserAnalytics>;
export function getFunnelData(): Promise<FunnelData>;
export function getSegments(): Promise<SegmentData>;
export function getRFMAnalysis(): Promise<RFMData>;
export function getLTVData(): Promise<LTVData>;
export function getPredictions(): Promise<PredictionData>;
export function getInsights(): Promise<InsightsData>;
export function getHistoricalData(days?: number): Promise<HistoricalData>;
export function setGoal(type: string, target: number, period?: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<GoalsData>;
```

---

## Auto-Tracked Events

The middleware automatically tracks these events based on URL patterns:

| URL Pattern | Event Tracked |
|-------------|---------------|
| `GET /products/:id` | `view_product` |
| `POST /cart` | `add_to_cart` |
| `GET /cart` | `view_cart` |
| `* /checkout` | `checkout` |
| `POST /order` | `order_started` |
| `POST /auth/register` or `/signup` | `signup_start` |

---

## Session Management

Sessions are automatically managed via cookies:
- `_ba_visitor`: Persistent visitor ID (1 year expiry)
- `_ba_session`: Session ID (30 min expiry, refreshed on activity)

The `req.analytics` object is available in your route handlers with:
- `req.analytics.sessionId`: Current session ID
- `req.analytics.session`: Full session object
- `req.analytics.trackEvent(name, data)`: Track custom event
- `req.analytics.setUserId(userId)`: Associate session with authenticated user

```javascript
// In your route handler
app.post('/api/purchase', (req, res) => {
  // Track the purchase event
  req.analytics.trackEvent('order_complete', {
    orderId: req.body.orderId,
    amount: req.body.total,
    products: req.body.items
  });

  res.json({ success: true });
});
```

/**
 * Advanced Business Analytics Middleware
 *
 * A comprehensive, enterprise-grade analytics module for tracking user behavior,
 * business metrics, conversion funnels, predictive analytics, and actionable insights.
 *
 * CORE FEATURES:
 * - User session tracking (anonymous & authenticated)
 * - Page views and user journey analysis
 * - Conversion funnel tracking
 * - Business metrics (revenue, orders, cart abandonment)
 * - Geographic and device analytics
 * - Real-time and historical data
 * - Customizable event tracking
 *
 * ADVANCED ANALYTICS:
 * - Customer Lifetime Value (LTV) calculation
 * - RFM (Recency, Frequency, Monetary) scoring
 * - Cohort analysis and retention tracking
 * - Predictive analytics with trend detection
 * - Customer segmentation and scoring
 * - Actionable insights engine with recommendations
 * - Revenue forecasting
 * - Anomaly detection
 * - A/B test tracking
 * - Goal tracking and alerts
 *
 * VISUALIZATIONS:
 * - Interactive charts (line, bar, pie, funnel)
 * - Heatmaps and flow diagrams
 * - Real-time dashboards with WebSocket support
 *
 * Usage:
 *   import { setupBusinessAnalytics } from './middlewares/businessAnalytics.middleware.js';
 *   setupBusinessAnalytics(app, { /* options *\/ });
 *
 * Endpoints created:
 *   GET  /analytics/dashboard    - Visual analytics dashboard
 *   GET  /analytics/executive    - Executive summary dashboard
 *   GET  /analytics/users        - User analytics API
 *   GET  /analytics/business     - Business metrics API
 *   GET  /analytics/funnels      - Conversion funnel data
 *   GET  /analytics/events       - Custom events data
 *   GET  /analytics/insights     - AI-powered actionable insights
 *   GET  /analytics/segments     - Customer segmentation data
 *   GET  /analytics/cohorts      - Cohort analysis data
 *   GET  /analytics/predictions  - Predictive analytics data
 *   GET  /analytics/ltv          - Lifetime value analysis
 *   GET  /analytics/rfm          - RFM scoring data
 *   POST /analytics/track        - Track custom events
 *   POST /analytics/goal         - Set/track goals
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// 📊 ANALYTICS DATA STORES
// ═══════════════════════════════════════════════════════════════

const analytics = {
  startTime: Date.now(),

  // User & Session Tracking
  sessions: new Map(),           // sessionId -> session data
  users: new Map(),              // visitorId -> user data
  authenticatedUsers: new Map(), // userId -> user analytics

  // Page & Event Tracking
  pageViews: {
    total: 0,
    byPage: {},
    byHour: Array(24).fill(0),
    byDay: {},
  },

  // User Journey / Flows
  journeys: [],
  entryPages: {},
  exitPages: {},
  bounceCount: 0,

  // Conversion Funnels (customizable)
  funnels: {
    'checkout': {
      name: 'Checkout Funnel',
      steps: ['view_product', 'add_to_cart', 'view_cart', 'checkout', 'payment', 'order_complete'],
      data: {},
    },
    'signup': {
      name: 'Signup Funnel',
      steps: ['landing', 'signup_start', 'signup_complete', 'first_action'],
      data: {},
    },
  },

  // Business Metrics
  business: {
    revenue: { total: 0, today: 0, byDay: {} },
    orders: { total: 0, today: 0, completed: 0, cancelled: 0, pending: 0 },
    carts: { created: 0, abandoned: 0, converted: 0 },
    products: { views: {}, addedToCart: {}, purchased: {} },
    averageOrderValue: 0,
  },

  // User Engagement
  engagement: {
    avgSessionDuration: 0,
    avgPagesPerSession: 0,
    returningUsers: 0,
    newUsers: 0,
    activeUsers: { daily: new Set(), weekly: new Set(), monthly: new Set() },
  },

  // Geographic & Device
  geographic: {
    countries: {},
    cities: {},
    languages: {},
  },
  devices: {
    types: { desktop: 0, mobile: 0, tablet: 0 },
    browsers: {},
    os: {},
  },

  // Custom Events
  events: [],
  eventCounts: {},

  // Real-time data
  realtime: {
    activeVisitors: new Set(),
    currentPages: {},
    lastMinuteRequests: 0,
    requestsPerMinute: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🚀 ADVANCED ANALYTICS DATA STORES
  // ═══════════════════════════════════════════════════════════════

  // Customer Lifetime Value (LTV)
  ltv: {
    customers: new Map(), // customerId -> { totalSpent, orders, avgOrderValue, firstPurchase, lastPurchase, predictedLTV }
    segments: { high: [], medium: [], low: [], churned: [] },
    averageLTV: 0,
    totalCustomers: 0,
  },

  // RFM Scoring (Recency, Frequency, Monetary)
  rfm: {
    scores: new Map(), // customerId -> { recency, frequency, monetary, score, segment }
    segments: {
      champions: [],      // 555, 554, 544, 545, 454, 455, 445
      loyalCustomers: [], // 543, 444, 435, 355, 354, 345, 344, 335
      potentialLoyalist: [], // 553, 551, 552, 541, 542, 533, 532, 531, 452, 451, 442, 441, 431, 453, 433, 432, 423, 353, 352, 351, 342, 341, 333, 323
      newCustomers: [],   // 512, 511, 422, 421, 412, 411, 311
      promising: [],      // 525, 524, 523, 522, 521, 515, 514, 513, 425, 424, 413, 414, 415, 315, 314, 313
      needsAttention: [], // 535, 534, 443, 434, 343, 334, 325, 324
      aboutToSleep: [],   // 331, 321, 312, 221, 213
      atRisk: [],         // 255, 254, 245, 244, 253, 252, 243, 242, 235, 234, 225, 224, 153, 152, 145, 143, 142, 135, 134, 133, 125, 124
      cantLoseThem: [],   // 155, 154, 144, 214, 215, 115, 114, 113
      hibernating: [],    // 332, 322, 231, 241, 251, 233, 232, 223, 222, 132, 123, 122, 212, 211
      lost: [],           // 111, 112, 121, 131, 141, 151
    },
    lastUpdated: null,
  },

  // Cohort Analysis
  cohorts: {
    byMonth: {},  // { '2024-01': { users: [], retention: { week1: 0, week2: 0, ... }, revenue: 0 } }
    byWeek: {},
    bySource: {}, // acquisition source cohorts
    retention: { // Overall retention rates
      day1: 0, day7: 0, day14: 0, day30: 0, day60: 0, day90: 0,
    },
  },

  // Predictive Analytics
  predictions: {
    revenueForecasts: [],  // { date, predicted, confidence, actual }
    churnRisk: new Map(),  // customerId -> { probability, factors }
    nextPurchase: new Map(), // customerId -> { probability, predictedDate, predictedValue }
    trends: {
      revenue: { direction: 'stable', change: 0, forecast: [] },
      orders: { direction: 'stable', change: 0, forecast: [] },
      traffic: { direction: 'stable', change: 0, forecast: [] },
    },
    seasonality: { patterns: [], peakDays: [], peakHours: [] },
  },

  // Customer Segmentation
  segments: {
    behavioral: { // Based on actions
      browsers: [],      // View products but don't buy
      wishlisters: [],   // Add to wishlist/favorites
      cartAbandoners: [],// Add to cart but don't checkout
      oneTimeBuyers: [], // Purchased once
      repeatBuyers: [],  // Purchased 2-5 times
      loyalists: [],     // Purchased 6+ times
      inactive: [],      // No activity in 30+ days
    },
    value: { // Based on spending
      vip: [],          // Top 10% spenders
      highValue: [],    // 70-90 percentile
      mediumValue: [],  // 30-70 percentile
      lowValue: [],     // Bottom 30%
    },
    engagement: { // Based on activity
      superActive: [],  // Daily visits
      active: [],       // Weekly visits
      casual: [],       // Monthly visits
      dormant: [],      // 30+ days inactive
    },
  },

  // Actionable Insights
  insights: {
    alerts: [],        // Current alerts/warnings
    opportunities: [], // Revenue opportunities
    recommendations: [], // Action recommendations
    anomalies: [],     // Detected anomalies
    lastGenerated: null,
  },

  // Goals & KPIs
  goals: {
    revenue: { target: 0, current: 0, period: 'monthly' },
    orders: { target: 0, current: 0, period: 'monthly' },
    conversion: { target: 0, current: 0, period: 'monthly' },
    newCustomers: { target: 0, current: 0, period: 'monthly' },
    custom: [], // User-defined goals
  },

  // A/B Testing
  abTests: new Map(), // testId -> { name, variants: { A: stats, B: stats }, startDate, status }

  // Historical data for trends (last 90 days)
  historical: {
    daily: [], // { date, revenue, orders, visitors, conversion, avgOrderValue }
    weekly: [],
    monthly: [],
  },
};

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const generateId = () => crypto.randomBytes(16).toString('hex');

const getToday = () => new Date().toISOString().split('T')[0];

const getHour = () => new Date().getHours();

const parseUserAgent = (ua) => {
  if (!ua) return { type: 'unknown', browser: 'unknown', os: 'unknown' };

  // Device type
  let type = 'desktop';
  if (/mobile/i.test(ua)) type = 'mobile';
  else if (/tablet|ipad/i.test(ua)) type = 'tablet';

  // Browser
  let browser = 'other';
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  // OS
  let os = 'other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  return { type, browser, os };
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.ip ||
         'unknown';
};

const getLanguage = (req) => {
  const acceptLang = req.headers['accept-language'] || '';
  return acceptLang.split(',')[0]?.split('-')[0] || 'unknown';
};

// Cookie helper
const getCookie = (req, name) => {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
};

// ═══════════════════════════════════════════════════════════════
// 🧮 ADVANCED ANALYTICS CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate Customer Lifetime Value (LTV)
 * Uses historical purchase data to calculate and predict customer value
 */
const calculateLTV = (customerId, purchases = []) => {
  if (!customerId || purchases.length === 0) return null;

  const totalSpent = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const orderCount = purchases.length;
  const avgOrderValue = totalSpent / orderCount;
  const firstPurchase = new Date(Math.min(...purchases.map(p => new Date(p.date).getTime())));
  const lastPurchase = new Date(Math.max(...purchases.map(p => new Date(p.date).getTime())));
  const customerLifespan = (lastPurchase - firstPurchase) / (1000 * 60 * 60 * 24 * 30); // in months

  // Purchase frequency (orders per month)
  const frequency = customerLifespan > 0 ? orderCount / customerLifespan : orderCount;

  // Predicted LTV (next 12 months based on current behavior)
  const predictedLTV = avgOrderValue * frequency * 12;

  // Customer health score (0-100)
  const daysSinceLastPurchase = (Date.now() - lastPurchase) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 100 - (daysSinceLastPurchase * 2));
  const frequencyScore = Math.min(100, frequency * 20);
  const monetaryScore = Math.min(100, (avgOrderValue / 100) * 10);
  const healthScore = (recencyScore * 0.4 + frequencyScore * 0.3 + monetaryScore * 0.3);

  const ltvData = {
    customerId,
    totalSpent,
    orderCount,
    avgOrderValue,
    firstPurchase,
    lastPurchase,
    customerLifespan,
    frequency,
    predictedLTV,
    healthScore,
    daysSinceLastPurchase,
  };

  analytics.ltv.customers.set(customerId, ltvData);
  updateLTVSegments();

  return ltvData;
};

/**
 * Update LTV segments based on customer data
 */
const updateLTVSegments = () => {
  const customers = Array.from(analytics.ltv.customers.values());
  if (customers.length === 0) return;

  // Sort by predicted LTV
  customers.sort((a, b) => b.predictedLTV - a.predictedLTV);

  const highThreshold = customers.length * 0.2;
  const mediumThreshold = customers.length * 0.5;

  analytics.ltv.segments = {
    high: customers.slice(0, highThreshold).map(c => c.customerId),
    medium: customers.slice(highThreshold, mediumThreshold).map(c => c.customerId),
    low: customers.slice(mediumThreshold).filter(c => c.daysSinceLastPurchase < 90).map(c => c.customerId),
    churned: customers.filter(c => c.daysSinceLastPurchase >= 90).map(c => c.customerId),
  };

  analytics.ltv.averageLTV = customers.reduce((sum, c) => sum + c.predictedLTV, 0) / customers.length;
  analytics.ltv.totalCustomers = customers.length;
};

/**
 * Calculate RFM (Recency, Frequency, Monetary) Score
 * Segments customers based on purchasing behavior
 */
const calculateRFM = (customerId, purchases = []) => {
  if (!customerId || purchases.length === 0) return null;

  const now = Date.now();
  const totalSpent = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const lastPurchaseDate = new Date(Math.max(...purchases.map(p => new Date(p.date).getTime())));
  const daysSinceLastPurchase = (now - lastPurchaseDate) / (1000 * 60 * 60 * 24);

  // Score 1-5 for each dimension (5 is best)
  // Recency: days since last purchase
  let recencyScore;
  if (daysSinceLastPurchase <= 7) recencyScore = 5;
  else if (daysSinceLastPurchase <= 30) recencyScore = 4;
  else if (daysSinceLastPurchase <= 60) recencyScore = 3;
  else if (daysSinceLastPurchase <= 90) recencyScore = 2;
  else recencyScore = 1;

  // Frequency: number of orders
  let frequencyScore;
  if (purchases.length >= 20) frequencyScore = 5;
  else if (purchases.length >= 10) frequencyScore = 4;
  else if (purchases.length >= 5) frequencyScore = 3;
  else if (purchases.length >= 2) frequencyScore = 2;
  else frequencyScore = 1;

  // Monetary: total spent
  let monetaryScore;
  if (totalSpent >= 1000) monetaryScore = 5;
  else if (totalSpent >= 500) monetaryScore = 4;
  else if (totalSpent >= 200) monetaryScore = 3;
  else if (totalSpent >= 50) monetaryScore = 2;
  else monetaryScore = 1;

  const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
  const segment = getRFMSegment(rfmScore);

  const rfmData = {
    customerId,
    recency: recencyScore,
    frequency: frequencyScore,
    monetary: monetaryScore,
    score: rfmScore,
    segment,
    totalSpent,
    orderCount: purchases.length,
    daysSinceLastPurchase,
  };

  analytics.rfm.scores.set(customerId, rfmData);
  analytics.rfm.lastUpdated = new Date().toISOString();

  return rfmData;
};

/**
 * Get RFM segment name based on score
 */
const getRFMSegment = (score) => {
  const scoreNum = parseInt(score);
  const r = Math.floor(scoreNum / 100);
  const f = Math.floor((scoreNum % 100) / 10);
  const m = scoreNum % 10;

  // Champions: Best customers
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';

  // Loyal Customers: Good recency/frequency, moderate monetary
  if (r >= 3 && f >= 3 && m >= 3 && !(r >= 4 && f >= 4 && m >= 4)) return 'loyalCustomers';

  // Potential Loyalist: Recent with potential
  if (r >= 4 && f <= 3) return 'potentialLoyalist';

  // New Customers: Very recent, low frequency
  if (r >= 4 && f === 1) return 'newCustomers';

  // Promising: Recent, medium engagement
  if (r >= 3 && f >= 2 && f <= 3) return 'promising';

  // Need Attention: Above average but slipping
  if (r === 3 && f >= 3) return 'needsAttention';

  // About to Sleep: Low recency, was engaged
  if (r === 2 && f >= 2) return 'aboutToSleep';

  // At Risk: Spent big money, but long ago
  if (r <= 2 && f >= 3 && m >= 3) return 'atRisk';

  // Can't Lose Them: Made big purchases, now inactive
  if (r === 1 && f >= 4 && m >= 4) return 'cantLoseThem';

  // Hibernating: Low across all
  if (r <= 2 && f <= 2) return 'hibernating';

  // Lost: Very low engagement
  if (r === 1 && f === 1) return 'lost';

  return 'other';
};

/**
 * Update all RFM segments
 */
const updateRFMSegments = () => {
  // Reset segments
  Object.keys(analytics.rfm.segments).forEach(key => {
    analytics.rfm.segments[key] = [];
  });

  // Categorize each customer
  analytics.rfm.scores.forEach((data, customerId) => {
    const segment = data.segment;
    if (analytics.rfm.segments[segment]) {
      analytics.rfm.segments[segment].push(customerId);
    }
  });
};

/**
 * Track cohort for a user
 */
const trackCohort = (userId, acquisitionDate, source = 'direct') => {
  const date = new Date(acquisitionDate);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;

  // Monthly cohort
  if (!analytics.cohorts.byMonth[monthKey]) {
    analytics.cohorts.byMonth[monthKey] = {
      users: [],
      retention: {},
      revenue: 0,
      conversions: 0,
    };
  }
  if (!analytics.cohorts.byMonth[monthKey].users.includes(userId)) {
    analytics.cohorts.byMonth[monthKey].users.push(userId);
  }

  // Weekly cohort
  if (!analytics.cohorts.byWeek[weekKey]) {
    analytics.cohorts.byWeek[weekKey] = {
      users: [],
      retention: {},
      revenue: 0,
    };
  }
  if (!analytics.cohorts.byWeek[weekKey].users.includes(userId)) {
    analytics.cohorts.byWeek[weekKey].users.push(userId);
  }

  // Source cohort
  if (!analytics.cohorts.bySource[source]) {
    analytics.cohorts.bySource[source] = {
      users: [],
      revenue: 0,
      conversions: 0,
    };
  }
  if (!analytics.cohorts.bySource[source].users.includes(userId)) {
    analytics.cohorts.bySource[source].users.push(userId);
  }
};

/**
 * Get week number of the year
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Calculate retention for cohorts
 */
const calculateCohortRetention = () => {
  const now = Date.now();

  Object.entries(analytics.cohorts.byMonth).forEach(([monthKey, cohort]) => {
    const cohortDate = new Date(`${monthKey}-01`);
    const monthsElapsed = Math.floor((now - cohortDate) / (1000 * 60 * 60 * 24 * 30));

    // Check retention at various intervals
    [1, 2, 3, 6, 12].forEach(month => {
      if (monthsElapsed >= month) {
        // Calculate how many users were active in that month
        const activeInMonth = cohort.users.filter(userId => {
          const user = analytics.users.get(userId);
          if (!user) return false;
          const userLastSeen = new Date(user.lastSeen);
          const targetMonth = new Date(cohortDate);
          targetMonth.setMonth(targetMonth.getMonth() + month);
          return userLastSeen >= targetMonth;
        }).length;

        cohort.retention[`month${month}`] = cohort.users.length > 0
          ? ((activeInMonth / cohort.users.length) * 100).toFixed(1)
          : 0;
      }
    });
  });
};

/**
 * Detect trends and generate predictions
 */
const analyzeAndPredict = () => {
  const historical = analytics.historical.daily;
  if (historical.length < 7) return; // Need at least a week of data

  // Calculate trends
  const recentData = historical.slice(-7);
  const olderData = historical.slice(-14, -7);

  if (recentData.length > 0 && olderData.length > 0) {
    // Revenue trend
    const recentRevenue = recentData.reduce((sum, d) => sum + (d.revenue || 0), 0) / recentData.length;
    const olderRevenue = olderData.reduce((sum, d) => sum + (d.revenue || 0), 0) / olderData.length;
    const revenueChange = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue * 100) : 0;

    analytics.predictions.trends.revenue = {
      direction: revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'stable',
      change: revenueChange.toFixed(1),
      current: recentRevenue,
      previous: olderRevenue,
    };

    // Orders trend
    const recentOrders = recentData.reduce((sum, d) => sum + (d.orders || 0), 0) / recentData.length;
    const olderOrders = olderData.reduce((sum, d) => sum + (d.orders || 0), 0) / olderData.length;
    const ordersChange = olderOrders > 0 ? ((recentOrders - olderOrders) / olderOrders * 100) : 0;

    analytics.predictions.trends.orders = {
      direction: ordersChange > 5 ? 'up' : ordersChange < -5 ? 'down' : 'stable',
      change: ordersChange.toFixed(1),
      current: recentOrders,
      previous: olderOrders,
    };

    // Traffic trend
    const recentVisitors = recentData.reduce((sum, d) => sum + (d.visitors || 0), 0) / recentData.length;
    const olderVisitors = olderData.reduce((sum, d) => sum + (d.visitors || 0), 0) / olderData.length;
    const trafficChange = olderVisitors > 0 ? ((recentVisitors - olderVisitors) / olderVisitors * 100) : 0;

    analytics.predictions.trends.traffic = {
      direction: trafficChange > 5 ? 'up' : trafficChange < -5 ? 'down' : 'stable',
      change: trafficChange.toFixed(1),
      current: recentVisitors,
      previous: olderVisitors,
    };
  }

  // Simple revenue forecast (linear regression)
  if (historical.length >= 14) {
    const forecast = [];
    const avgDailyRevenue = recentData.reduce((sum, d) => sum + (d.revenue || 0), 0) / recentData.length;
    const growthRate = analytics.predictions.trends.revenue.change / 100;

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      const predicted = avgDailyRevenue * (1 + (growthRate / 7 * i));
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted: Math.max(0, predicted).toFixed(2),
        confidence: Math.max(50, 90 - (i * 5)),
      });
    }
    analytics.predictions.revenueForecasts = forecast;
  }

  // Detect seasonality patterns
  detectSeasonality();
};

/**
 * Detect seasonality patterns
 */
const detectSeasonality = () => {
  // Peak hours analysis
  const hourlyData = analytics.pageViews.byHour;
  const avgHourly = hourlyData.reduce((a, b) => a + b, 0) / 24;
  const peakHours = hourlyData
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > avgHourly * 1.5)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(h => h.hour);

  analytics.predictions.seasonality.peakHours = peakHours;

  // Peak days analysis
  const dailyData = analytics.pageViews.byDay;
  const days = Object.entries(dailyData);
  if (days.length >= 7) {
    const avgDaily = days.reduce((sum, [, count]) => sum + count, 0) / days.length;
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const dayOfWeekOccurrences = [0, 0, 0, 0, 0, 0, 0];

    days.forEach(([dateStr, count]) => {
      const day = new Date(dateStr).getDay();
      dayOfWeekCounts[day] += count;
      dayOfWeekOccurrences[day]++;
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const avgByDay = dayOfWeekCounts.map((count, i) => ({
      day: dayNames[i],
      avg: dayOfWeekOccurrences[i] > 0 ? count / dayOfWeekOccurrences[i] : 0,
    }));

    analytics.predictions.seasonality.peakDays = avgByDay
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map(d => d.day);
  }
};

/**
 * Generate actionable insights based on analytics data
 */
const generateInsights = () => {
  const insights = {
    alerts: [],
    opportunities: [],
    recommendations: [],
    anomalies: [],
    lastGenerated: new Date().toISOString(),
  };

  // Alert: High cart abandonment
  const abandonmentRate = analytics.business.carts.created > 0
    ? (analytics.business.carts.abandoned / analytics.business.carts.created) * 100
    : 0;
  if (abandonmentRate > 70) {
    insights.alerts.push({
      type: 'critical',
      category: 'conversion',
      title: 'High Cart Abandonment Rate',
      message: `Cart abandonment is at ${abandonmentRate.toFixed(1)}%. Consider implementing exit-intent popups or email recovery campaigns.`,
      metric: abandonmentRate,
      threshold: 70,
    });
  }

  // Alert: Low conversion rate
  const conversionRate = analytics.business.carts.created > 0
    ? (analytics.business.carts.converted / analytics.business.carts.created) * 100
    : 0;
  if (conversionRate < 2 && analytics.pageViews.total > 100) {
    insights.alerts.push({
      type: 'warning',
      category: 'conversion',
      title: 'Low Conversion Rate',
      message: `Only ${conversionRate.toFixed(1)}% of visitors are converting. Review your checkout process and pricing.`,
      metric: conversionRate,
      threshold: 2,
    });
  }

  // Alert: High bounce rate
  const bounceRate = analytics.sessions.size > 0
    ? (analytics.bounceCount / analytics.sessions.size) * 100
    : 0;
  if (bounceRate > 60) {
    insights.alerts.push({
      type: 'warning',
      category: 'engagement',
      title: 'High Bounce Rate',
      message: `${bounceRate.toFixed(1)}% of visitors leave after viewing one page. Improve landing page content and CTAs.`,
      metric: bounceRate,
      threshold: 60,
    });
  }

  // Opportunity: Revenue trend up
  if (analytics.predictions.trends.revenue.direction === 'up') {
    insights.opportunities.push({
      type: 'growth',
      title: 'Revenue Growing',
      message: `Revenue is up ${analytics.predictions.trends.revenue.change}% vs last week. Consider increasing ad spend to capitalize on momentum.`,
      impact: 'high',
    });
  }

  // Opportunity: High-value segment growth
  if (analytics.ltv.segments.high.length > 0) {
    insights.opportunities.push({
      type: 'retention',
      title: 'VIP Customer Segment',
      message: `${analytics.ltv.segments.high.length} high-value customers identified. Create exclusive offers or loyalty program to retain them.`,
      impact: 'high',
      actionable: true,
    });
  }

  // Opportunity: At-risk customers
  const atRiskCount = analytics.rfm.segments.atRisk?.length || 0;
  if (atRiskCount > 0) {
    insights.opportunities.push({
      type: 'reactivation',
      title: 'At-Risk Customers Need Attention',
      message: `${atRiskCount} previously valuable customers are at risk of churning. Send win-back campaigns with special offers.`,
      impact: 'high',
      actionable: true,
    });
  }

  // Recommendations based on data
  // Peak hours
  if (analytics.predictions.seasonality.peakHours.length > 0) {
    insights.recommendations.push({
      category: 'timing',
      title: 'Optimal Posting Times',
      message: `Peak traffic hours are ${analytics.predictions.seasonality.peakHours.join(', ')}:00. Schedule promotions and social posts around these times.`,
    });
  }

  // Peak days
  if (analytics.predictions.seasonality.peakDays.length > 0) {
    insights.recommendations.push({
      category: 'timing',
      title: 'Best Days for Sales',
      message: `${analytics.predictions.seasonality.peakDays.join(', ')} see the most traffic. Plan flash sales and promotions for these days.`,
    });
  }

  // Device optimization
  const mobileShare = analytics.devices.types.mobile || 0;
  const totalDevices = Object.values(analytics.devices.types).reduce((a, b) => a + b, 0);
  if (totalDevices > 0 && (mobileShare / totalDevices) > 0.5) {
    insights.recommendations.push({
      category: 'ux',
      title: 'Mobile-First Optimization',
      message: `${((mobileShare / totalDevices) * 100).toFixed(0)}% of traffic is mobile. Prioritize mobile UX and page speed.`,
    });
  }

  // Low session duration
  if (analytics.engagement.avgSessionDuration < 60000 && analytics.sessions.size > 10) {
    insights.recommendations.push({
      category: 'engagement',
      title: 'Improve Content Engagement',
      message: `Average session is only ${(analytics.engagement.avgSessionDuration / 1000).toFixed(0)}s. Add more engaging content, videos, or interactive elements.`,
    });
  }

  // Anomaly detection
  // Check for unusual traffic spikes
  const dailyViews = Object.values(analytics.pageViews.byDay);
  if (dailyViews.length > 7) {
    const avgViews = dailyViews.slice(0, -1).reduce((a, b) => a + b, 0) / (dailyViews.length - 1);
    const todayViews = dailyViews[dailyViews.length - 1];
    if (todayViews > avgViews * 2) {
      insights.anomalies.push({
        type: 'traffic_spike',
        title: 'Unusual Traffic Spike',
        message: `Today's traffic is ${((todayViews / avgViews - 1) * 100).toFixed(0)}% higher than average. Check for viral content or bot traffic.`,
        severity: 'medium',
      });
    } else if (todayViews < avgViews * 0.5) {
      insights.anomalies.push({
        type: 'traffic_drop',
        title: 'Traffic Drop Detected',
        message: `Today's traffic is ${((1 - todayViews / avgViews) * 100).toFixed(0)}% lower than average. Check for technical issues or external factors.`,
        severity: 'high',
      });
    }
  }

  analytics.insights = insights;
  return insights;
};

/**
 * Update customer segments based on behavior
 */
const updateSegments = () => {
  // Reset segments
  Object.keys(analytics.segments.behavioral).forEach(key => {
    analytics.segments.behavioral[key] = [];
  });
  Object.keys(analytics.segments.value).forEach(key => {
    analytics.segments.value[key] = [];
  });
  Object.keys(analytics.segments.engagement).forEach(key => {
    analytics.segments.engagement[key] = [];
  });

  const now = Date.now();

  // Categorize authenticated users
  analytics.authenticatedUsers.forEach((userData, userId) => {
    const purchases = userData.purchases || [];
    const daysSinceActive = (now - (userData.lastSeen || userData.firstSeen)) / (1000 * 60 * 60 * 24);

    // Behavioral segments
    if (purchases.length === 0) {
      analytics.segments.behavioral.browsers.push(userId);
    } else if (purchases.length === 1) {
      analytics.segments.behavioral.oneTimeBuyers.push(userId);
    } else if (purchases.length <= 5) {
      analytics.segments.behavioral.repeatBuyers.push(userId);
    } else {
      analytics.segments.behavioral.loyalists.push(userId);
    }

    if (daysSinceActive > 30) {
      analytics.segments.behavioral.inactive.push(userId);
    }

    // Value segments (based on total spent)
    const totalSpent = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    if (totalSpent >= 1000) {
      analytics.segments.value.vip.push(userId);
    } else if (totalSpent >= 500) {
      analytics.segments.value.highValue.push(userId);
    } else if (totalSpent >= 100) {
      analytics.segments.value.mediumValue.push(userId);
    } else {
      analytics.segments.value.lowValue.push(userId);
    }

    // Engagement segments
    if (daysSinceActive <= 1) {
      analytics.segments.engagement.superActive.push(userId);
    } else if (daysSinceActive <= 7) {
      analytics.segments.engagement.active.push(userId);
    } else if (daysSinceActive <= 30) {
      analytics.segments.engagement.casual.push(userId);
    } else {
      analytics.segments.engagement.dormant.push(userId);
    }
  });
};

/**
 * Record daily historical data snapshot
 */
const recordDailySnapshot = () => {
  const today = getToday();
  const existing = analytics.historical.daily.find(d => d.date === today);

  const snapshot = {
    date: today,
    revenue: analytics.business.revenue.today,
    orders: analytics.business.orders.today,
    visitors: analytics.engagement.activeUsers.daily.size,
    sessions: analytics.sessions.size,
    pageViews: analytics.pageViews.byDay[today] || 0,
    conversion: analytics.business.carts.created > 0
      ? (analytics.business.carts.converted / analytics.business.carts.created) * 100
      : 0,
    avgOrderValue: analytics.business.averageOrderValue,
    bounceRate: analytics.sessions.size > 0
      ? (analytics.bounceCount / analytics.sessions.size) * 100
      : 0,
  };

  if (existing) {
    Object.assign(existing, snapshot);
  } else {
    analytics.historical.daily.push(snapshot);
    // Keep only last 90 days
    if (analytics.historical.daily.length > 90) {
      analytics.historical.daily.shift();
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 👤 SESSION & USER TRACKING
// ═══════════════════════════════════════════════════════════════

const getOrCreateSession = (req, res) => {
  let sessionId = getCookie(req, '_ba_session');
  let visitorId = getCookie(req, '_ba_visitor');
  const now = Date.now();

  // Create visitor ID if not exists (persists across sessions)
  if (!visitorId) {
    visitorId = generateId();
    res.setHeader('Set-Cookie', `_ba_visitor=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
    analytics.engagement.newUsers++;
  } else if (!analytics.users.has(visitorId)) {
    analytics.engagement.returningUsers++;
  }

  // Create or get session
  let session = sessionId ? analytics.sessions.get(sessionId) : null;

  // Check if session expired (30 min inactivity)
  if (session && now - session.lastActivity > 30 * 60 * 1000) {
    // End previous session
    endSession(sessionId);
    session = null;
  }

  if (!session) {
    sessionId = generateId();
    session = {
      id: sessionId,
      visitorId,
      userId: null,
      startTime: now,
      lastActivity: now,
      pages: [],
      events: [],
      entryPage: req.path,
      referrer: req.headers.referer || 'direct',
      userAgent: parseUserAgent(req.headers['user-agent']),
      ip: getClientIP(req),
      language: getLanguage(req),
    };
    analytics.sessions.set(sessionId, session);

    // Track entry page
    analytics.entryPages[req.path] = (analytics.entryPages[req.path] || 0) + 1;

    // Set session cookie
    res.setHeader('Set-Cookie', `_ba_session=${sessionId}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax`);

    // Track device/browser
    const { type, browser, os } = session.userAgent;
    analytics.devices.types[type] = (analytics.devices.types[type] || 0) + 1;
    analytics.devices.browsers[browser] = (analytics.devices.browsers[browser] || 0) + 1;
    analytics.devices.os[os] = (analytics.devices.os[os] || 0) + 1;

    // Track language
    analytics.geographic.languages[session.language] = (analytics.geographic.languages[session.language] || 0) + 1;
  } else {
    session.lastActivity = now;
  }

  // Update user data
  let user = analytics.users.get(visitorId);
  if (!user) {
    user = {
      visitorId,
      firstSeen: now,
      lastSeen: now,
      sessionCount: 0,
      totalPageViews: 0,
      events: [],
    };
    analytics.users.set(visitorId, user);
  }
  user.lastSeen = now;

  // Track active users
  const today = getToday();
  analytics.engagement.activeUsers.daily.add(visitorId);
  analytics.engagement.activeUsers.weekly.add(visitorId);
  analytics.engagement.activeUsers.monthly.add(visitorId);

  // Real-time tracking
  analytics.realtime.activeVisitors.add(sessionId);

  return { session, sessionId, visitorId, user };
};

const endSession = (sessionId) => {
  const session = analytics.sessions.get(sessionId);
  if (!session) return;

  const duration = Date.now() - session.startTime;
  const pageCount = session.pages.length;

  // Track exit page
  if (session.pages.length > 0) {
    const lastPage = session.pages[session.pages.length - 1];
    analytics.exitPages[lastPage] = (analytics.exitPages[lastPage] || 0) + 1;
  }

  // Track bounce (single page session)
  if (pageCount <= 1) {
    analytics.bounceCount++;
  }

  // Update engagement metrics
  const totalSessions = analytics.sessions.size;
  analytics.engagement.avgSessionDuration =
    ((analytics.engagement.avgSessionDuration * (totalSessions - 1)) + duration) / totalSessions;
  analytics.engagement.avgPagesPerSession =
    ((analytics.engagement.avgPagesPerSession * (totalSessions - 1)) + pageCount) / totalSessions;

  // Store journey
  if (session.pages.length > 1 && analytics.journeys.length < 1000) {
    analytics.journeys.push({
      pages: session.pages.slice(0, 10), // Limit to first 10 pages
      duration,
      converted: session.events.some(e => e.name === 'order_complete'),
    });
  }

  // Clean up
  analytics.realtime.activeVisitors.delete(sessionId);

  // Keep session for a while for analytics, then clean up
  setTimeout(() => {
    analytics.sessions.delete(sessionId);
  }, 60 * 60 * 1000); // Keep for 1 hour
};

// ═══════════════════════════════════════════════════════════════
// 📈 EVENT & FUNNEL TRACKING
// ═══════════════════════════════════════════════════════════════

const trackEvent = (sessionId, eventName, eventData = {}) => {
  const session = analytics.sessions.get(sessionId);
  const now = Date.now();

  const event = {
    name: eventName,
    data: eventData,
    timestamp: new Date().toISOString(),
    sessionId,
  };

  // Store in session
  if (session) {
    session.events.push(event);
  }

  // Store globally (keep last 1000 events)
  if (analytics.events.length >= 1000) analytics.events.shift();
  analytics.events.push(event);

  // Count events
  analytics.eventCounts[eventName] = (analytics.eventCounts[eventName] || 0) + 1;

  // Update funnels
  Object.values(analytics.funnels).forEach(funnel => {
    const stepIndex = funnel.steps.indexOf(eventName);
    if (stepIndex >= 0) {
      const today = getToday();
      if (!funnel.data[today]) {
        funnel.data[today] = funnel.steps.reduce((acc, step) => ({ ...acc, [step]: 0 }), {});
      }
      funnel.data[today][eventName]++;
    }
  });

  // Business event handling
  handleBusinessEvent(eventName, eventData, session);
};

const handleBusinessEvent = (eventName, eventData, session) => {
  const today = getToday();

  switch (eventName) {
    case 'view_product':
      const productId = eventData.productId || 'unknown';
      analytics.business.products.views[productId] =
        (analytics.business.products.views[productId] || 0) + 1;
      break;

    case 'add_to_cart':
      analytics.business.carts.created++;
      if (eventData.productId) {
        analytics.business.products.addedToCart[eventData.productId] =
          (analytics.business.products.addedToCart[eventData.productId] || 0) + 1;
      }
      break;

    case 'remove_from_cart':
      // Track cart modifications
      break;

    case 'checkout':
      // User started checkout
      break;

    case 'order_complete':
      const amount = eventData.amount || 0;
      analytics.business.orders.total++;
      analytics.business.orders.today++;
      analytics.business.orders.completed++;
      analytics.business.revenue.total += amount;
      analytics.business.revenue.today += amount;
      analytics.business.revenue.byDay[today] =
        (analytics.business.revenue.byDay[today] || 0) + amount;
      analytics.business.carts.converted++;

      // Track purchased products
      if (eventData.products) {
        eventData.products.forEach(p => {
          analytics.business.products.purchased[p.id] =
            (analytics.business.products.purchased[p.id] || 0) + (p.quantity || 1);
        });
      }

      // Update average order value
      analytics.business.averageOrderValue =
        analytics.business.revenue.total / analytics.business.orders.completed;
      break;

    case 'order_cancelled':
      analytics.business.orders.cancelled++;
      break;

    case 'cart_abandoned':
      analytics.business.carts.abandoned++;
      break;

    case 'user_signup':
      analytics.engagement.newUsers++;
      break;

    case 'user_login':
      if (session && eventData.userId) {
        session.userId = eventData.userId;
        // Track authenticated user
        if (!analytics.authenticatedUsers.has(eventData.userId)) {
          analytics.authenticatedUsers.set(eventData.userId, {
            userId: eventData.userId,
            firstSeen: Date.now(),
            sessions: [],
            purchases: [],
          });
        }
        analytics.authenticatedUsers.get(eventData.userId).sessions.push(session.id);
      }
      break;
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 ANALYTICS MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

const analyticsMiddleware = (options = {}) => {
  const {
    excludePaths = ['/health', '/status', '/analytics', '/favicon.ico'],
    trackQueryParams = true,
  } = options;

  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(p => req.path.startsWith(p))) {
      return next();
    }

    // Get or create session
    const { session, sessionId } = getOrCreateSession(req, res);

    // Track page view
    const page = trackQueryParams ? req.originalUrl : req.path;
    analytics.pageViews.total++;
    analytics.pageViews.byPage[page] = (analytics.pageViews.byPage[page] || 0) + 1;
    analytics.pageViews.byHour[getHour()]++;

    const today = getToday();
    analytics.pageViews.byDay[today] = (analytics.pageViews.byDay[today] || 0) + 1;

    // Add to session pages
    session.pages.push(req.path);

    // Real-time tracking
    analytics.realtime.currentPages[req.path] =
      (analytics.realtime.currentPages[req.path] || 0) + 1;
    analytics.realtime.lastMinuteRequests++;

    // Attach tracking functions to request
    req.analytics = {
      sessionId,
      session,
      trackEvent: (name, data) => trackEvent(sessionId, name, data),
      setUserId: (userId) => {
        session.userId = userId;
        trackEvent(sessionId, 'user_login', { userId });
      },
    };

    // Auto-track based on path patterns
    autoTrackEvents(req);

    // Clean up on response finish
    res.on('finish', () => {
      // Decrement real-time page count
      setTimeout(() => {
        if (analytics.realtime.currentPages[req.path] > 0) {
          analytics.realtime.currentPages[req.path]--;
        }
      }, 5000);
    });

    next();
  };
};

// Auto-track common events based on URL patterns
const autoTrackEvents = (req) => {
  const path = req.path.toLowerCase();
  const method = req.method;

  // Product views
  if (path.match(/\/products?\/[a-z0-9-]+$/i) && method === 'GET') {
    const productId = path.split('/').pop();
    req.analytics.trackEvent('view_product', { productId });
  }

  // Cart actions
  if (path.includes('/cart')) {
    if (method === 'POST') {
      req.analytics.trackEvent('add_to_cart', req.body || {});
    } else if (method === 'GET') {
      req.analytics.trackEvent('view_cart', {});
    }
  }

  // Checkout
  if (path.includes('/checkout')) {
    req.analytics.trackEvent('checkout', {});
  }

  // Order completion
  if (path.includes('/order') && method === 'POST') {
    // Actual tracking should be done in the route handler with order details
    req.analytics.trackEvent('order_started', {});
  }

  // Auth events
  if (path.includes('/auth/register') || path.includes('/signup')) {
    if (method === 'POST') {
      req.analytics.trackEvent('signup_start', {});
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 📊 MAIN DASHBOARD HTML GENERATOR (Apple-style)
// ═══════════════════════════════════════════════════════════════

const generateDashboard = (appName = 'Business Analytics') => {
  // Gather all metrics
  const totalSessions = analytics.sessions.size;
  const bounceRate = totalSessions > 0
    ? ((analytics.bounceCount / totalSessions) * 100).toFixed(1)
    : 0;

  const topPages = Object.entries(analytics.pageViews.byPage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topProducts = Object.entries(analytics.business.products.views)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const conversionRate = analytics.business.carts.created > 0
    ? ((analytics.business.carts.converted / analytics.business.carts.created) * 100).toFixed(1)
    : 0;

  const abandonmentRate = analytics.business.carts.created > 0
    ? ((analytics.business.carts.abandoned / analytics.business.carts.created) * 100).toFixed(1)
    : 0;

  // Generate fresh insights
  generateInsights();
  analyzeAndPredict();

  const formatCurrency = (amount) => '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

  // Get trend info
  const getTrendClass = (direction) => {
    if (direction === 'up') return 'trend-up';
    if (direction === 'down') return 'trend-down';
    return '';
  };

  const getTrendIcon = (direction) => {
    if (direction === 'up') return '↑';
    if (direction === 'down') return '↓';
    return '→';
  };

  // Build funnel HTML
  const funnelHtml = (() => {
    const funnel = analytics.funnels.checkout;
    const today = getToday();
    const data = funnel.data[today] || {};
    const firstStep = data[funnel.steps[0]] || 0;

    return funnel.steps.map((step, i) => {
      const count = data[step] || 0;
      const percent = firstStep > 0 ? ((count / firstStep) * 100) : 0;
      const prevCount = i > 0 ? (data[funnel.steps[i-1]] || 0) : count;
      const dropoff = i > 0 && prevCount > 0 ? ((1 - count / prevCount) * 100).toFixed(0) : 0;
      const stepName = step.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      return '<div class="funnel-step">' +
        '<div class="funnel-number">' + (i + 1) + '</div>' +
        '<div class="funnel-bar-container">' +
          '<div class="funnel-bar-bg">' +
            '<div class="funnel-bar-fill" style="width: ' + Math.max(percent, 5) + '%; background: var(--accent);">' +
              '<span class="funnel-label">' + stepName + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="funnel-stats">' +
          '<div class="funnel-stat"><div class="funnel-stat-value">' + count + '</div><div class="funnel-stat-label">Users</div></div>' +
          (i > 0 ? '<div class="funnel-stat"><div class="funnel-stat-value" style="color: var(--danger);">-' + dropoff + '%</div><div class="funnel-stat-label">Drop</div></div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  })();

  // Build insights HTML
  const insightsHtml = [...analytics.insights.alerts, ...analytics.insights.anomalies].slice(0, 4).map(item => {
    const isAlert = item.type === 'critical' || item.type === 'warning';
    const cssClass = item.type === 'critical' ? 'insight-critical' : item.type === 'warning' ? 'insight-warning' : 'insight-info';
    const icon = item.type === 'critical' ? '🚨' : item.type === 'warning' ? '⚠️' : '🔍';
    return '<div class="insight-item ' + cssClass + '">' +
      '<div class="insight-header"><span class="insight-icon">' + icon + '</span><span class="insight-title">' + item.title + '</span></div>' +
      '<div class="insight-message">' + item.message + '</div>' +
    '</div>';
  }).join('');

  // Build top pages HTML
  const topPagesHtml = topPages.slice(0, 5).map((page, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return '<div class="list-item">' +
      '<div class="list-info">' +
        '<div class="list-rank ' + rankClass + '">' + (i + 1) + '</div>' +
        '<div><div class="list-text">' + page[0] + '</div></div>' +
      '</div>' +
      '<div class="list-value">' + page[1].toLocaleString() + '</div>' +
    '</div>';
  }).join('') || '<div class="empty-state"><div class="empty-icon">📄</div><p>No page data yet</p></div>';

  // Build top products HTML
  const topProductsHtml = topProducts.map((prod, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return '<div class="list-item">' +
      '<div class="list-info">' +
        '<div class="list-rank ' + rankClass + '">' + (i + 1) + '</div>' +
        '<div><div class="list-text">' + prod[0] + '</div></div>' +
      '</div>' +
      '<div class="list-value">' + prod[1].toLocaleString() + ' views</div>' +
    '</div>';
  }).join('') || '<div class="empty-state"><div class="empty-icon">📦</div><p>No product data yet</p></div>';

  const content = '<header class="header">' +
    '<div class="header-left">' +
      '<h1>📈 Analytics Dashboard</h1>' +
      '<p>Real-time business intelligence overview</p>' +
    '</div>' +
    '<div class="header-right">' +
      '<div class="realtime-badge">' +
        '<span class="pulse"></span>' +
        '<span>' + analytics.realtime.activeVisitors.size + ' active now</span>' +
      '</div>' +
    '</div>' +
  '</header>' +

  '<div class="grid grid-4">' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value" style="color: var(--success);">' + formatCurrency(analytics.business.revenue.total) + '</div>' +
      '<div class="kpi-label">Total Revenue</div>' +
      '<div class="kpi-trend ' + getTrendClass(analytics.predictions.trends.revenue.direction) + '">' +
        getTrendIcon(analytics.predictions.trends.revenue.direction) + ' ' + Math.abs(analytics.predictions.trends.revenue.change || 0) + '%' +
      '</div>' +
    '</div>' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value" style="color: var(--accent);">' + analytics.business.orders.completed + '</div>' +
      '<div class="kpi-label">Orders Completed</div>' +
      '<div class="kpi-trend ' + getTrendClass(analytics.predictions.trends.orders.direction) + '">' +
        getTrendIcon(analytics.predictions.trends.orders.direction) + ' ' + Math.abs(analytics.predictions.trends.orders.change || 0) + '%' +
      '</div>' +
    '</div>' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value">' + conversionRate + '%</div>' +
      '<div class="kpi-label">Conversion Rate</div>' +
      '<span class="badge ' + (parseFloat(conversionRate) >= 3 ? 'badge-success' : parseFloat(conversionRate) >= 1 ? 'badge-warning' : 'badge-danger') + '">' +
        (parseFloat(conversionRate) >= 3 ? 'Good' : parseFloat(conversionRate) >= 1 ? 'Average' : 'Needs Work') +
      '</span>' +
    '</div>' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value">' + analytics.users.size.toLocaleString() + '</div>' +
      '<div class="kpi-label">Unique Visitors</div>' +
      '<div class="kpi-trend ' + getTrendClass(analytics.predictions.trends.traffic.direction) + '">' +
        getTrendIcon(analytics.predictions.trends.traffic.direction) + ' ' + Math.abs(analytics.predictions.trends.traffic.change || 0) + '%' +
      '</div>' +
    '</div>' +
  '</div>' +

  (insightsHtml ? '<div class="card" style="margin-bottom: 20px;">' +
    '<div class="card-header"><span class="card-title">Alerts & Insights</span></div>' +
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">' + insightsHtml + '</div>' +
  '</div>' : '') +

  '<div class="grid grid-2">' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Revenue Trend</span></div>' +
      '<div class="chart-container"><canvas id="revenueChart"></canvas></div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Hourly Traffic</span></div>' +
      '<div class="chart-container"><canvas id="trafficChart"></canvas></div>' +
    '</div>' +
  '</div>' +

  '<div class="grid grid-2">' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Conversion Funnel</span></div>' +
      '<div class="funnel-container">' + funnelHtml + '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Quick Stats</span></div>' +
      '<div class="segment-grid">' +
        '<div class="segment-card"><div class="segment-count">' + totalSessions.toLocaleString() + '</div><div class="segment-label">Sessions</div></div>' +
        '<div class="segment-card"><div class="segment-count">' + bounceRate + '%</div><div class="segment-label">Bounce Rate</div></div>' +
        '<div class="segment-card"><div class="segment-count">' + abandonmentRate + '%</div><div class="segment-label">Cart Abandon</div></div>' +
        '<div class="segment-card"><div class="segment-count">' + analytics.business.carts.created + '</div><div class="segment-label">Carts Created</div></div>' +
        '<div class="segment-card"><div class="segment-count">' + analytics.business.carts.converted + '</div><div class="segment-label">Converted</div></div>' +
        '<div class="segment-card"><div class="segment-count">' + analytics.pageViews.total.toLocaleString() + '</div><div class="segment-label">Page Views</div></div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  '<div class="grid grid-2">' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Top Pages</span></div>' +
      '<div class="scrollable">' + topPagesHtml + '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Top Products</span></div>' +
      '<div class="scrollable">' + topProductsHtml + '</div>' +
    '</div>' +
  '</div>' +

  '<script>' +
    'const isDark = document.documentElement.getAttribute("data-theme") === "dark";' +
    'const textColor = isDark ? "#a1a1a6" : "#6e6e73";' +
    'const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";' +
    'Chart.defaults.color = textColor;' +
    'Chart.defaults.borderColor = gridColor;' +

    'const revenueData = ' + JSON.stringify(Object.entries(analytics.business.revenue.byDay || {}).slice(-7)) + ';' +
    'new Chart(document.getElementById("revenueChart"), {' +
      'type: "line",' +
      'data: {' +
        'labels: revenueData.map(d => d[0]),' +
        'datasets: [{' +
          'label: "Revenue",' +
          'data: revenueData.map(d => d[1]),' +
          'borderColor: "#34c759",' +
          'backgroundColor: "rgba(52, 199, 89, 0.1)",' +
          'fill: true,' +
          'tension: 0.4' +
        '}]' +
      '},' +
      'options: {' +
        'responsive: true,' +
        'maintainAspectRatio: false,' +
        'plugins: { legend: { display: false } },' +
        'scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { display: false }, ticks: { color: textColor } } }' +
      '}' +
    '});' +

    'const hourlyData = ' + JSON.stringify(Array.from({length: 24}, (_, i) => analytics.pageViews.byHour[i] || 0)) + ';' +
    'new Chart(document.getElementById("trafficChart"), {' +
      'type: "bar",' +
      'data: {' +
        'labels: Array.from({length: 24}, (_, i) => i + ":00"),' +
        'datasets: [{' +
          'label: "Page Views",' +
          'data: hourlyData,' +
          'backgroundColor: "#0071e3",' +
          'borderRadius: 4' +
        '}]' +
      '},' +
      'options: {' +
        'responsive: true,' +
        'maintainAspectRatio: false,' +
        'plugins: { legend: { display: false } },' +
        'scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { display: false }, ticks: { color: textColor, maxRotation: 0 } } }' +
      '}' +
    '});' +
  '</script>';

  return generatePageTemplate(appName + ' - Dashboard', content, 'dashboard');
};



// ═══════════════════════════════════════════════════════════════
// 📊 EXECUTIVE DASHBOARD (Apple-style)
// ═══════════════════════════════════════════════════════════════

const generateExecutiveDashboard = (appName = 'Executive Summary') => {
  const formatCurrency = (amount) => '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const conversionRate = analytics.business.carts.created > 0
    ? ((analytics.business.carts.converted / analytics.business.carts.created) * 100).toFixed(1)
    : 0;

  generateInsights();
  analyzeAndPredict();

  const getTrendClass = (direction) => direction === 'up' ? 'trend-up' : direction === 'down' ? 'trend-down' : '';
  const getTrendIcon = (direction) => direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  // Build alerts HTML
  const alertsHtml = analytics.insights.alerts.length > 0 ?
    '<div class="card" style="margin-bottom: 20px;">' +
      '<div class="card-header"><span class="card-title">Requires Attention</span></div>' +
      analytics.insights.alerts.map(alert =>
        '<div class="insight-item ' + (alert.type === 'critical' ? 'insight-critical' : 'insight-warning') + '">' +
          '<div class="insight-header"><span class="insight-icon">' + (alert.type === 'critical' ? '🚨' : '⚠️') + '</span><span class="insight-title">' + alert.title + '</span></div>' +
          '<div class="insight-message">' + alert.message + '</div>' +
        '</div>'
      ).join('') +
    '</div>' : '';

  const content = '<header class="header">' +
    '<div class="header-left">' +
      '<h1>👔 Executive Summary</h1>' +
      '<p>Real-time business performance at a glance</p>' +
    '</div>' +
    '<div class="header-right">' +
      '<div class="realtime-badge">' +
        '<span class="pulse"></span>' +
        '<span>' + analytics.realtime.activeVisitors.size + ' active now</span>' +
      '</div>' +
    '</div>' +
  '</header>' +

  '<div class="grid grid-4">' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value" style="color: var(--success);">' + formatCurrency(analytics.business.revenue.total) + '</div>' +
      '<div class="kpi-label">Total Revenue</div>' +
      '<div class="kpi-trend ' + getTrendClass(analytics.predictions.trends.revenue.direction) + '">' +
        getTrendIcon(analytics.predictions.trends.revenue.direction) + ' ' + Math.abs(analytics.predictions.trends.revenue.change || 0) + '% vs last week' +
      '</div>' +
    '</div>' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value" style="color: var(--accent);">' + analytics.business.orders.completed + '</div>' +
      '<div class="kpi-label">Orders Completed</div>' +
      '<div class="kpi-trend ' + getTrendClass(analytics.predictions.trends.orders.direction) + '">' +
        getTrendIcon(analytics.predictions.trends.orders.direction) + ' ' + Math.abs(analytics.predictions.trends.orders.change || 0) + '% vs last week' +
      '</div>' +
    '</div>' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value">' + conversionRate + '%</div>' +
      '<div class="kpi-label">Conversion Rate</div>' +
      '<span class="badge ' + (parseFloat(conversionRate) >= 3 ? 'badge-success' : parseFloat(conversionRate) >= 1 ? 'badge-warning' : 'badge-danger') + '">' +
        (parseFloat(conversionRate) >= 3 ? 'Good' : parseFloat(conversionRate) >= 1 ? 'Average' : 'Needs Work') +
      '</span>' +
    '</div>' +
    '<div class="card kpi-card">' +
      '<div class="kpi-value">' + analytics.users.size.toLocaleString() + '</div>' +
      '<div class="kpi-label">Unique Visitors</div>' +
      '<div class="kpi-trend ' + getTrendClass(analytics.predictions.trends.traffic.direction) + '">' +
        getTrendIcon(analytics.predictions.trends.traffic.direction) + ' ' + Math.abs(analytics.predictions.trends.traffic.change || 0) + '% vs last week' +
      '</div>' +
    '</div>' +
  '</div>' +

  alertsHtml +

  '<div class="grid grid-2">' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Customer Segments</span></div>' +
      '<div class="segment-grid">' +
        '<div class="segment-card"><div class="segment-icon">💎</div><div class="segment-count">' + (analytics.rfm.segments.champions?.length || 0) + '</div><div class="segment-label">Champions</div></div>' +
        '<div class="segment-card"><div class="segment-icon">⭐</div><div class="segment-count">' + (analytics.ltv.segments.high?.length || 0) + '</div><div class="segment-label">VIP</div></div>' +
        '<div class="segment-card"><div class="segment-icon">⚠️</div><div class="segment-count" style="color: var(--danger);">' + (analytics.rfm.segments.atRisk?.length || 0) + '</div><div class="segment-label">At Risk</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Best Times</span></div>' +
      '<div class="scrollable">' +
        (analytics.predictions.seasonality.peakHours.length > 0 ?
          '<div class="list-item"><div class="list-text">Peak Hours</div><div class="list-value">' + analytics.predictions.seasonality.peakHours.map(function(h) { return h + ':00'; }).join(', ') + '</div></div>' : '') +
        (analytics.predictions.seasonality.peakDays.length > 0 ?
          '<div class="list-item"><div class="list-text">Best Days</div><div class="list-value">' + analytics.predictions.seasonality.peakDays.join(', ') + '</div></div>' : '') +
        '<div class="list-item"><div class="list-text">Avg Session</div><div class="list-value">' + Math.floor(analytics.engagement.avgSessionDuration / 60000) + 'm ' + Math.floor((analytics.engagement.avgSessionDuration % 60000) / 1000) + 's</div></div>' +
        '<div class="list-item"><div class="list-text">Bounce Rate</div><div class="list-value">' + (analytics.sessions.size > 0 ? ((analytics.bounceCount / analytics.sessions.size) * 100).toFixed(1) : 0) + '%</div></div>' +
      '</div>' +
    '</div>' +
  '</div>';

  return generatePageTemplate(appName + ' - Executive', content, 'executive');
};

// ═══════════════════════════════════════════════════════════════
// 📊 VISUAL DASHBOARD GENERATORS (FOR SIDEBAR PAGES)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate suggested actions based on analytics data
 */
const generateSuggestedActions = (pageType) => {
  const actions = [];

  switch(pageType) {
    case 'users':
      if (analytics.engagement.avgSessionDuration < 60000) {
        actions.push({ icon: '⏱', text: 'Improve content engagement', desc: 'Average session is under 1 minute. Consider adding more interactive content.', priority: 'high' });
      }
      if (analytics.sessions.size > 0 && (analytics.bounceCount / analytics.sessions.size) > 0.6) {
        actions.push({ icon: '🚪', text: 'Reduce bounce rate', desc: 'Over 60% of visitors leave immediately. Optimize landing pages.', priority: 'high' });
      }
      if (analytics.devices.types.mobile < analytics.devices.types.desktop * 0.5) {
        actions.push({ icon: '📱', text: 'Improve mobile experience', desc: 'Mobile traffic is low. Ensure responsive design.', priority: 'medium' });
      }
      if (analytics.engagement.returningUsers < analytics.engagement.newUsers * 0.2) {
        actions.push({ icon: '🔄', text: 'Increase retention', desc: 'Few returning users. Consider email campaigns or loyalty programs.', priority: 'high' });
      }
      break;

    case 'business':
      if (analytics.business.carts.abandoned > analytics.business.carts.converted) {
        actions.push({ icon: '🛒', text: 'Recover abandoned carts', desc: 'More carts abandoned than converted. Implement cart recovery emails.', priority: 'high' });
      }
      if (analytics.business.averageOrderValue < 100) {
        actions.push({ icon: '📦', text: 'Increase order value', desc: 'Consider upselling, bundles, or free shipping thresholds.', priority: 'medium' });
      }
      if (analytics.business.orders.cancelled > analytics.business.orders.completed * 0.1) {
        actions.push({ icon: '❌', text: 'Reduce cancellations', desc: 'High cancellation rate. Review checkout flow and delivery times.', priority: 'high' });
      }
      break;

    case 'funnels':
      Object.entries(analytics.funnels).forEach(([key, funnel]) => {
        const steps = funnel.steps;
        const data = funnel.data;
        for (let i = 1; i < steps.length; i++) {
          const prev = data[steps[i-1]] || 0;
          const curr = data[steps[i]] || 0;
          if (prev > 0 && curr / prev < 0.5) {
            actions.push({ icon: '🎯', text: 'Optimize ' + steps[i].replace(/_/g, ' '), desc: '50%+ drop at this step. Review and simplify the process.', priority: 'high' });
            break;
          }
        }
      });
      break;

    case 'segments':
      if (analytics.segments.behavioral.cartAbandoners.length > 10) {
        actions.push({ icon: '🛒', text: 'Target cart abandoners', desc: analytics.segments.behavioral.cartAbandoners.length + ' users with items in cart. Send reminder emails.', priority: 'high' });
      }
      if (analytics.segments.behavioral.oneTimeBuyers.length > analytics.segments.behavioral.repeatBuyers.length * 2) {
        actions.push({ icon: '🔄', text: 'Convert one-time buyers', desc: 'Most customers only buy once. Create post-purchase engagement.', priority: 'medium' });
      }
      break;

    case 'rfm':
      if (analytics.rfm.segments.atRisk.length > 5) {
        actions.push({ icon: '🚨', text: 'Win back at-risk customers', desc: analytics.rfm.segments.atRisk.length + ' valuable customers slipping away. Send win-back offers.', priority: 'high' });
      }
      if (analytics.rfm.segments.potentialLoyalist.length > 10) {
        actions.push({ icon: '⭐', text: 'Nurture potential loyalists', desc: analytics.rfm.segments.potentialLoyalist.length + ' promising customers. Offer exclusive perks.', priority: 'medium' });
      }
      break;

    case 'ltv':
      if (analytics.ltv.segments.churned.length > analytics.ltv.segments.high.length) {
        actions.push({ icon: '💔', text: 'Reduce churn', desc: 'More churned than high-value customers. Implement retention strategies.', priority: 'high' });
      }
      if (analytics.ltv.segments.high.length > 0) {
        actions.push({ icon: '👑', text: 'Reward top customers', desc: 'Create VIP program for ' + analytics.ltv.segments.high.length + ' high-value customers.', priority: 'medium' });
      }
      break;

    case 'predictions':
      if (analytics.predictions.trends.revenue.direction === 'down') {
        actions.push({ icon: '📉', text: 'Address revenue decline', desc: 'Revenue trending downward. Review pricing, marketing, and inventory.', priority: 'high' });
      }
      const highChurnRisks = Array.from(analytics.predictions.churnRisk.values()).filter(r => r.probability > 0.7);
      if (highChurnRisks.length > 0) {
        actions.push({ icon: '⚠️', text: 'Prevent customer churn', desc: highChurnRisks.length + ' customers at high churn risk. Reach out immediately.', priority: 'high' });
      }
      break;
  }

  // Default actions if none specific
  if (actions.length === 0) {
    actions.push({ icon: '✓', text: 'Looking good!', desc: 'No urgent actions needed. Continue monitoring.', priority: 'low' });
  }

  return actions.slice(0, 3);
};

/**
 * Generate base dashboard template with sidebar - Apple-style clean design
 */
const generatePageTemplate = (title, content, activeNav = '') => {
  const suggestedActions = generateSuggestedActions(activeNav);

  const actionsHtml = suggestedActions.map(action =>
    '<div class="action-item priority-' + action.priority + '">' +
    '<div class="action-icon">' + action.icon + '</div>' +
    '<div class="action-content">' +
    '<div class="action-text">' + action.text + '</div>' +
    '<div class="action-desc">' + action.desc + '</div>' +
    '</div>' +
    '<span class="action-arrow">→</span>' +
    '</div>'
  ).join('');

  return '<!DOCTYPE html>' +
'<html lang="en" data-theme="light">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <meta http-equiv="refresh" content="30">' +
'  <title>' + title + '</title>' +
'  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' +
'  <style>' +
'    * { margin: 0; padding: 0; box-sizing: border-box; }' +
'' +
'    /* Light Mode (Default) */' +
'    :root, [data-theme="light"] {' +
'      --bg-primary: #ffffff;' +
'      --bg-secondary: #f5f5f7;' +
'      --bg-tertiary: #e8e8ed;' +
'      --bg-hover: #f0f0f5;' +
'      --text-primary: #1d1d1f;' +
'      --text-secondary: #6e6e73;' +
'      --text-muted: #86868b;' +
'      --accent: #0071e3;' +
'      --accent-light: rgba(0, 113, 227, 0.1);' +
'      --success: #34c759;' +
'      --success-light: rgba(52, 199, 89, 0.1);' +
'      --warning: #ff9500;' +
'      --warning-light: rgba(255, 149, 0, 0.1);' +
'      --danger: #ff3b30;' +
'      --danger-light: rgba(255, 59, 48, 0.1);' +
'      --border: rgba(0, 0, 0, 0.08);' +
'      --shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.04);' +
'      --shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06);' +
'    }' +
'' +
'    /* Dark Mode */' +
'    [data-theme="dark"] {' +
'      --bg-primary: #000000;' +
'      --bg-secondary: #1c1c1e;' +
'      --bg-tertiary: #2c2c2e;' +
'      --bg-hover: #3a3a3c;' +
'      --text-primary: #f5f5f7;' +
'      --text-secondary: #a1a1a6;' +
'      --text-muted: #6e6e73;' +
'      --accent: #0a84ff;' +
'      --accent-light: rgba(10, 132, 255, 0.15);' +
'      --success: #30d158;' +
'      --success-light: rgba(48, 209, 88, 0.15);' +
'      --warning: #ff9f0a;' +
'      --warning-light: rgba(255, 159, 10, 0.15);' +
'      --danger: #ff453a;' +
'      --danger-light: rgba(255, 69, 58, 0.15);' +
'      --border: rgba(255, 255, 255, 0.1);' +
'      --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);' +
'      --shadow-hover: 0 4px 16px rgba(0, 0, 0, 0.4);' +
'    }' +
'' +
'    body {' +
'      font-family: -apple-system, BlinkMacSystemFont, \'SF Pro Display\', \'SF Pro Text\', \'Helvetica Neue\', sans-serif;' +
'      background: var(--bg-primary);' +
'      color: var(--text-primary);' +
'      min-height: 100vh;' +
'      line-height: 1.47059;' +
'      font-size: 17px;' +
'      -webkit-font-smoothing: antialiased;' +
'      transition: background 0.3s, color 0.3s;' +
'    }' +
'' +
'    .dashboard { display: flex; min-height: 100vh; }' +
'' +
'    /* Sidebar */' +
'    .sidebar {' +
'      width: 280px;' +
'      background: var(--bg-secondary);' +
'      border-right: 1px solid var(--border);' +
'      padding: 24px 16px;' +
'      position: fixed;' +
'      height: 100vh;' +
'      overflow-y: auto;' +
'      transition: background 0.3s, border 0.3s;' +
'    }' +
'' +
'    .sidebar::-webkit-scrollbar { width: 0; }' +
'' +
'    .logo {' +
'      font-size: 21px;' +
'      font-weight: 600;' +
'      margin-bottom: 32px;' +
'      padding: 0 12px;' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 12px;' +
'      letter-spacing: -0.02em;' +
'    }' +
'' +
'    .logo-icon {' +
'      width: 36px;' +
'      height: 36px;' +
'      background: var(--accent);' +
'      border-radius: 10px;' +
'      display: flex;' +
'      align-items: center;' +
'      justify-content: center;' +
'      font-size: 18px;' +
'    }' +
'' +
'    .nav-section { margin-bottom: 28px; }' +
'' +
'    .nav-title {' +
'      font-size: 12px;' +
'      font-weight: 600;' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.04em;' +
'      color: var(--text-muted);' +
'      margin-bottom: 8px;' +
'      padding: 0 12px;' +
'    }' +
'' +
'    .nav-item {' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 12px;' +
'      padding: 10px 12px;' +
'      border-radius: 10px;' +
'      color: var(--text-secondary);' +
'      cursor: pointer;' +
'      transition: all 0.2s ease;' +
'      margin-bottom: 2px;' +
'      text-decoration: none;' +
'      font-size: 15px;' +
'      font-weight: 500;' +
'    }' +
'' +
'    .nav-item:hover {' +
'      background: var(--bg-hover);' +
'      color: var(--text-primary);' +
'    }' +
'' +
'    .nav-item.active {' +
'      background: var(--accent-light);' +
'      color: var(--accent);' +
'      font-weight: 600;' +
'    }' +
'' +
'    .nav-icon { width: 20px; text-align: center; font-size: 16px; }' +
'' +
'    /* Theme Toggle */' +
'    .theme-toggle {' +
'      display: flex;' +
'      align-items: center;' +
'      justify-content: space-between;' +
'      padding: 12px;' +
'      margin-top: 16px;' +
'      border-top: 1px solid var(--border);' +
'    }' +
'' +
'    .theme-toggle-label {' +
'      font-size: 14px;' +
'      color: var(--text-secondary);' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 8px;' +
'    }' +
'' +
'    .toggle-switch {' +
'      width: 51px;' +
'      height: 31px;' +
'      background: var(--bg-tertiary);' +
'      border-radius: 16px;' +
'      position: relative;' +
'      cursor: pointer;' +
'      transition: background 0.3s;' +
'    }' +
'' +
'    .toggle-switch.active {' +
'      background: var(--accent);' +
'    }' +
'' +
'    .toggle-switch::after {' +
'      content: \'\';' +
'      position: absolute;' +
'      width: 27px;' +
'      height: 27px;' +
'      background: white;' +
'      border-radius: 50%;' +
'      top: 2px;' +
'      left: 2px;' +
'      transition: transform 0.3s;' +
'      box-shadow: 0 2px 4px rgba(0,0,0,0.2);' +
'    }' +
'' +
'    .toggle-switch.active::after {' +
'      transform: translateX(20px);' +
'    }' +
'' +
'    /* Main Content */' +
'    .main {' +
'      flex: 1;' +
'      margin-left: 280px;' +
'      padding: 32px 40px;' +
'      max-width: 1600px;' +
'    }' +
'' +
'    .header {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: flex-start;' +
'      margin-bottom: 32px;' +
'    }' +
'' +
'    .header-left h1 {' +
'      font-size: 34px;' +
'      font-weight: 700;' +
'      margin-bottom: 4px;' +
'      letter-spacing: -0.02em;' +
'    }' +
'' +
'    .header-left p {' +
'      color: var(--text-secondary);' +
'      font-size: 17px;' +
'    }' +
'' +
'    .header-right {' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 12px;' +
'    }' +
'' +
'    .realtime-badge {' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 8px;' +
'      background: var(--success-light);' +
'      padding: 8px 16px;' +
'      border-radius: 20px;' +
'      font-size: 14px;' +
'      font-weight: 500;' +
'      color: var(--success);' +
'    }' +
'' +
'    .pulse {' +
'      width: 8px;' +
'      height: 8px;' +
'      background: var(--success);' +
'      border-radius: 50%;' +
'      animation: pulse 2s infinite;' +
'    }' +
'' +
'    @keyframes pulse {' +
'      0%, 100% { opacity: 1; transform: scale(1); }' +
'      50% { opacity: 0.5; transform: scale(1.3); }' +
'    }' +
'' +
'    /* Suggested Actions */' +
'    .actions-bar {' +
'      background: var(--bg-secondary);' +
'      border-radius: 16px;' +
'      padding: 20px 24px;' +
'      margin-bottom: 28px;' +
'      border: 1px solid var(--border);' +
'    }' +
'' +
'    .actions-title {' +
'      font-size: 13px;' +
'      font-weight: 600;' +
'      color: var(--text-muted);' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.04em;' +
'      margin-bottom: 16px;' +
'    }' +
'' +
'    .actions-list {' +
'      display: flex;' +
'      gap: 16px;' +
'      flex-wrap: wrap;' +
'    }' +
'' +
'    .action-item {' +
'      flex: 1;' +
'      min-width: 260px;' +
'      background: var(--bg-primary);' +
'      border-radius: 12px;' +
'      padding: 16px 20px;' +
'      display: flex;' +
'      align-items: flex-start;' +
'      gap: 14px;' +
'      cursor: pointer;' +
'      transition: all 0.2s;' +
'      border: 1px solid var(--border);' +
'    }' +
'' +
'    .action-item:hover {' +
'      box-shadow: var(--shadow-hover);' +
'      transform: translateY(-2px);' +
'    }' +
'' +
'    .action-icon {' +
'      width: 40px;' +
'      height: 40px;' +
'      border-radius: 10px;' +
'      display: flex;' +
'      align-items: center;' +
'      justify-content: center;' +
'      font-size: 18px;' +
'      flex-shrink: 0;' +
'    }' +
'' +
'    .action-item.priority-high .action-icon { background: var(--danger-light); }' +
'    .action-item.priority-medium .action-icon { background: var(--warning-light); }' +
'    .action-item.priority-low .action-icon { background: var(--success-light); }' +
'' +
'    .action-content { flex: 1; }' +
'' +
'    .action-text {' +
'      font-size: 15px;' +
'      font-weight: 600;' +
'      color: var(--text-primary);' +
'      margin-bottom: 4px;' +
'    }' +
'' +
'    .action-desc {' +
'      font-size: 13px;' +
'      color: var(--text-secondary);' +
'      line-height: 1.4;' +
'    }' +
'' +
'    .action-arrow {' +
'      color: var(--text-muted);' +
'      font-size: 18px;' +
'      margin-left: auto;' +
'      align-self: center;' +
'    }' +
'' +
'    /* Grid */' +
'    .grid { display: grid; gap: 20px; margin-bottom: 24px; }' +
'    .grid-4 { grid-template-columns: repeat(4, 1fr); }' +
'    .grid-3 { grid-template-columns: repeat(3, 1fr); }' +
'    .grid-2 { grid-template-columns: repeat(2, 1fr); }' +
'    .grid-1-2 { grid-template-columns: 1fr 2fr; }' +
'    .grid-2-1 { grid-template-columns: 2fr 1fr; }' +
'' +
'    @media (max-width: 1400px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }' +
'    @media (max-width: 1024px) {' +
'      .grid-2, .grid-3, .grid-1-2, .grid-2-1 { grid-template-columns: 1fr; }' +
'      .sidebar { display: none; }' +
'      .main { margin-left: 0; padding: 24px 16px; }' +
'      .actions-list { flex-direction: column; }' +
'      .action-item { min-width: 100%; }' +
'    }' +
'' +
'    /* Cards */' +
'    .card {' +
'      background: var(--bg-secondary);' +
'      border-radius: 16px;' +
'      padding: 24px;' +
'      border: 1px solid var(--border);' +
'      transition: all 0.3s;' +
'    }' +
'' +
'    .card:hover {' +
'      box-shadow: var(--shadow);' +
'    }' +
'' +
'    .card-header {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      margin-bottom: 20px;' +
'    }' +
'' +
'    .card-title {' +
'      font-size: 13px;' +
'      font-weight: 600;' +
'      color: var(--text-muted);' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.04em;' +
'    }' +
'' +
'    /* KPI Cards */' +
'    .kpi-card { position: relative; overflow: hidden; }' +
'' +
'    .kpi-value {' +
'      font-size: 34px;' +
'      font-weight: 700;' +
'      margin-bottom: 4px;' +
'      letter-spacing: -0.02em;' +
'      color: var(--text-primary);' +
'    }' +
'' +
'    .kpi-label {' +
'      color: var(--text-secondary);' +
'      font-size: 14px;' +
'      font-weight: 500;' +
'    }' +
'' +
'    .kpi-trend {' +
'      display: inline-flex;' +
'      align-items: center;' +
'      gap: 4px;' +
'      font-size: 13px;' +
'      padding: 4px 10px;' +
'      border-radius: 6px;' +
'      font-weight: 600;' +
'      margin-top: 8px;' +
'    }' +
'' +
'    .trend-up { background: var(--success-light); color: var(--success); }' +
'    .trend-down { background: var(--danger-light); color: var(--danger); }' +
'' +
'    /* Charts */' +
'    .chart-container { position: relative; height: 280px; width: 100%; }' +
'    .chart-container-sm { height: 180px; }' +
'' +
'    /* Progress */' +
'    .progress-item { margin-bottom: 16px; }' +
'    .progress-header { display: flex; justify-content: space-between; margin-bottom: 8px; }' +
'    .progress-label { font-size: 14px; color: var(--text-primary); font-weight: 500; }' +
'    .progress-value { font-size: 14px; font-weight: 600; }' +
'    .progress-bar { height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }' +
'    .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }' +
'' +
'    /* Lists */' +
'    .list-item {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      padding: 14px 16px;' +
'      background: var(--bg-primary);' +
'      border-radius: 12px;' +
'      margin-bottom: 8px;' +
'      transition: all 0.2s;' +
'    }' +
'' +
'    .list-item:hover { background: var(--bg-hover); }' +
'    .list-item:last-child { margin-bottom: 0; }' +
'    .list-info { display: flex; align-items: center; gap: 12px; }' +
'' +
'    .list-rank {' +
'      width: 28px;' +
'      height: 28px;' +
'      border-radius: 8px;' +
'      display: flex;' +
'      align-items: center;' +
'      justify-content: center;' +
'      font-size: 12px;' +
'      font-weight: 700;' +
'      background: var(--bg-tertiary);' +
'      color: var(--text-secondary);' +
'    }' +
'' +
'    .list-rank.gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; }' +
'    .list-rank.silver { background: linear-gradient(135deg, #C0C0C0, #808080); color: #000; }' +
'    .list-rank.bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); color: #fff; }' +
'' +
'    .list-text { font-size: 15px; color: var(--text-primary); font-weight: 500; }' +
'    .list-subtext { font-size: 12px; color: var(--text-muted); margin-top: 2px; }' +
'    .list-value { font-weight: 600; color: var(--accent); font-size: 15px; }' +
'' +
'    /* Segments */' +
'    .segment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }' +
'' +
'    .segment-card {' +
'      background: var(--bg-primary);' +
'      border-radius: 14px;' +
'      padding: 20px;' +
'      text-align: center;' +
'      border: 1px solid var(--border);' +
'      transition: all 0.3s;' +
'    }' +
'' +
'    .segment-card:hover {' +
'      transform: translateY(-3px);' +
'      box-shadow: var(--shadow-hover);' +
'      border-color: var(--accent);' +
'    }' +
'' +
'    .segment-icon { font-size: 28px; margin-bottom: 8px; }' +
'    .segment-count { font-size: 28px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }' +
'    .segment-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; font-weight: 600; }' +
'    .segment-desc { font-size: 12px; color: var(--text-secondary); margin-top: 8px; line-height: 1.4; }' +
'' +
'    /* Tables */' +
'    .data-table { width: 100%; border-collapse: collapse; }' +
'    .data-table th, .data-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--border); }' +
'    .data-table th { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; background: var(--bg-primary); }' +
'    .data-table td { font-size: 14px; }' +
'    .data-table tr:hover td { background: var(--bg-hover); }' +
'' +
'    /* Insights */' +
'    .insight-item {' +
'      padding: 16px 20px;' +
'      background: var(--bg-primary);' +
'      border-radius: 12px;' +
'      margin-bottom: 12px;' +
'      border-left: 4px solid;' +
'      transition: all 0.2s;' +
'    }' +
'' +
'    .insight-item:hover { transform: translateX(4px); }' +
'' +
'    .insight-critical { border-color: var(--danger); background: var(--danger-light); }' +
'    .insight-warning { border-color: var(--warning); background: var(--warning-light); }' +
'    .insight-success { border-color: var(--success); background: var(--success-light); }' +
'    .insight-info { border-color: var(--accent); background: var(--accent-light); }' +
'' +
'    .insight-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }' +
'    .insight-icon { font-size: 16px; }' +
'    .insight-title { font-weight: 600; font-size: 15px; }' +
'    .insight-message { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }' +
'' +
'    /* Badges */' +
'    .badge {' +
'      display: inline-flex;' +
'      align-items: center;' +
'      gap: 4px;' +
'      padding: 4px 12px;' +
'      border-radius: 100px;' +
'      font-size: 12px;' +
'      font-weight: 600;' +
'    }' +
'' +
'    .badge-success { background: var(--success-light); color: var(--success); }' +
'    .badge-warning { background: var(--warning-light); color: var(--warning); }' +
'    .badge-danger { background: var(--danger-light); color: var(--danger); }' +
'    .badge-info { background: var(--accent-light); color: var(--accent); }' +
'' +
'    /* Funnels */' +
'    .funnel-container { padding: 16px 0; }' +
'' +
'    .funnel-step { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }' +
'' +
'    .funnel-number {' +
'      width: 36px;' +
'      height: 36px;' +
'      background: var(--bg-tertiary);' +
'      border-radius: 50%;' +
'      display: flex;' +
'      align-items: center;' +
'      justify-content: center;' +
'      font-size: 14px;' +
'      font-weight: 700;' +
'      flex-shrink: 0;' +
'      color: var(--text-secondary);' +
'    }' +
'' +
'    .funnel-bar-container { flex: 1; }' +
'' +
'    .funnel-bar-bg {' +
'      height: 44px;' +
'      background: var(--bg-tertiary);' +
'      border-radius: 10px;' +
'      overflow: hidden;' +
'      position: relative;' +
'    }' +
'' +
'    .funnel-bar-fill {' +
'      height: 100%;' +
'      border-radius: 10px;' +
'      display: flex;' +
'      align-items: center;' +
'      padding-left: 16px;' +
'      transition: width 0.5s ease;' +
'    }' +
'' +
'    .funnel-label { font-size: 14px; color: #fff; font-weight: 600; white-space: nowrap; }' +
'' +
'    .funnel-stats { display: flex; gap: 24px; width: 200px; justify-content: flex-end; flex-shrink: 0; }' +
'    .funnel-stat { text-align: right; }' +
'    .funnel-stat-value { font-size: 16px; font-weight: 700; }' +
'    .funnel-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }' +
'' +
'    /* Empty State */' +
'    .empty-state { text-align: center; padding: 48px 24px; color: var(--text-muted); }' +
'    .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }' +
'    .empty-title { font-size: 20px; margin-bottom: 8px; color: var(--text-secondary); font-weight: 600; }' +
'' +
'    /* Scrollable */' +
'    .scrollable { max-height: 380px; overflow-y: auto; }' +
'    .scrollable::-webkit-scrollbar { width: 6px; }' +
'    .scrollable::-webkit-scrollbar-track { background: transparent; }' +
'    .scrollable::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 3px; }' +
'' +
'    /* Footer */' +
'    .footer {' +
'      text-align: center;' +
'      padding: 32px;' +
'      color: var(--text-muted);' +
'      font-size: 13px;' +
'      border-top: 1px solid var(--border);' +
'      margin-top: 40px;' +
'    }' +
'' +
'    .footer a { color: var(--accent); text-decoration: none; }' +
'    .footer a:hover { text-decoration: underline; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="dashboard">' +
'    <aside class="sidebar">' +
'      <div class="logo">' +
'        <div class="logo-icon">📊</div>' +
'        <span>Analytics</span>' +
'      </div>' +
'      <nav>' +
'        <div class="nav-section">' +
'          <div class="nav-title">Overview</div>' +
'          <a href="/analytics/dashboard" class="nav-item ' + (activeNav === 'dashboard' ? 'active' : '') + '"><span class="nav-icon">📈</span> Dashboard</a>' +
'          <a href="/analytics/executive" class="nav-item ' + (activeNav === 'executive' ? 'active' : '') + '"><span class="nav-icon">👔</span> Executive</a>' +
'        </div>' +
'        <div class="nav-section">' +
'          <div class="nav-title">Analytics</div>' +
'          <a href="/analytics/users" class="nav-item ' + (activeNav === 'users' ? 'active' : '') + '"><span class="nav-icon">👥</span> Users</a>' +
'          <a href="/analytics/business" class="nav-item ' + (activeNav === 'business' ? 'active' : '') + '"><span class="nav-icon">💰</span> Revenue</a>' +
'          <a href="/analytics/funnels" class="nav-item ' + (activeNav === 'funnels' ? 'active' : '') + '"><span class="nav-icon">🎯</span> Funnels</a>' +
'        </div>' +
'        <div class="nav-section">' +
'          <div class="nav-title">Advanced</div>' +
'          <a href="/analytics/segments" class="nav-item ' + (activeNav === 'segments' ? 'active' : '') + '"><span class="nav-icon">🧩</span> Segments</a>' +
'          <a href="/analytics/cohorts" class="nav-item ' + (activeNav === 'cohorts' ? 'active' : '') + '"><span class="nav-icon">📅</span> Cohorts</a>' +
'          <a href="/analytics/rfm" class="nav-item ' + (activeNav === 'rfm' ? 'active' : '') + '"><span class="nav-icon">⭐</span> RFM</a>' +
'          <a href="/analytics/ltv" class="nav-item ' + (activeNav === 'ltv' ? 'active' : '') + '"><span class="nav-icon">💎</span> LTV</a>' +
'        </div>' +
'        <div class="nav-section">' +
'          <div class="nav-title">Intelligence</div>' +
'          <a href="/analytics/predictions" class="nav-item ' + (activeNav === 'predictions' ? 'active' : '') + '"><span class="nav-icon">🔮</span> Predictions</a>' +
'          <a href="/analytics/insights" class="nav-item ' + (activeNav === 'insights' ? 'active' : '') + '"><span class="nav-icon">💡</span> Insights</a>' +
'        </div>' +
'      </nav>' +
'      <div class="theme-toggle">' +
'        <span class="theme-toggle-label">' +
'          <span>☀️</span> Light Mode' +
'        </span>' +
'        <div class="toggle-switch" id="themeToggle" onclick="toggleTheme()"></div>' +
'      </div>' +
'    </aside>' +
'    <main class="main">' +
'      ' + content + '' +
'' +
'      <div class="actions-bar">' +
'        <div class="actions-title">Suggested Actions</div>' +
'        <div class="actions-list">' +
'          ' + actionsHtml + '' +
'        </div>' +
'      </div>' +
'' +
'      <footer class="footer">' +
'        <p>Last updated: ' + new Date().toLocaleString() + ' · Auto-refreshes every 30 seconds</p>' +
'        <p style="margin-top: 8px;"><a href="/analytics/dashboard">← Back to Dashboard</a></p>' +
'      </footer>' +
'    </main>' +
'  </div>' +
'' +
'  <script>' +
'    // Theme toggle functionality' +
'    function toggleTheme() {' +
'      const html = document.documentElement;' +
'      const toggle = document.getElementById(\'themeToggle\');' +
'      const label = document.querySelector(\'.theme-toggle-label\');' +
'' +
'      if (html.getAttribute(\'data-theme\') === \'dark\') {' +
'        html.setAttribute(\'data-theme\', \'light\');' +
'        toggle.classList.remove(\'active\');' +
'        label.innerHTML = \'<span>☀️</span> Light Mode\';' +
'        localStorage.setItem(\'theme\', \'light\');' +
'      } else {' +
'        html.setAttribute(\'data-theme\', \'dark\');' +
'        toggle.classList.add(\'active\');' +
'        label.innerHTML = \'<span>🌙</span> Dark Mode\';' +
'        localStorage.setItem(\'theme\', \'dark\');' +
'      }' +
'' +
'      // Update chart colors' +
'      updateChartColors();' +
'    }' +
'' +
'    // Load saved theme' +
'    document.addEventListener(\'DOMContentLoaded\', () => {' +
'      const savedTheme = localStorage.getItem(\'theme\') || \'light\';' +
'      const html = document.documentElement;' +
'      const toggle = document.getElementById(\'themeToggle\');' +
'      const label = document.querySelector(\'.theme-toggle-label\');' +
'' +
'      html.setAttribute(\'data-theme\', savedTheme);' +
'      if (savedTheme === \'dark\') {' +
'        toggle.classList.add(\'active\');' +
'        label.innerHTML = \'<span>🌙</span> Dark Mode\';' +
'      }' +
'    });' +
'' +
'    // Update chart colors based on theme' +
'    function updateChartColors() {' +
'      const isDark = document.documentElement.getAttribute(\'data-theme\') === \'dark\';' +
'      const textColor = isDark ? \'#a1a1a6\' : \'#6e6e73\';' +
'      const gridColor = isDark ? \'rgba(255,255,255,0.06)\' : \'rgba(0,0,0,0.06)\';' +
'' +
'      Chart.defaults.color = textColor;' +
'      Chart.defaults.borderColor = gridColor;' +
'' +
'      // Redraw all charts' +
'      Object.values(Chart.instances).forEach(chart => {' +
'        if (chart.options.scales?.x) {' +
'          chart.options.scales.x.ticks.color = textColor;' +
'          chart.options.scales.x.grid.color = gridColor;' +
'        }' +
'        if (chart.options.scales?.y) {' +
'          chart.options.scales.y.ticks.color = textColor;' +
'          chart.options.scales.y.grid.color = gridColor;' +
'        }' +
'        chart.update();' +
'      });' +
'    }' +
'' +
'    // Initialize chart defaults' +
'    const isDark = document.documentElement.getAttribute(\'data-theme\') === \'dark\';' +
'    Chart.defaults.color = isDark ? \'#a1a1a6\' : \'#6e6e73\';' +
'    Chart.defaults.borderColor = isDark ? \'rgba(255,255,255,0.06)\' : \'rgba(0,0,0,0.06)\';' +
'  </script>' +
'</body>' +
'</html>';
};

/**
 * Generate User Analytics Dashboard
 */
const generateUsersDashboard = (appName) => {
  const totalVisitors = analytics.users.size;
  const totalSessions = analytics.sessions.size;
  const bounceRate = totalSessions > 0 ? ((analytics.bounceCount / totalSessions) * 100).toFixed(1) : 0;

  const deviceData = analytics.devices.types;
  const browserEntries = Object.entries(analytics.devices.browsers).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const osEntries = Object.entries(analytics.devices.os).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const languageEntries = Object.entries(analytics.geographic.languages).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>👥 User Analytics</h1>
        <p>Understand your audience and their behavior</p>
      </div>
      <div class="header-right">
        <div class="realtime-badge">
          <span class="pulse"></span>
          <span>${analytics.realtime.activeVisitors.size} active now</span>
        </div>
      </div>
    </header>

    <div class="grid grid-4">
      <div class="card kpi-card kpi-blue">
        <div class="kpi-icon" style="background: rgba(96, 165, 250, 0.2);">👥</div>
        <div class="kpi-value">${totalVisitors.toLocaleString()}</div>
        <div class="kpi-label">Total Visitors</div>
      </div>
      <div class="card kpi-card kpi-green">
        <div class="kpi-icon" style="background: rgba(52, 211, 153, 0.2);">🔄</div>
        <div class="kpi-value">${totalSessions.toLocaleString()}</div>
        <div class="kpi-label">Total Sessions</div>
      </div>
      <div class="card kpi-card kpi-purple">
        <div class="kpi-icon" style="background: rgba(167, 139, 250, 0.2);">⏱️</div>
        <div class="kpi-value">${Math.floor(analytics.engagement.avgSessionDuration / 60000)}m ${Math.floor((analytics.engagement.avgSessionDuration % 60000) / 1000)}s</div>
        <div class="kpi-label">Avg Session Duration</div>
      </div>
      <div class="card kpi-card kpi-yellow">
        <div class="kpi-icon" style="background: rgba(251, 191, 36, 0.2);">📊</div>
        <div class="kpi-value">${bounceRate}%</div>
        <div class="kpi-label">Bounce Rate</div>
      </div>
    </div>

    <div class="grid grid-3">
      <div class="card kpi-card kpi-green">
        <div class="kpi-value" style="color: var(--accent-green);">${analytics.engagement.newUsers.toLocaleString()}</div>
        <div class="kpi-label">New Users</div>
      </div>
      <div class="card kpi-card kpi-blue">
        <div class="kpi-value" style="color: var(--accent-blue);">${analytics.engagement.returningUsers.toLocaleString()}</div>
        <div class="kpi-label">Returning Users</div>
      </div>
      <div class="card kpi-card kpi-purple">
        <div class="kpi-value" style="color: var(--accent-purple);">${analytics.engagement.avgPagesPerSession.toFixed(1)}</div>
        <div class="kpi-label">Pages per Session</div>
      </div>
    </div>

    <div class="grid grid-3">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📱 Device Types</span>
        </div>
        <div class="chart-container-sm">
          <canvas id="deviceChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">🌐 Browsers</span>
        </div>
        <div class="scrollable">
          ${browserEntries.length > 0 ? browserEntries.map(([browser, count], i) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <span class="list-text">${browser}</span>
              </div>
              <span class="list-value">${count.toLocaleString()}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">🌐</div><p>No browser data yet</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">💻 Operating Systems</span>
        </div>
        <div class="scrollable">
          ${osEntries.length > 0 ? osEntries.map(([os, count], i) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <span class="list-text">${os}</span>
              </div>
              <span class="list-value">${count.toLocaleString()}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">💻</div><p>No OS data yet</p></div>'}
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🌍 Languages</span>
        </div>
        <div class="scrollable">
          ${languageEntries.length > 0 ? languageEntries.map(([lang, count], i) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <span class="list-text">${lang.toUpperCase()}</span>
              </div>
              <span class="list-value">${count.toLocaleString()}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">🌍</div><p>No language data yet</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">📈 Active Users</span>
        </div>
        <div class="grid grid-3" style="margin-top: 1rem;">
          <div class="segment-card">
            <div class="segment-count" style="color: var(--accent-green);">${analytics.engagement.activeUsers.daily.size}</div>
            <div class="segment-label">Daily Active</div>
          </div>
          <div class="segment-card">
            <div class="segment-count" style="color: var(--accent-blue);">${analytics.engagement.activeUsers.weekly.size}</div>
            <div class="segment-label">Weekly Active</div>
          </div>
          <div class="segment-card">
            <div class="segment-count" style="color: var(--accent-purple);">${analytics.engagement.activeUsers.monthly.size}</div>
            <div class="segment-label">Monthly Active</div>
          </div>
        </div>
      </div>
    </div>

    <script>
      new Chart(document.getElementById('deviceChart'), {
        type: 'doughnut',
        data: {
          labels: ['Desktop', 'Mobile', 'Tablet'],
          datasets: [{
            data: [${deviceData.desktop || 0}, ${deviceData.mobile || 0}, ${deviceData.tablet || 0}],
            backgroundColor: ['#60a5fa', '#34d399', '#a78bfa'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } } },
          cutout: '60%'
        }
      });
    </script>
  `;

  return generatePageTemplate(`${appName} - User Analytics`, content, 'users');
};

/**
 * Generate Business/Revenue Dashboard
 */
const generateBusinessDashboard = (appName) => {
  const formatCurrency = (amount) => '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const conversionRate = analytics.business.carts.created > 0
    ? ((analytics.business.carts.converted / analytics.business.carts.created) * 100).toFixed(1)
    : 0;
  const abandonmentRate = analytics.business.carts.created > 0
    ? ((analytics.business.carts.abandoned / analytics.business.carts.created) * 100).toFixed(1)
    : 0;

  const topProductsByViews = Object.entries(analytics.business.products.views).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topProductsByCart = Object.entries(analytics.business.products.addedToCart).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topProductsByPurchase = Object.entries(analytics.business.products.purchased).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const revenueByDay = Object.entries(analytics.business.revenue.byDay || {}).slice(-7);

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>💰 Revenue Analytics</h1>
        <p>Track your business performance and revenue metrics</p>
      </div>
    </header>

    <div class="grid grid-4">
      <div class="card kpi-card kpi-green">
        <div class="kpi-icon" style="background: rgba(52, 211, 153, 0.2);">💵</div>
        <div class="kpi-value" style="color: var(--accent-green);">${formatCurrency(analytics.business.revenue.total)}</div>
        <div class="kpi-label">Total Revenue</div>
      </div>
      <div class="card kpi-card kpi-blue">
        <div class="kpi-icon" style="background: rgba(96, 165, 250, 0.2);">📦</div>
        <div class="kpi-value">${analytics.business.orders.total.toLocaleString()}</div>
        <div class="kpi-label">Total Orders</div>
      </div>
      <div class="card kpi-card kpi-purple">
        <div class="kpi-icon" style="background: rgba(167, 139, 250, 0.2);">📊</div>
        <div class="kpi-value">${formatCurrency(analytics.business.averageOrderValue)}</div>
        <div class="kpi-label">Avg Order Value</div>
      </div>
      <div class="card kpi-card kpi-cyan">
        <div class="kpi-icon" style="background: rgba(34, 211, 238, 0.2);">🎯</div>
        <div class="kpi-value">${conversionRate}%</div>
        <div class="kpi-label">Conversion Rate</div>
      </div>
    </div>

    <div class="grid grid-4">
      <div class="card kpi-card kpi-green">
        <div class="kpi-value" style="color: var(--accent-green);">${formatCurrency(analytics.business.revenue.today)}</div>
        <div class="kpi-label">Today's Revenue</div>
      </div>
      <div class="card kpi-card kpi-blue">
        <div class="kpi-value">${analytics.business.orders.completed}</div>
        <div class="kpi-label">Completed Orders</div>
      </div>
      <div class="card kpi-card kpi-yellow">
        <div class="kpi-value">${analytics.business.orders.pending}</div>
        <div class="kpi-label">Pending Orders</div>
      </div>
      <div class="card kpi-card kpi-red">
        <div class="kpi-value">${analytics.business.orders.cancelled}</div>
        <div class="kpi-label">Cancelled Orders</div>
      </div>
    </div>

    <div class="grid grid-3">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🛒 Cart Analytics</span>
        </div>
        <div class="segment-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="segment-card">
            <div class="segment-count" style="color: var(--accent-blue);">${analytics.business.carts.created}</div>
            <div class="segment-label">Carts Created</div>
          </div>
          <div class="segment-card">
            <div class="segment-count" style="color: var(--accent-green);">${analytics.business.carts.converted}</div>
            <div class="segment-label">Converted</div>
          </div>
          <div class="segment-card">
            <div class="segment-count" style="color: var(--accent-red);">${analytics.business.carts.abandoned}</div>
            <div class="segment-label">Abandoned</div>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <div class="progress-item">
            <div class="progress-header">
              <span class="progress-label">Abandonment Rate</span>
              <span class="progress-value" style="color: var(--accent-red);">${abandonmentRate}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${abandonmentRate}%; background: var(--accent-red);"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="grid-column: span 2;">
        <div class="card-header">
          <span class="card-title">📈 Revenue Trend (Last 7 Days)</span>
        </div>
        <div class="chart-container">
          <canvas id="revenueChart"></canvas>
        </div>
      </div>
    </div>

    <div class="grid grid-3">
      <div class="card">
        <div class="card-header">
          <span class="card-title">👁️ Top Viewed Products</span>
        </div>
        <div class="scrollable">
          ${topProductsByViews.length > 0 ? topProductsByViews.map(([product, views], i) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <span class="list-text">${product}</span>
              </div>
              <span class="list-value">${views.toLocaleString()}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">👁️</div><p>No product views yet</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">🛒 Top Added to Cart</span>
        </div>
        <div class="scrollable">
          ${topProductsByCart.length > 0 ? topProductsByCart.map(([product, count], i) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <span class="list-text">${product}</span>
              </div>
              <span class="list-value">${count.toLocaleString()}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">🛒</div><p>No cart additions yet</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">💰 Top Purchased</span>
        </div>
        <div class="scrollable">
          ${topProductsByPurchase.length > 0 ? topProductsByPurchase.map(([product, count], i) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <span class="list-text">${product}</span>
              </div>
              <span class="list-value">${count.toLocaleString()}</span>
            </div>
          `).join('') : '<div class="empty-state"><div class="empty-icon">💰</div><p>No purchases yet</p></div>'}
        </div>
      </div>
    </div>

    <script>
      const revenueData = ${JSON.stringify(revenueByDay)};
      new Chart(document.getElementById('revenueChart'), {
        type: 'line',
        data: {
          labels: revenueData.map(d => d[0]),
          datasets: [{
            label: 'Revenue',
            data: revenueData.map(d => d[1]),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', callback: (v) => '$' + v } }
          }
        }
      });
    </script>
  `;

  return generatePageTemplate(`${appName} - Revenue Analytics`, content, 'business');
};

/**
 * Generate Funnels Dashboard
 */
const generateFunnelsDashboard = (appName) => {
  const funnelColors = ['#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171', '#22d3ee'];

  let funnelsHtml = '';
  Object.entries(analytics.funnels).forEach(([key, funnel]) => {
    const steps = funnel.steps;
    const data = funnel.data;
    const firstStepCount = data[steps[0]] || 0;

    funnelsHtml += '<div class="card" style="margin-bottom: 1.5rem;">';
    funnelsHtml += '<div class="card-header"><span class="card-title">🎯 ' + funnel.name + '</span></div>';
    funnelsHtml += '<div class="funnel-container">';

    steps.forEach((step, index) => {
      const count = data[step] || 0;
      const percentage = firstStepCount > 0 ? ((count / firstStepCount) * 100).toFixed(1) : 0;
      const prevCount = index > 0 ? (data[steps[index - 1]] || 0) : count;
      const dropoff = prevCount > 0 ? (((prevCount - count) / prevCount) * 100).toFixed(1) : 0;
      const color = funnelColors[index % funnelColors.length];

      funnelsHtml += '<div class="funnel-step">';
      funnelsHtml += '<div class="funnel-number">' + (index + 1) + '</div>';
      funnelsHtml += '<div class="funnel-bar-container">';
      funnelsHtml += '<div class="funnel-bar-bg">';
      funnelsHtml += '<div class="funnel-bar-fill" style="width: ' + percentage + '%; background: ' + color + ';">';
      funnelsHtml += '<span class="funnel-label">' + step.replace(/_/g, ' ') + '</span>';
      funnelsHtml += '</div></div></div>';
      funnelsHtml += '<div class="funnel-stats">';
      funnelsHtml += '<div class="funnel-stat"><div class="funnel-stat-value">' + count.toLocaleString() + '</div><div class="funnel-stat-label">Users</div></div>';
      funnelsHtml += '<div class="funnel-stat"><div class="funnel-stat-value">' + percentage + '%</div><div class="funnel-stat-label">Conv.</div></div>';
      if (index > 0) {
        funnelsHtml += '<div class="funnel-stat"><div class="funnel-stat-value" style="color: var(--accent-red);">-' + dropoff + '%</div><div class="funnel-stat-label">Drop</div></div>';
      }
      funnelsHtml += '</div></div>';
    });

    funnelsHtml += '</div></div>';
  });

  if (Object.keys(analytics.funnels).length === 0) {
    funnelsHtml = '<div class="card"><div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No Funnels Defined</div><p>Define conversion funnels in your analytics setup to track user journeys</p></div></div>';
  }

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>🎯 Conversion Funnels</h1>
        <p>Track user journeys and identify conversion bottlenecks</p>
      </div>
    </header>
    ${funnelsHtml}
  `;

  return generatePageTemplate(`${appName} - Conversion Funnels`, content, 'funnels');
};

/**
 * Generate Segments Dashboard
 */
const generateSegmentsDashboard = (appName) => {
  updateSegments();

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>🧩 Customer Segments</h1>
        <p>Understand your customer base through behavioral, value, and engagement segments</p>
      </div>
    </header>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <span class="card-title">🎭 Behavioral Segments</span>
      </div>
      <div class="segment-grid">
        <div class="segment-card">
          <div class="segment-icon">👀</div>
          <div class="segment-count">${analytics.segments.behavioral.browsers.length}</div>
          <div class="segment-label">Browsers</div>
          <div class="segment-desc">View products but don't buy</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">❤️</div>
          <div class="segment-count">${analytics.segments.behavioral.wishlisters.length}</div>
          <div class="segment-label">Wishlisters</div>
          <div class="segment-desc">Add to favorites/wishlist</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">🛒</div>
          <div class="segment-count">${analytics.segments.behavioral.cartAbandoners.length}</div>
          <div class="segment-label">Cart Abandoners</div>
          <div class="segment-desc">Add to cart but don't checkout</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">1️⃣</div>
          <div class="segment-count">${analytics.segments.behavioral.oneTimeBuyers.length}</div>
          <div class="segment-label">One-Time Buyers</div>
          <div class="segment-desc">Purchased only once</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">🔄</div>
          <div class="segment-count">${analytics.segments.behavioral.repeatBuyers.length}</div>
          <div class="segment-label">Repeat Buyers</div>
          <div class="segment-desc">Purchased 2-5 times</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">👑</div>
          <div class="segment-count">${analytics.segments.behavioral.loyalists.length}</div>
          <div class="segment-label">Loyalists</div>
          <div class="segment-desc">Purchased 6+ times</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">😴</div>
          <div class="segment-count">${analytics.segments.behavioral.inactive.length}</div>
          <div class="segment-label">Inactive</div>
          <div class="segment-desc">No activity in 30+ days</div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">💎 Value Segments</span>
        </div>
        <div class="segment-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="segment-card">
            <div class="segment-icon">🏆</div>
            <div class="segment-count" style="color: var(--accent-yellow);">${analytics.segments.value.vip.length}</div>
            <div class="segment-label">VIP</div>
            <div class="segment-desc">Top 10% spenders</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">⭐</div>
            <div class="segment-count" style="color: var(--accent-green);">${analytics.segments.value.highValue.length}</div>
            <div class="segment-label">High Value</div>
            <div class="segment-desc">70-90 percentile</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">📊</div>
            <div class="segment-count" style="color: var(--accent-blue);">${analytics.segments.value.mediumValue.length}</div>
            <div class="segment-label">Medium Value</div>
            <div class="segment-desc">30-70 percentile</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">📉</div>
            <div class="segment-count" style="color: var(--text-secondary);">${analytics.segments.value.lowValue.length}</div>
            <div class="segment-label">Low Value</div>
            <div class="segment-desc">Bottom 30%</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">⚡ Engagement Segments</span>
        </div>
        <div class="segment-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="segment-card">
            <div class="segment-icon">🔥</div>
            <div class="segment-count" style="color: var(--accent-red);">${analytics.segments.engagement.superActive.length}</div>
            <div class="segment-label">Super Active</div>
            <div class="segment-desc">Daily visits</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">✨</div>
            <div class="segment-count" style="color: var(--accent-green);">${analytics.segments.engagement.active.length}</div>
            <div class="segment-label">Active</div>
            <div class="segment-desc">Weekly visits</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">🌙</div>
            <div class="segment-count" style="color: var(--accent-blue);">${analytics.segments.engagement.casual.length}</div>
            <div class="segment-label">Casual</div>
            <div class="segment-desc">Monthly visits</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">💤</div>
            <div class="segment-count" style="color: var(--text-muted);">${analytics.segments.engagement.dormant.length}</div>
            <div class="segment-label">Dormant</div>
            <div class="segment-desc">30+ days inactive</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return generatePageTemplate(`${appName} - Customer Segments`, content, 'segments');
};

/**
 * Generate Cohorts Dashboard
 */
const generateCohortsDashboard = (appName) => {
  calculateCohortRetention();

  const monthCohorts = Object.entries(analytics.cohorts.byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  const weekCohorts = Object.entries(analytics.cohorts.byWeek).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);

  const getRetentionColor = (rate) => {
    if (rate >= 80) return 'rgba(52, 211, 153, 0.8)';
    if (rate >= 60) return 'rgba(52, 211, 153, 0.6)';
    if (rate >= 40) return 'rgba(251, 191, 36, 0.6)';
    if (rate >= 20) return 'rgba(248, 113, 113, 0.4)';
    return 'rgba(248, 113, 113, 0.2)';
  };

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>📅 Cohort Analysis</h1>
        <p>Track customer retention and engagement over time</p>
      </div>
    </header>

    <div class="grid grid-4">
      <div class="card kpi-card kpi-green">
        <div class="kpi-value">${analytics.cohorts.retention.day1.toFixed(1)}%</div>
        <div class="kpi-label">Day 1 Retention</div>
      </div>
      <div class="card kpi-card kpi-blue">
        <div class="kpi-value">${analytics.cohorts.retention.day7.toFixed(1)}%</div>
        <div class="kpi-label">Day 7 Retention</div>
      </div>
      <div class="card kpi-card kpi-purple">
        <div class="kpi-value">${analytics.cohorts.retention.day30.toFixed(1)}%</div>
        <div class="kpi-label">Day 30 Retention</div>
      </div>
      <div class="card kpi-card kpi-yellow">
        <div class="kpi-value">${analytics.cohorts.retention.day90.toFixed(1)}%</div>
        <div class="kpi-label">Day 90 Retention</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <span class="card-title">📊 Monthly Cohort Retention</span>
      </div>
      ${monthCohorts.length > 0 ? `
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Users</th>
                <th>Week 1</th>
                <th>Week 2</th>
                <th>Week 3</th>
                <th>Week 4</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${monthCohorts.map(([month, data]) => `
                <tr>
                  <td><strong>${month}</strong></td>
                  <td>${(data.users || []).length}</td>
                  <td style="background: ${getRetentionColor(data.retention?.week1 || 0)};">${(data.retention?.week1 || 0).toFixed(0)}%</td>
                  <td style="background: ${getRetentionColor(data.retention?.week2 || 0)};">${(data.retention?.week2 || 0).toFixed(0)}%</td>
                  <td style="background: ${getRetentionColor(data.retention?.week3 || 0)};">${(data.retention?.week3 || 0).toFixed(0)}%</td>
                  <td style="background: ${getRetentionColor(data.retention?.week4 || 0)};">${(data.retention?.week4 || 0).toFixed(0)}%</td>
                  <td>$${(data.revenue || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No Cohort Data Yet</div><p>Cohorts will appear as users make purchases over time</p></div>'}
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📈 Weekly Cohorts</span>
      </div>
      ${weekCohorts.length > 0 ? `
        <div class="scrollable">
          ${weekCohorts.map(([week, data]) => `
            <div class="list-item">
              <div class="list-info">
                <span class="list-text"><strong>${week}</strong></span>
                <span class="list-subtext">${(data.users || []).length} users</span>
              </div>
              <span class="list-value">$${(data.revenue || 0).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-state"><div class="empty-icon">📈</div><p>No weekly cohort data yet</p></div>'}
    </div>
  `;

  return generatePageTemplate(`${appName} - Cohort Analysis`, content, 'cohorts');
};

/**
 * Generate RFM Analysis Dashboard
 */
const generateRFMDashboard = (appName) => {
  updateRFMSegments();

  const segmentInfo = {
    champions: { icon: '🏆', color: '#fbbf24', desc: 'Best customers - high recency, frequency & monetary' },
    loyalCustomers: { icon: '💎', color: '#34d399', desc: 'Good overall engagement across all metrics' },
    potentialLoyalist: { icon: '⭐', color: '#60a5fa', desc: 'Recent customers with growth potential' },
    newCustomers: { icon: '🌱', color: '#22d3ee', desc: 'Very recent first-time purchasers' },
    promising: { icon: '📈', color: '#a78bfa', desc: 'Recent with medium engagement levels' },
    needsAttention: { icon: '⚠️', color: '#fbbf24', desc: 'Above average but slipping away' },
    aboutToSleep: { icon: '😴', color: '#fb923c', desc: 'Low recency, was previously engaged' },
    atRisk: { icon: '🚨', color: '#f87171', desc: 'Spent big money but now inactive' },
    cantLoseThem: { icon: '💔', color: '#ef4444', desc: 'Made big purchases, urgent win-back needed' },
    hibernating: { icon: '❄️', color: '#94a3b8', desc: 'Low across all metrics' },
    lost: { icon: '👋', color: '#64748b', desc: 'Very low engagement - likely churned' }
  };

  const topScores = Array.from(analytics.rfm.scores.values()).sort((a, b) => parseInt(b.score) - parseInt(a.score)).slice(0, 10);

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>⭐ RFM Analysis</h1>
        <p>Customer segmentation based on Recency, Frequency, and Monetary value</p>
      </div>
      <div class="header-right">
        <span class="badge badge-info">Last updated: ${analytics.rfm.lastUpdated ? new Date(analytics.rfm.lastUpdated).toLocaleString() : 'Never'}</span>
      </div>
    </header>

    <div class="grid grid-3">
      <div class="card kpi-card kpi-blue">
        <div class="kpi-icon" style="background: rgba(96, 165, 250, 0.2);">📊</div>
        <div class="kpi-value">${analytics.rfm.scores.size}</div>
        <div class="kpi-label">Total Scored</div>
      </div>
      <div class="card kpi-card kpi-green">
        <div class="kpi-icon" style="background: rgba(52, 211, 153, 0.2);">🏆</div>
        <div class="kpi-value">${analytics.rfm.segments.champions.length}</div>
        <div class="kpi-label">Champions</div>
      </div>
      <div class="card kpi-card kpi-red">
        <div class="kpi-icon" style="background: rgba(248, 113, 113, 0.2);">🚨</div>
        <div class="kpi-value">${analytics.rfm.segments.atRisk.length + analytics.rfm.segments.cantLoseThem.length}</div>
        <div class="kpi-label">At Risk</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <span class="card-title">📊 RFM Segments Overview</span>
      </div>
      <div class="segment-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
        ${Object.entries(segmentInfo).map(([segment, info]) => `
          <div class="segment-card" style="border-left: 4px solid ${info.color};">
            <div class="segment-icon">${info.icon}</div>
            <div class="segment-count" style="color: ${info.color};">${analytics.rfm.segments[segment]?.length || 0}</div>
            <div class="segment-label">${segment.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div class="segment-desc">${info.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🏆 Top RFM Scores</span>
        </div>
        ${topScores.length > 0 ? `
          <div class="scrollable">
            ${topScores.map((score, i) => `
              <div class="list-item">
                <div class="list-info">
                  <span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                  <div>
                    <span class="list-text">${score.customerId}</span>
                    <div class="list-subtext">R:${score.recency} F:${score.frequency} M:${score.monetary}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <span class="list-value">${score.score}</span>
                  <div class="list-subtext">${score.segment}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><div class="empty-icon">📊</div><p>No RFM scores calculated yet</p></div>'}
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">📈 RFM Score Distribution</span>
        </div>
        <div class="chart-container">
          <canvas id="rfmChart"></canvas>
        </div>
      </div>
    </div>

    <script>
      const rfmData = ${JSON.stringify(Object.entries(segmentInfo).map(([seg]) => ({
        segment: seg.replace(/([A-Z])/g, ' $1').trim(),
        count: analytics.rfm.segments[seg]?.length || 0
      })))};

      new Chart(document.getElementById('rfmChart'), {
        type: 'bar',
        data: {
          labels: rfmData.map(d => d.segment),
          datasets: [{
            label: 'Customers',
            data: rfmData.map(d => d.count),
            backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#22d3ee', '#a78bfa', '#fbbf24', '#fb923c', '#f87171', '#ef4444', '#94a3b8', '#64748b'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    </script>
  `;

  return generatePageTemplate(`${appName} - RFM Analysis`, content, 'rfm');
};

/**
 * Generate LTV Dashboard
 */
const generateLTVDashboard = (appName) => {
  const formatCurrency = (amount) => '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const customers = Array.from(analytics.ltv.customers.values()).sort((a, b) => b.predictedLTV - a.predictedLTV);
  const topCustomers = customers.slice(0, 15);

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>💎 Customer Lifetime Value</h1>
        <p>Understand and predict customer value over time</p>
      </div>
    </header>

    <div class="grid grid-4">
      <div class="card kpi-card kpi-green">
        <div class="kpi-icon" style="background: rgba(52, 211, 153, 0.2);">💵</div>
        <div class="kpi-value">${formatCurrency(analytics.ltv.averageLTV)}</div>
        <div class="kpi-label">Average LTV</div>
      </div>
      <div class="card kpi-card kpi-blue">
        <div class="kpi-icon" style="background: rgba(96, 165, 250, 0.2);">👥</div>
        <div class="kpi-value">${analytics.ltv.totalCustomers}</div>
        <div class="kpi-label">Total Customers</div>
      </div>
      <div class="card kpi-card kpi-yellow">
        <div class="kpi-icon" style="background: rgba(251, 191, 36, 0.2);">⭐</div>
        <div class="kpi-value">${analytics.ltv.segments.high.length}</div>
        <div class="kpi-label">High Value</div>
      </div>
      <div class="card kpi-card kpi-red">
        <div class="kpi-icon" style="background: rgba(248, 113, 113, 0.2);">⚠️</div>
        <div class="kpi-value">${analytics.ltv.segments.churned.length}</div>
        <div class="kpi-label">Churned</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 LTV Segments</span>
        </div>
        <div class="segment-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="segment-card">
            <div class="segment-icon">🏆</div>
            <div class="segment-count" style="color: var(--accent-yellow);">${analytics.ltv.segments.high.length}</div>
            <div class="segment-label">High Value</div>
            <div class="segment-desc">Top 20% by predicted LTV</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">📊</div>
            <div class="segment-count" style="color: var(--accent-blue);">${analytics.ltv.segments.medium.length}</div>
            <div class="segment-label">Medium Value</div>
            <div class="segment-desc">20-50% by predicted LTV</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">📉</div>
            <div class="segment-count" style="color: var(--text-secondary);">${analytics.ltv.segments.low.length}</div>
            <div class="segment-label">Low Value</div>
            <div class="segment-desc">Bottom 50%, still active</div>
          </div>
          <div class="segment-card">
            <div class="segment-icon">👋</div>
            <div class="segment-count" style="color: var(--accent-red);">${analytics.ltv.segments.churned.length}</div>
            <div class="segment-label">Churned</div>
            <div class="segment-desc">No activity in 90+ days</div>
          </div>
        </div>
        <div class="chart-container-sm" style="margin-top: 1rem;">
          <canvas id="ltvPieChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">💰 LTV Distribution</span>
        </div>
        <div class="chart-container">
          <canvas id="ltvDistChart"></canvas>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">🏆 Top Customers by Predicted LTV</span>
      </div>
      ${topCustomers.length > 0 ? `
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer ID</th>
                <th>Total Spent</th>
                <th>Orders</th>
                <th>Avg Order</th>
                <th>Predicted LTV</th>
                <th>Health Score</th>
                <th>Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              ${topCustomers.map((c, i) => `
                <tr>
                  <td><span class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span></td>
                  <td>${c.customerId}</td>
                  <td>${formatCurrency(c.totalSpent)}</td>
                  <td>${c.orderCount}</td>
                  <td>${formatCurrency(c.avgOrderValue)}</td>
                  <td style="color: var(--accent-green); font-weight: 600;">${formatCurrency(c.predictedLTV)}</td>
                  <td>
                    <div class="progress-bar" style="width: 60px; display: inline-block; vertical-align: middle;">
                      <div class="progress-fill" style="width: ${c.healthScore}%; background: ${c.healthScore >= 70 ? 'var(--accent-green)' : c.healthScore >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'};"></div>
                    </div>
                    <span style="margin-left: 0.5rem;">${c.healthScore.toFixed(0)}%</span>
                  </td>
                  <td>${Math.round(c.daysSinceLastPurchase)}d ago</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty-state"><div class="empty-icon">💎</div><div class="empty-title">No LTV Data Yet</div><p>LTV calculations will appear after customers make purchases</p></div>'}
    </div>

    <script>
      // LTV Segments Pie Chart
      new Chart(document.getElementById('ltvPieChart'), {
        type: 'doughnut',
        data: {
          labels: ['High Value', 'Medium Value', 'Low Value', 'Churned'],
          datasets: [{
            data: [${analytics.ltv.segments.high.length}, ${analytics.ltv.segments.medium.length}, ${analytics.ltv.segments.low.length}, ${analytics.ltv.segments.churned.length}],
            backgroundColor: ['#fbbf24', '#60a5fa', '#94a3b8', '#f87171'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 10 } } },
          cutout: '60%'
        }
      });

      // LTV Distribution Chart
      const ltvData = ${JSON.stringify(customers.slice(0, 20).map(c => ({ id: c.customerId.substring(0, 8), ltv: c.predictedLTV })))};
      new Chart(document.getElementById('ltvDistChart'), {
        type: 'bar',
        data: {
          labels: ltvData.map(d => d.id),
          datasets: [{
            label: 'Predicted LTV',
            data: ltvData.map(d => d.ltv),
            backgroundColor: '#34d399',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', callback: (v) => '$' + v } }
          }
        }
      });
    </script>
  `;

  return generatePageTemplate(`${appName} - Customer LTV`, content, 'ltv');
};

/**
 * Generate Predictions Dashboard
 */
const generatePredictionsDashboard = (appName) => {
  analyzeAndPredict();

  const getTrendClass = (direction) => direction === 'up' ? 'trend-up' : direction === 'down' ? 'trend-down' : '';
  const getTrendIcon = (direction) => direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  const churnRisks = Array.from(analytics.predictions.churnRisk.entries())
    .sort((a, b) => b[1].probability - a[1].probability)
    .slice(0, 10);

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>🔮 Predictive Analytics</h1>
        <p>AI-powered forecasts and trend analysis</p>
      </div>
    </header>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <span class="card-title">📈 Trend Analysis</span>
      </div>
      <div class="grid grid-3">
        <div class="segment-card">
          <div class="segment-icon">💵</div>
          <div class="segment-count ${getTrendClass(analytics.predictions.trends.revenue.direction)}" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            ${getTrendIcon(analytics.predictions.trends.revenue.direction)}
            ${Math.abs(analytics.predictions.trends.revenue.change || 0).toFixed(1)}%
          </div>
          <div class="segment-label">Revenue Trend</div>
          <div class="segment-desc">${analytics.predictions.trends.revenue.direction === 'up' ? 'Growing' : analytics.predictions.trends.revenue.direction === 'down' ? 'Declining' : 'Stable'}</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">📦</div>
          <div class="segment-count ${getTrendClass(analytics.predictions.trends.orders.direction)}" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            ${getTrendIcon(analytics.predictions.trends.orders.direction)}
            ${Math.abs(analytics.predictions.trends.orders.change || 0).toFixed(1)}%
          </div>
          <div class="segment-label">Orders Trend</div>
          <div class="segment-desc">${analytics.predictions.trends.orders.direction === 'up' ? 'Growing' : analytics.predictions.trends.orders.direction === 'down' ? 'Declining' : 'Stable'}</div>
        </div>
        <div class="segment-card">
          <div class="segment-icon">👥</div>
          <div class="segment-count ${getTrendClass(analytics.predictions.trends.traffic.direction)}" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            ${getTrendIcon(analytics.predictions.trends.traffic.direction)}
            ${Math.abs(analytics.predictions.trends.traffic.change || 0).toFixed(1)}%
          </div>
          <div class="segment-label">Traffic Trend</div>
          <div class="segment-desc">${analytics.predictions.trends.traffic.direction === 'up' ? 'Growing' : analytics.predictions.trends.traffic.direction === 'down' ? 'Declining' : 'Stable'}</div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">⏰ Seasonality Patterns</span>
        </div>
        ${analytics.predictions.seasonality.peakHours.length > 0 || analytics.predictions.seasonality.peakDays.length > 0 ? `
          <div style="padding: 1rem 0;">
            ${analytics.predictions.seasonality.peakHours.length > 0 ? `
              <div class="list-item">
                <div class="list-info">
                  <span class="segment-icon">🕐</span>
                  <span class="list-text">Peak Hours</span>
                </div>
                <span class="list-value">${analytics.predictions.seasonality.peakHours.map(h => h + ':00').join(', ')}</span>
              </div>
            ` : ''}
            ${analytics.predictions.seasonality.peakDays.length > 0 ? `
              <div class="list-item">
                <div class="list-info">
                  <span class="segment-icon">📅</span>
                  <span class="list-text">Peak Days</span>
                </div>
                <span class="list-value">${analytics.predictions.seasonality.peakDays.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        ` : '<div class="empty-state"><div class="empty-icon">⏰</div><p>Not enough data for seasonality analysis</p></div>'}
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 Revenue Forecast</span>
        </div>
        ${analytics.predictions.revenueForecasts.length > 0 ? `
          <div class="chart-container-sm">
            <canvas id="forecastChart"></canvas>
          </div>
        ` : '<div class="empty-state"><div class="empty-icon">📊</div><p>Not enough data for forecasting</p></div>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">🚨 Churn Risk Analysis</span>
      </div>
      ${churnRisks.length > 0 ? `
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Churn Probability</th>
                <th>Risk Level</th>
                <th>Risk Factors</th>
              </tr>
            </thead>
            <tbody>
              ${churnRisks.map(([customerId, data]) => `
                <tr>
                  <td>${customerId}</td>
                  <td>
                    <div class="progress-bar" style="width: 100px; display: inline-block; vertical-align: middle;">
                      <div class="progress-fill" style="width: ${(data.probability * 100).toFixed(0)}%; background: ${data.probability >= 0.7 ? 'var(--accent-red)' : data.probability >= 0.4 ? 'var(--accent-yellow)' : 'var(--accent-green)'};"></div>
                    </div>
                    <span style="margin-left: 0.5rem;">${(data.probability * 100).toFixed(0)}%</span>
                  </td>
                  <td>
                    <span class="badge ${data.probability >= 0.7 ? 'badge-danger' : data.probability >= 0.4 ? 'badge-warning' : 'badge-success'}">
                      ${data.probability >= 0.7 ? 'High' : data.probability >= 0.4 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                  <td>${(data.factors || []).join(', ') || 'No factors identified'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty-state"><div class="empty-icon">🚨</div><div class="empty-title">No Churn Risk Data</div><p>Churn predictions will appear as customer purchase patterns are analyzed</p></div>'}
    </div>

    <script>
      ${analytics.predictions.revenueForecasts.length > 0 ? `
        const forecastData = ${JSON.stringify(analytics.predictions.revenueForecasts.slice(-14))};
        new Chart(document.getElementById('forecastChart'), {
          type: 'line',
          data: {
            labels: forecastData.map(d => d.date),
            datasets: [
              {
                label: 'Actual',
                data: forecastData.map(d => d.actual),
                borderColor: '#34d399',
                backgroundColor: 'transparent',
                tension: 0.4
              },
              {
                label: 'Predicted',
                data: forecastData.map(d => d.predicted),
                borderColor: '#60a5fa',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#94a3b8' } } },
            scales: {
              x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
              y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', callback: (v) => '$' + v } }
            }
          }
        });
      ` : ''}
    </script>
  `;

  return generatePageTemplate(`${appName} - Predictions`, content, 'predictions');
};

/**
 * Generate Insights Dashboard
 */
const generateInsightsDashboard = (appName) => {
  const insights = generateInsights();

  const getInsightClass = (type) => {
    switch(type) {
      case 'critical': return 'insight-critical';
      case 'warning': return 'insight-warning';
      case 'success': return 'insight-success';
      default: return 'insight-info';
    }
  };

  const getInsightIcon = (type) => {
    switch(type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return '💡';
    }
  };

  const content = `
    <header class="header">
      <div class="header-left">
        <h1>💡 Actionable Insights</h1>
        <p>AI-generated recommendations to improve your business</p>
      </div>
      <div class="header-right">
        <span class="badge badge-info">Generated: ${insights.lastGenerated ? new Date(insights.lastGenerated).toLocaleString() : 'Just now'}</span>
      </div>
    </header>

    ${insights.alerts && insights.alerts.length > 0 ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <span class="card-title">🚨 Alerts Requiring Attention</span>
          <span class="badge badge-danger">${insights.alerts.length} alerts</span>
        </div>
        <div class="scrollable">
          ${insights.alerts.map(alert => `
            <div class="insight-item ${getInsightClass(alert.type)}">
              <div class="insight-header">
                <span class="insight-icon">${getInsightIcon(alert.type)}</span>
                <span class="insight-title">${alert.title}</span>
              </div>
              <div class="insight-message">${alert.message}</div>
              ${alert.action ? `<div style="margin-top: 0.75rem;"><span class="badge badge-info">Action: ${alert.action}</span></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${insights.opportunities && insights.opportunities.length > 0 ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <span class="card-title">🚀 Growth Opportunities</span>
          <span class="badge badge-success">${insights.opportunities.length} found</span>
        </div>
        <div class="scrollable">
          ${insights.opportunities.map(opp => `
            <div class="insight-item insight-success">
              <div class="insight-header">
                <span class="insight-icon">💰</span>
                <span class="insight-title">${opp.title}</span>
              </div>
              <div class="insight-message">${opp.message}</div>
              ${opp.potentialValue ? `<div style="margin-top: 0.75rem;"><span class="badge badge-success">Potential: $${opp.potentialValue.toLocaleString()}</span></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${insights.recommendations && insights.recommendations.length > 0 ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <span class="card-title">💡 Recommendations</span>
        </div>
        <div class="scrollable">
          ${insights.recommendations.map(rec => `
            <div class="insight-item insight-info">
              <div class="insight-header">
                <span class="insight-icon">💡</span>
                <span class="insight-title">${rec.title}</span>
              </div>
              <div class="insight-message">${rec.message}</div>
              ${rec.priority ? `<div style="margin-top: 0.75rem;"><span class="badge ${rec.priority === 'high' ? 'badge-danger' : rec.priority === 'medium' ? 'badge-warning' : 'badge-info'}">Priority: ${rec.priority}</span></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${insights.anomalies && insights.anomalies.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <span class="card-title">🔍 Detected Anomalies</span>
          <span class="badge badge-warning">${insights.anomalies.length} detected</span>
        </div>
        <div class="scrollable">
          ${insights.anomalies.map(anomaly => `
            <div class="insight-item insight-warning">
              <div class="insight-header">
                <span class="insight-icon">🔍</span>
                <span class="insight-title">${anomaly.title}</span>
              </div>
              <div class="insight-message">${anomaly.message}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${(!insights.alerts || insights.alerts.length === 0) &&
      (!insights.opportunities || insights.opportunities.length === 0) &&
      (!insights.recommendations || insights.recommendations.length === 0) &&
      (!insights.anomalies || insights.anomalies.length === 0) ? `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">💡</div>
          <div class="empty-title">No Insights Available Yet</div>
          <p>As your business data grows, AI-powered insights will appear here with actionable recommendations.</p>
        </div>
      </div>
    ` : ''}
  `;

  return generatePageTemplate(`${appName} - Insights`, content, 'insights');
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN SETUP FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Setup business analytics middleware and endpoints
 * @param {Express} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {string} options.appName - Application name for dashboard
 * @param {string} options.basePath - Base path for analytics endpoints (default: '/analytics')
 * @param {string[]} options.excludePaths - Paths to exclude from tracking
 * @param {Object} options.customFunnels - Custom conversion funnels
 */
export const setupBusinessAnalytics = (app, options = {}) => {
  const {
    appName = 'Business Analytics',
    basePath = '/analytics',
    excludePaths = ['/health', '/status', '/analytics', '/favicon.ico'],
    customFunnels = {},
  } = options;

  // Add custom funnels
  Object.entries(customFunnels).forEach(([key, funnel]) => {
    analytics.funnels[key] = {
      name: funnel.name || key,
      steps: funnel.steps || [],
      data: {},
    };
  });

  // Apply analytics middleware
  app.use(analyticsMiddleware({ excludePaths }));

  // Dashboard endpoint
  app.get(`${basePath}/dashboard`, (req, res) => {
    const html = generateDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // User analytics - Visual Dashboard
  app.get(`${basePath}/users`, (req, res) => {
    const html = generateUsersDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // User analytics - JSON API
  app.get(`${basePath}/users/json`, (req, res) => {
    res.json({
      totalVisitors: analytics.users.size,
      totalSessions: analytics.sessions.size,
      newUsers: analytics.engagement.newUsers,
      returningUsers: analytics.engagement.returningUsers,
      activeUsers: {
        daily: analytics.engagement.activeUsers.daily.size,
        weekly: analytics.engagement.activeUsers.weekly.size,
        monthly: analytics.engagement.activeUsers.monthly.size,
      },
      engagement: {
        avgSessionDuration: analytics.engagement.avgSessionDuration,
        avgPagesPerSession: analytics.engagement.avgPagesPerSession,
        bounceRate: analytics.sessions.size > 0
          ? (analytics.bounceCount / analytics.sessions.size) * 100
          : 0,
      },
      devices: analytics.devices,
      geographic: analytics.geographic,
    });
  });

  // Business metrics - Visual Dashboard
  app.get(`${basePath}/business`, (req, res) => {
    const html = generateBusinessDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Business metrics - JSON API
  app.get(`${basePath}/business/json`, (req, res) => {
    res.json({
      revenue: analytics.business.revenue,
      orders: analytics.business.orders,
      carts: analytics.business.carts,
      averageOrderValue: analytics.business.averageOrderValue,
      conversionRate: analytics.business.carts.created > 0
        ? (analytics.business.carts.converted / analytics.business.carts.created) * 100
        : 0,
      abandonmentRate: analytics.business.carts.created > 0
        ? (analytics.business.carts.abandoned / analytics.business.carts.created) * 100
        : 0,
      topProducts: {
        byViews: Object.entries(analytics.business.products.views)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
        byAddToCart: Object.entries(analytics.business.products.addedToCart)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
        byPurchases: Object.entries(analytics.business.products.purchased)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
      },
    });
  });

  // Page analytics API
  app.get(`${basePath}/pages`, (req, res) => {
    res.json({
      totalPageViews: analytics.pageViews.total,
      topPages: Object.entries(analytics.pageViews.byPage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      byHour: analytics.pageViews.byHour,
      byDay: analytics.pageViews.byDay,
      entryPages: Object.entries(analytics.entryPages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      exitPages: Object.entries(analytics.exitPages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    });
  });

  // Funnel analytics - Visual Dashboard
  app.get(`${basePath}/funnels`, (req, res) => {
    const html = generateFunnelsDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Funnel analytics - JSON API
  app.get(`${basePath}/funnels/json`, (req, res) => {
    const funnelData = {};
    Object.entries(analytics.funnels).forEach(([key, funnel]) => {
      funnelData[key] = {
        name: funnel.name,
        steps: funnel.steps,
        data: funnel.data,
      };
    });
    res.json(funnelData);
  });

  // Events API
  app.get(`${basePath}/events`, (req, res) => {
    res.json({
      recentEvents: analytics.events.slice(-50).reverse(),
      eventCounts: analytics.eventCounts,
    });
  });

  // Track custom event endpoint
  app.post(`${basePath}/track`, (req, res) => {
    const { event, data, sessionId } = req.body;
    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    trackEvent(sessionId || 'api', event, data || {});
    res.json({ success: true });
  });

  // Real-time stats API
  app.get(`${basePath}/realtime`, (req, res) => {
    res.json({
      activeVisitors: analytics.realtime.activeVisitors.size,
      currentPages: Object.entries(analytics.realtime.currentPages)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
      lastMinuteRequests: analytics.realtime.lastMinuteRequests,
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 🚀 ADVANCED ANALYTICS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  // LTV (Customer Lifetime Value) - Visual Dashboard
  app.get(`${basePath}/ltv`, (req, res) => {
    const html = generateLTVDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // LTV - JSON API
  app.get(`${basePath}/ltv/json`, (req, res) => {
    const customers = Array.from(analytics.ltv.customers.values())
      .sort((a, b) => b.predictedLTV - a.predictedLTV);

    res.json({
      summary: {
        averageLTV: analytics.ltv.averageLTV,
        totalCustomers: analytics.ltv.totalCustomers,
        segments: {
          high: analytics.ltv.segments.high.length,
          medium: analytics.ltv.segments.medium.length,
          low: analytics.ltv.segments.low.length,
          churned: analytics.ltv.segments.churned.length,
        },
      },
      topCustomers: customers.slice(0, 20).map(c => ({
        customerId: c.customerId,
        totalSpent: c.totalSpent,
        predictedLTV: c.predictedLTV,
        orderCount: c.orderCount,
        healthScore: c.healthScore,
        daysSinceLastPurchase: c.daysSinceLastPurchase,
      })),
      distribution: {
        high: customers.filter(c => c.predictedLTV >= 500).length,
        medium: customers.filter(c => c.predictedLTV >= 100 && c.predictedLTV < 500).length,
        low: customers.filter(c => c.predictedLTV < 100).length,
      },
    });
  });

  // RFM Analysis - Visual Dashboard
  app.get(`${basePath}/rfm`, (req, res) => {
    const html = generateRFMDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // RFM Analysis - JSON API
  app.get(`${basePath}/rfm/json`, (req, res) => {
    updateRFMSegments();

    const segmentCounts = {};
    Object.entries(analytics.rfm.segments).forEach(([segment, customers]) => {
      segmentCounts[segment] = customers.length;
    });

    res.json({
      lastUpdated: analytics.rfm.lastUpdated,
      totalScored: analytics.rfm.scores.size,
      segments: segmentCounts,
      segmentDetails: {
        champions: { count: analytics.rfm.segments.champions.length, description: 'Best customers - high recency, frequency, and monetary' },
        loyalCustomers: { count: analytics.rfm.segments.loyalCustomers.length, description: 'Good overall engagement' },
        potentialLoyalist: { count: analytics.rfm.segments.potentialLoyalist.length, description: 'Recent customers with potential' },
        newCustomers: { count: analytics.rfm.segments.newCustomers.length, description: 'Very recent, first purchase' },
        promising: { count: analytics.rfm.segments.promising.length, description: 'Recent with medium engagement' },
        needsAttention: { count: analytics.rfm.segments.needsAttention.length, description: 'Above average but slipping' },
        aboutToSleep: { count: analytics.rfm.segments.aboutToSleep.length, description: 'Low recency, was engaged' },
        atRisk: { count: analytics.rfm.segments.atRisk.length, description: 'Spent big, now inactive - WIN BACK' },
        cantLoseThem: { count: analytics.rfm.segments.cantLoseThem.length, description: 'Made big purchases, now inactive - URGENT' },
        hibernating: { count: analytics.rfm.segments.hibernating.length, description: 'Low across all metrics' },
        lost: { count: analytics.rfm.segments.lost.length, description: 'Very low engagement' },
      },
      topScores: Array.from(analytics.rfm.scores.values())
        .sort((a, b) => parseInt(b.score) - parseInt(a.score))
        .slice(0, 20),
    });
  });

  // Cohort Analysis - Visual Dashboard
  app.get(`${basePath}/cohorts`, (req, res) => {
    const html = generateCohortsDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Cohort Analysis - JSON API
  app.get(`${basePath}/cohorts/json`, (req, res) => {
    calculateCohortRetention();

    res.json({
      byMonth: analytics.cohorts.byMonth,
      byWeek: Object.fromEntries(
        Object.entries(analytics.cohorts.byWeek)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 12)
      ),
      bySource: analytics.cohorts.bySource,
      overallRetention: analytics.cohorts.retention,
    });
  });

  // Predictions - Visual Dashboard
  app.get(`${basePath}/predictions`, (req, res) => {
    const html = generatePredictionsDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Predictions - JSON API
  app.get(`${basePath}/predictions/json`, (req, res) => {
    analyzeAndPredict();

    res.json({
      trends: analytics.predictions.trends,
      revenueForecasts: analytics.predictions.revenueForecasts,
      seasonality: analytics.predictions.seasonality,
      churnRisk: Array.from(analytics.predictions.churnRisk.entries())
        .sort((a, b) => b[1].probability - a[1].probability)
        .slice(0, 20)
        .map(([id, data]) => ({ customerId: id, ...data })),
    });
  });

  // Customer Segments - Visual Dashboard
  app.get(`${basePath}/segments`, (req, res) => {
    const html = generateSegmentsDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Customer Segments - JSON API
  app.get(`${basePath}/segments/json`, (req, res) => {
    updateSegments();

    res.json({
      behavioral: {
        browsers: analytics.segments.behavioral.browsers.length,
        wishlisters: analytics.segments.behavioral.wishlisters.length,
        cartAbandoners: analytics.segments.behavioral.cartAbandoners.length,
        oneTimeBuyers: analytics.segments.behavioral.oneTimeBuyers.length,
        repeatBuyers: analytics.segments.behavioral.repeatBuyers.length,
        loyalists: analytics.segments.behavioral.loyalists.length,
        inactive: analytics.segments.behavioral.inactive.length,
      },
      value: {
        vip: analytics.segments.value.vip.length,
        highValue: analytics.segments.value.highValue.length,
        mediumValue: analytics.segments.value.mediumValue.length,
        lowValue: analytics.segments.value.lowValue.length,
      },
      engagement: {
        superActive: analytics.segments.engagement.superActive.length,
        active: analytics.segments.engagement.active.length,
        casual: analytics.segments.engagement.casual.length,
        dormant: analytics.segments.engagement.dormant.length,
      },
    });
  });

  // Insights - Visual Dashboard
  app.get(`${basePath}/insights`, (req, res) => {
    const html = generateInsightsDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Insights - JSON API
  app.get(`${basePath}/insights/json`, (req, res) => {
    const insights = generateInsights();
    res.json(insights);
  });

  // Executive Dashboard
  app.get(`${basePath}/executive`, (req, res) => {
    generateInsights();
    analyzeAndPredict();

    const html = generateExecutiveDashboard(appName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Goals API
  app.post(`${basePath}/goal`, (req, res) => {
    const { type, target, period } = req.body;

    if (!type || !target) {
      return res.status(400).json({ error: 'Type and target are required' });
    }

    if (['revenue', 'orders', 'conversion', 'newCustomers'].includes(type)) {
      analytics.goals[type] = { target, current: analytics.goals[type]?.current || 0, period: period || 'monthly' };
    } else {
      analytics.goals.custom.push({ type, target, current: 0, period: period || 'monthly', createdAt: new Date().toISOString() });
    }

    res.json({ success: true, goals: analytics.goals });
  });

  // Historical data API
  app.get(`${basePath}/historical`, (req, res) => {
    const { range = '30' } = req.query;
    const days = parseInt(range);

    res.json({
      daily: analytics.historical.daily.slice(-days),
      summary: {
        totalDays: analytics.historical.daily.length,
        totalRevenue: analytics.historical.daily.reduce((sum, d) => sum + (d.revenue || 0), 0),
        totalOrders: analytics.historical.daily.reduce((sum, d) => sum + (d.orders || 0), 0),
        avgDailyRevenue: analytics.historical.daily.length > 0
          ? analytics.historical.daily.reduce((sum, d) => sum + (d.revenue || 0), 0) / analytics.historical.daily.length
          : 0,
      },
    });
  });

  // Reset daily stats at midnight
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      analytics.business.revenue.today = 0;
      analytics.business.orders.today = 0;
      analytics.engagement.activeUsers.daily.clear();

      // Weekly reset
      if (now.getDay() === 0) {
        analytics.engagement.activeUsers.weekly.clear();
      }

      // Monthly reset
      if (now.getDate() === 1) {
        analytics.engagement.activeUsers.monthly.clear();
      }
    }

    // Reset last minute requests counter
    analytics.realtime.lastMinuteRequests = 0;
  }, 60000);

  console.log(`📊 Business analytics enabled - Dashboard: ${basePath}/dashboard`);
};

// Export individual components for advanced usage
export {
  analyticsMiddleware,
  trackEvent,
  analytics,
  getOrCreateSession,
  endSession,
};

export default setupBusinessAnalytics;

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
// 📊 ENHANCED DASHBOARD HTML GENERATOR
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

  const formatCurrency = (amount) => `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Get trend arrows
  const getTrendIcon = (direction) => {
    if (direction === 'up') return '↑';
    if (direction === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (direction, inverse = false) => {
    if (inverse) {
      if (direction === 'up') return '#f87171';
      if (direction === 'down') return '#34d399';
    } else {
      if (direction === 'up') return '#34d399';
      if (direction === 'down') return '#f87171';
    }
    return '#94a3b8';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>${appName} - Advanced Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-green: #34d399;
      --accent-red: #f87171;
      --accent-blue: #60a5fa;
      --accent-purple: #a78bfa;
      --accent-yellow: #fbbf24;
      --accent-cyan: #22d3ee;
      --accent-orange: #fb923c;
      --border: #334155;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
    }
    .dashboard { display: flex; min-height: 100vh; }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 1.5rem;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
    }
    .logo { font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem; }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
    .nav-section { margin-bottom: 1.5rem; }
    .nav-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 0.75rem; }
    .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; margin-bottom: 0.25rem; text-decoration: none; }
    .nav-item:hover, .nav-item.active { background: var(--bg-tertiary); color: var(--text-primary); }
    .nav-item.active { background: linear-gradient(90deg, rgba(99, 102, 241, 0.2), transparent); border-left: 3px solid var(--accent-blue); }
    .nav-icon { width: 20px; text-align: center; }

    /* Main Content */
    .main { flex: 1; margin-left: 260px; padding: 2rem; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .header-left h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .header-left p { color: var(--text-secondary); }
    .header-right { display: flex; align-items: center; gap: 1rem; }
    .realtime-badge { display: flex; align-items: center; gap: 0.5rem; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); padding: 0.5rem 1rem; border-radius: 20px; }
    .pulse { width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }

    /* Grid System */
    .grid { display: grid; gap: 1.5rem; margin-bottom: 1.5rem; }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-1-2 { grid-template-columns: 1fr 2fr; }
    .grid-2-1 { grid-template-columns: 2fr 1fr; }
    @media (max-width: 1400px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 1024px) { .grid-2, .grid-3, .grid-1-2, .grid-2-1 { grid-template-columns: 1fr; } .sidebar { display: none; } .main { margin-left: 0; } }

    /* Cards */
    .card { background: var(--bg-secondary); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-title { font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .card-action { color: var(--accent-blue); font-size: 0.85rem; cursor: pointer; }

    /* KPI Cards */
    .kpi-card { position: relative; overflow: hidden; }
    .kpi-card::before { content: ''; position: absolute; top: 0; right: 0; width: 120px; height: 120px; border-radius: 50%; opacity: 0.1; transform: translate(30%, -30%); }
    .kpi-green::before { background: var(--accent-green); }
    .kpi-blue::before { background: var(--accent-blue); }
    .kpi-purple::before { background: var(--accent-purple); }
    .kpi-yellow::before { background: var(--accent-yellow); }
    .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem; }
    .kpi-value { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
    .kpi-label { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem; }
    .kpi-trend { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .trend-up { background: rgba(52, 211, 153, 0.1); color: var(--accent-green); }
    .trend-down { background: rgba(248, 113, 113, 0.1); color: var(--accent-red); }
    .trend-neutral { background: rgba(148, 163, 184, 0.1); color: var(--text-secondary); }

    /* Charts */
    .chart-container { position: relative; height: 250px; width: 100%; }
    .chart-container-sm { height: 180px; }

    /* Progress Bars */
    .progress-item { margin-bottom: 1rem; }
    .progress-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .progress-label { font-size: 0.875rem; color: var(--text-primary); }
    .progress-value { font-size: 0.875rem; font-weight: 600; }
    .progress-bar { height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

    /* Lists */
    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem; background: var(--bg-primary); border-radius: 8px; margin-bottom: 0.5rem; }
    .list-item:last-child { margin-bottom: 0; }
    .list-info { display: flex; align-items: center; gap: 0.75rem; }
    .list-rank { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; background: var(--bg-tertiary); }
    .list-rank.gold { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; }
    .list-rank.silver { background: linear-gradient(135deg, #94a3b8, #64748b); color: #000; }
    .list-rank.bronze { background: linear-gradient(135deg, #fb923c, #ea580c); color: #000; }
    .list-text { font-size: 0.875rem; color: var(--text-primary); }
    .list-subtext { font-size: 0.75rem; color: var(--text-muted); }
    .list-value { font-weight: 600; color: var(--accent-blue); }

    /* Insights Panel */
    .insight-item { padding: 1rem; background: var(--bg-primary); border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid; }
    .insight-critical { border-color: var(--accent-red); background: rgba(248, 113, 113, 0.05); }
    .insight-warning { border-color: var(--accent-yellow); background: rgba(251, 191, 36, 0.05); }
    .insight-success { border-color: var(--accent-green); background: rgba(52, 211, 153, 0.05); }
    .insight-info { border-color: var(--accent-blue); background: rgba(96, 165, 250, 0.05); }
    .insight-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .insight-icon { font-size: 1rem; }
    .insight-title { font-weight: 600; font-size: 0.9rem; }
    .insight-message { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }

    /* RFM Segments */
    .segment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .segment-item { text-align: center; padding: 0.75rem; background: var(--bg-primary); border-radius: 8px; }
    .segment-count { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
    .segment-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }

    /* Funnel */
    .funnel-step { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; margin-bottom: 0.5rem; }
    .funnel-number { width: 28px; height: 28px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; }
    .funnel-bar-container { flex: 1; }
    .funnel-bar-bg { height: 28px; background: var(--bg-tertiary); border-radius: 6px; overflow: hidden; position: relative; }
    .funnel-bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 0.75rem; transition: width 0.5s ease; }
    .funnel-label { font-size: 0.8rem; color: #fff; font-weight: 500; white-space: nowrap; }
    .funnel-stats { display: flex; gap: 1rem; width: 140px; justify-content: flex-end; }
    .funnel-stat { text-align: right; }
    .funnel-stat-value { font-size: 0.9rem; font-weight: 600; }
    .funnel-stat-label { font-size: 0.7rem; color: var(--text-muted); }

    /* Tabs */
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .tab { padding: 0.5rem 1rem; border-radius: 6px 6px 0 0; color: var(--text-secondary); cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    .tab:hover { color: var(--text-primary); }
    .tab.active { background: var(--bg-tertiary); color: var(--accent-blue); }

    /* Badges */
    .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(52, 211, 153, 0.15); color: var(--accent-green); }
    .badge-warning { background: rgba(251, 191, 36, 0.15); color: var(--accent-yellow); }
    .badge-danger { background: rgba(248, 113, 113, 0.15); color: var(--accent-red); }
    .badge-info { background: rgba(96, 165, 250, 0.15); color: var(--accent-blue); }

    /* Data Table */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    .data-table th { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .data-table td { font-size: 0.875rem; }
    .data-table tr:hover td { background: var(--bg-primary); }

    /* Cohort Heatmap */
    .cohort-grid { display: grid; grid-template-columns: 120px repeat(6, 1fr); gap: 2px; font-size: 0.75rem; }
    .cohort-header { padding: 0.5rem; background: var(--bg-tertiary); text-align: center; font-weight: 600; }
    .cohort-cell { padding: 0.5rem; text-align: center; border-radius: 4px; }
    .cohort-label { background: var(--bg-tertiary); text-align: left; padding-left: 0.75rem; }

    /* Mini Stats */
    .mini-stats { display: flex; gap: 2rem; flex-wrap: wrap; }
    .mini-stat { }
    .mini-stat-value { font-size: 1.5rem; font-weight: 700; }
    .mini-stat-label { font-size: 0.75rem; color: var(--text-muted); }

    /* Scrollable */
    .scrollable { max-height: 300px; overflow-y: auto; }
    .scrollable::-webkit-scrollbar { width: 6px; }
    .scrollable::-webkit-scrollbar-track { background: var(--bg-primary); border-radius: 3px; }
    .scrollable::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 3px; }

    /* Empty State */
    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted); }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }

    /* Footer */
    .footer { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem; }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-in { animation: fadeIn 0.5s ease-out; }
  </style>
</head>
<body>
  <div class="dashboard">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">📊</div>
        <span>Analytics</span>
      </div>

      <nav>
        <div class="nav-section">
          <div class="nav-title">Overview</div>
          <a href="#" class="nav-item active"><span class="nav-icon">📈</span> Dashboard</a>
          <a href="/analytics/executive" class="nav-item"><span class="nav-icon">👔</span> Executive View</a>
        </div>

        <div class="nav-section">
          <div class="nav-title">Analytics</div>
          <a href="/analytics/users" class="nav-item"><span class="nav-icon">👥</span> User Analytics</a>
          <a href="/analytics/business" class="nav-item"><span class="nav-icon">💰</span> Revenue</a>
          <a href="/analytics/funnels" class="nav-item"><span class="nav-icon">🎯</span> Funnels</a>
        </div>

        <div class="nav-section">
          <div class="nav-title">Advanced</div>
          <a href="/analytics/segments" class="nav-item"><span class="nav-icon">🧩</span> Segments</a>
          <a href="/analytics/cohorts" class="nav-item"><span class="nav-icon">📅</span> Cohorts</a>
          <a href="/analytics/rfm" class="nav-item"><span class="nav-icon">⭐</span> RFM Analysis</a>
          <a href="/analytics/ltv" class="nav-item"><span class="nav-icon">💎</span> Customer LTV</a>
        </div>

        <div class="nav-section">
          <div class="nav-title">Intelligence</div>
          <a href="/analytics/predictions" class="nav-item"><span class="nav-icon">🔮</span> Predictions</a>
          <a href="/analytics/insights" class="nav-item"><span class="nav-icon">💡</span> Insights</a>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main">
      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <h1>${appName}</h1>
          <p>Advanced Business Intelligence Dashboard</p>
        </div>
        <div class="header-right">
          <div class="realtime-badge">
            <span class="pulse"></span>
            <strong>${analytics.realtime.activeVisitors.size}</strong> active now
          </div>
          <span style="color: var(--text-muted); font-size: 0.85rem;">
            Updated: ${new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      <!-- KPI Cards -->
      <div class="grid grid-4 animate-in">
        <div class="card kpi-card kpi-green">
          <div class="kpi-icon" style="background: linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(16, 185, 129, 0.1));">💰</div>
          <div class="kpi-value" style="color: var(--accent-green);">${formatCurrency(analytics.business.revenue.total)}</div>
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-trend ${analytics.predictions.trends.revenue.direction === 'up' ? 'trend-up' : analytics.predictions.trends.revenue.direction === 'down' ? 'trend-down' : 'trend-neutral'}">
            ${getTrendIcon(analytics.predictions.trends.revenue.direction)} ${Math.abs(analytics.predictions.trends.revenue.change || 0)}% vs last week
          </div>
        </div>

        <div class="card kpi-card kpi-blue">
          <div class="kpi-icon" style="background: linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(59, 130, 246, 0.1));">📦</div>
          <div class="kpi-value" style="color: var(--accent-blue);">${analytics.business.orders.completed}</div>
          <div class="kpi-label">Orders Completed</div>
          <div class="kpi-trend ${analytics.predictions.trends.orders.direction === 'up' ? 'trend-up' : analytics.predictions.trends.orders.direction === 'down' ? 'trend-down' : 'trend-neutral'}">
            ${getTrendIcon(analytics.predictions.trends.orders.direction)} ${Math.abs(analytics.predictions.trends.orders.change || 0)}% vs last week
          </div>
        </div>

        <div class="card kpi-card kpi-purple">
          <div class="kpi-icon" style="background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(139, 92, 246, 0.1));">🎯</div>
          <div class="kpi-value" style="color: var(--accent-purple);">${conversionRate}%</div>
          <div class="kpi-label">Conversion Rate</div>
          <span class="badge ${parseFloat(conversionRate) >= 3 ? 'badge-success' : parseFloat(conversionRate) >= 1 ? 'badge-warning' : 'badge-danger'}">
            ${parseFloat(conversionRate) >= 3 ? 'Good' : parseFloat(conversionRate) >= 1 ? 'Average' : 'Low'}
          </span>
        </div>

        <div class="card kpi-card kpi-yellow">
          <div class="kpi-icon" style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));">👥</div>
          <div class="kpi-value" style="color: var(--accent-yellow);">${analytics.users.size.toLocaleString()}</div>
          <div class="kpi-label">Unique Visitors</div>
          <div class="kpi-trend ${analytics.predictions.trends.traffic.direction === 'up' ? 'trend-up' : analytics.predictions.trends.traffic.direction === 'down' ? 'trend-down' : 'trend-neutral'}">
            ${getTrendIcon(analytics.predictions.trends.traffic.direction)} ${Math.abs(analytics.predictions.trends.traffic.change || 0)}% vs last week
          </div>
        </div>
      </div>

      <!-- Insights & Alerts Row -->
      ${analytics.insights.alerts.length > 0 || analytics.insights.anomalies.length > 0 ? `
      <div class="card animate-in" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <span class="card-title">⚠️ Alerts & Anomalies</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
          ${analytics.insights.alerts.map(alert => `
            <div class="insight-item ${alert.type === 'critical' ? 'insight-critical' : 'insight-warning'}">
              <div class="insight-header">
                <span class="insight-icon">${alert.type === 'critical' ? '🚨' : '⚠️'}</span>
                <span class="insight-title">${alert.title}</span>
              </div>
              <div class="insight-message">${alert.message}</div>
            </div>
          `).join('')}
          ${analytics.insights.anomalies.map(anomaly => `
            <div class="insight-item insight-info">
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

      <!-- Charts Row -->
      <div class="grid grid-2 animate-in">
        <!-- Revenue Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📈 Revenue Trend & Forecast</span>
          </div>
          <div class="chart-container">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>

        <!-- Traffic Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">👁️ Hourly Traffic Pattern</span>
          </div>
          <div class="chart-container">
            <canvas id="trafficChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Funnel & Segments Row -->
      <div class="grid grid-2 animate-in">
        <!-- Conversion Funnel -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🎯 Conversion Funnel</span>
            <span class="badge badge-info">${(() => {
              const funnel = analytics.funnels.checkout;
              const today = getToday();
              const data = funnel.data[today] || {};
              const first = data[funnel.steps[0]] || 0;
              const last = data[funnel.steps[funnel.steps.length - 1]] || 0;
              const rate = first > 0 ? ((last / first) * 100).toFixed(1) : 0;
              return `${rate}% overall`;
            })()}</span>
          </div>
          <div>
            ${(() => {
              const funnel = analytics.funnels.checkout;
              const today = getToday();
              const data = funnel.data[today] || {};
              const firstStep = data[funnel.steps[0]] || 0;
              const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

              return funnel.steps.map((step, i) => {
                const count = data[step] || 0;
                const percent = firstStep > 0 ? ((count / firstStep) * 100) : 0;
                const prevCount = i > 0 ? (data[funnel.steps[i-1]] || 0) : count;
                const dropoff = i > 0 && prevCount > 0 ? ((1 - count / prevCount) * 100).toFixed(0) : 0;

                return `
                  <div class="funnel-step">
                    <div class="funnel-number" style="background: \${colors[i % colors.length]}; color: #fff;">\${i + 1}</div>
                    <div class="funnel-bar-container">
                      <div class="funnel-bar-bg">
                        <div class="funnel-bar-fill" style="width: \${Math.max(percent, 5)}%; background: linear-gradient(90deg, \${colors[i % colors.length]}, \${colors[(i + 1) % colors.length]});">
                          <span class="funnel-label">\${step.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                    <div class="funnel-stats">
                      <div class="funnel-stat">
                        <div class="funnel-stat-value">\${count}</div>
                        <div class="funnel-stat-label">users</div>
                      </div>
                      <div class="funnel-stat">
                        <div class="funnel-stat-value" style="color: \${i > 0 && dropoff > 50 ? 'var(--accent-red)' : 'var(--text-secondary)'}">\${i > 0 ? '-' + dropoff + '%' : '100%'}</div>
                        <div class="funnel-stat-label">\${i > 0 ? 'dropoff' : 'start'}</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('');
            })()}
          </div>
        </div>

        <!-- Customer Segments -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">⭐ RFM Customer Segments</span>
            <a href="/analytics/rfm" class="card-action">View All →</a>
          </div>
          <div class="segment-grid">
            <div class="segment-item" style="background: linear-gradient(135deg, rgba(52, 211, 153, 0.1), transparent);">
              <div class="segment-count" style="color: var(--accent-green);">${analytics.rfm.segments.champions?.length || 0}</div>
              <div class="segment-label">Champions</div>
            </div>
            <div class="segment-item" style="background: linear-gradient(135deg, rgba(96, 165, 250, 0.1), transparent);">
              <div class="segment-count" style="color: var(--accent-blue);">${analytics.rfm.segments.loyalCustomers?.length || 0}</div>
              <div class="segment-label">Loyal</div>
            </div>
            <div class="segment-item" style="background: linear-gradient(135deg, rgba(167, 139, 250, 0.1), transparent);">
              <div class="segment-count" style="color: var(--accent-purple);">${analytics.rfm.segments.potentialLoyalist?.length || 0}</div>
              <div class="segment-label">Potential</div>
            </div>
            <div class="segment-item" style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), transparent);">
              <div class="segment-count" style="color: var(--accent-yellow);">${analytics.rfm.segments.promising?.length || 0}</div>
              <div class="segment-label">Promising</div>
            </div>
            <div class="segment-item" style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.1), transparent);">
              <div class="segment-count" style="color: var(--accent-orange);">${analytics.rfm.segments.needsAttention?.length || 0}</div>
              <div class="segment-label">Needs Attention</div>
            </div>
            <div class="segment-item" style="background: linear-gradient(135deg, rgba(248, 113, 113, 0.1), transparent);">
              <div class="segment-count" style="color: var(--accent-red);">${analytics.rfm.segments.atRisk?.length || 0}</div>
              <div class="segment-label">At Risk</div>
            </div>
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
            <div class="card-title" style="margin-bottom: 1rem;">Customer Lifetime Value</div>
            <div class="mini-stats">
              <div class="mini-stat">
                <div class="mini-stat-value" style="color: var(--accent-green);">${formatCurrency(analytics.ltv.averageLTV || 0)}</div>
                <div class="mini-stat-label">Average LTV</div>
              </div>
              <div class="mini-stat">
                <div class="mini-stat-value">${analytics.ltv.totalCustomers}</div>
                <div class="mini-stat-label">Total Customers</div>
              </div>
              <div class="mini-stat">
                <div class="mini-stat-value" style="color: var(--accent-blue);">${analytics.ltv.segments.high?.length || 0}</div>
                <div class="mini-stat-label">VIP Customers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Engagement & Products Row -->
      <div class="grid grid-3 animate-in">
        <!-- User Engagement -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">👥 User Engagement</span>
          </div>
          <div class="progress-item">
            <div class="progress-header">
              <span class="progress-label">Session Duration</span>
              <span class="progress-value">${formatDuration(analytics.engagement.avgSessionDuration)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((analytics.engagement.avgSessionDuration / 300000) * 100, 100)}%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));"></div>
            </div>
          </div>
          <div class="progress-item">
            <div class="progress-header">
              <span class="progress-label">Pages/Session</span>
              <span class="progress-value">${analytics.engagement.avgPagesPerSession.toFixed(1)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((analytics.engagement.avgPagesPerSession / 10) * 100, 100)}%; background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));"></div>
            </div>
          </div>
          <div class="progress-item">
            <div class="progress-header">
              <span class="progress-label">Bounce Rate</span>
              <span class="progress-value" style="color: ${parseFloat(bounceRate) > 60 ? 'var(--accent-red)' : 'var(--text-primary)'};">${bounceRate}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${bounceRate}%; background: linear-gradient(90deg, ${parseFloat(bounceRate) > 60 ? 'var(--accent-orange), var(--accent-red)' : 'var(--accent-green), var(--accent-yellow)'});"></div>
            </div>
          </div>
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
            <div style="display: flex; gap: 1rem;">
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-green);">${analytics.engagement.newUsers}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">New Users</div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-blue);">${analytics.engagement.returningUsers}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Returning</div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-purple);">${analytics.engagement.activeUsers.daily.size}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">DAU</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Pages -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📄 Top Pages</span>
          </div>
          <div class="scrollable">
            ${topPages.length > 0 ? topPages.slice(0, 8).map(([page, views], i) => `
              <div class="list-item">
                <div class="list-info">
                  <div class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
                  <div>
                    <div class="list-text" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${page}</div>
                  </div>
                </div>
                <div class="list-value">${views.toLocaleString()}</div>
              </div>
            `).join('') : '<div class="empty-state"><div class="empty-icon">📄</div><p>No page views yet</p></div>'}
          </div>
        </div>

        <!-- Top Products -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🛍️ Top Products</span>
          </div>
          <div class="scrollable">
            ${topProducts.length > 0 ? topProducts.map(([productId, views], i) => `
              <div class="list-item">
                <div class="list-info">
                  <div class="list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
                  <div>
                    <div class="list-text">${productId}</div>
                    <div class="list-subtext">${views} views</div>
                  </div>
                </div>
                <div class="list-value">${(analytics.business.products.addedToCart[productId] || 0)} carts</div>
              </div>
            `).join('') : '<div class="empty-state"><div class="empty-icon">🛍️</div><p>No product views yet</p></div>'}
          </div>
        </div>
      </div>

      <!-- Recommendations & Devices Row -->
      <div class="grid grid-2 animate-in">
        <!-- AI Recommendations -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">💡 AI Recommendations</span>
          </div>
          <div class="scrollable" style="max-height: 280px;">
            ${analytics.insights.recommendations.length > 0 ? analytics.insights.recommendations.map(rec => `
              <div class="insight-item insight-success">
                <div class="insight-header">
                  <span class="insight-icon">💡</span>
                  <span class="insight-title">${rec.title}</span>
                </div>
                <div class="insight-message">${rec.message}</div>
              </div>
            `).join('') : ''}
            ${analytics.insights.opportunities.length > 0 ? analytics.insights.opportunities.map(opp => `
              <div class="insight-item insight-info">
                <div class="insight-header">
                  <span class="insight-icon">🚀</span>
                  <span class="insight-title">${opp.title}</span>
                </div>
                <div class="insight-message">${opp.message}</div>
              </div>
            `).join('') : ''}
            ${analytics.insights.recommendations.length === 0 && analytics.insights.opportunities.length === 0 ? `
              <div class="empty-state">
                <div class="empty-icon">💡</div>
                <p>Insights will appear as more data is collected</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Device & Browser -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📱 Device Analytics</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase;">Devices</div>
              <div class="chart-container-sm">
                <canvas id="deviceChart"></canvas>
              </div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase;">Browsers</div>
              <div class="chart-container-sm">
                <canvas id="browserChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Predictions Row -->
      ${analytics.predictions.revenueForecasts.length > 0 ? `
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">🔮 7-Day Revenue Forecast</span>
          <span class="badge badge-info">Predictive</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Predicted Revenue</th>
              <th>Confidence</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.predictions.revenueForecasts.map((forecast, i) => `
              <tr>
                <td>${new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td><strong>${formatCurrency(forecast.predicted)}</strong></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                      <div style="height: 100%; width: ${forecast.confidence}%; background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));"></div>
                    </div>
                    <span style="font-size: 0.8rem;">${forecast.confidence}%</span>
                  </div>
                </td>
                <td>
                  <span class="kpi-trend ${analytics.predictions.trends.revenue.direction === 'up' ? 'trend-up' : analytics.predictions.trends.revenue.direction === 'down' ? 'trend-down' : 'trend-neutral'}">
                    ${getTrendIcon(analytics.predictions.trends.revenue.direction)} ${Math.abs(analytics.predictions.trends.revenue.change || 0)}%
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Seasonality -->
      ${analytics.predictions.seasonality.peakHours.length > 0 || analytics.predictions.seasonality.peakDays.length > 0 ? `
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">📅 Traffic Patterns</span>
        </div>
        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
          ${analytics.predictions.seasonality.peakHours.length > 0 ? `
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Peak Hours</div>
              <div style="display: flex; gap: 0.5rem;">
                ${analytics.predictions.seasonality.peakHours.map(hour => `
                  <span class="badge badge-success">${hour}:00</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${analytics.predictions.seasonality.peakDays.length > 0 ? `
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Best Days</div>
              <div style="display: flex; gap: 0.5rem;">
                ${analytics.predictions.seasonality.peakDays.map(day => `
                  <span class="badge badge-info">${day}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Recent Events -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">🔔 Recent Events</span>
          <a href="/analytics/events" class="card-action">View All →</a>
        </div>
        <div class="scrollable" style="max-height: 200px;">
          ${analytics.events.slice(-10).reverse().map(event => `
            <div class="list-item">
              <div class="list-info">
                <span class="badge badge-info">${event.name}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">${JSON.stringify(event.data).substring(0, 50)}${JSON.stringify(event.data).length > 50 ? '...' : ''}</span>
            </div>
          `).join('') || '<div class="empty-state"><div class="empty-icon">🔔</div><p>No events tracked yet</p></div>'}
        </div>
      </div>

      <!-- Footer -->
      <footer class="footer">
        <p>Advanced Business Analytics Dashboard • Auto-refreshes every 30 seconds</p>
        <p style="margin-top: 0.5rem;">Last updated: ${new Date().toISOString()}</p>
      </footer>
    </main>
  </div>

  <!-- Chart.js Scripts -->
  <script>
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const historicalData = ${JSON.stringify(analytics.historical.daily.slice(-14))};
    const forecasts = ${JSON.stringify(analytics.predictions.revenueForecasts)};

    new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: [...historicalData.map(d => d.date), ...forecasts.map(f => f.date)],
        datasets: [{
          label: 'Actual Revenue',
          data: [...historicalData.map(d => d.revenue), ...Array(forecasts.length).fill(null)],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        }, {
          label: 'Forecast',
          data: [...Array(historicalData.length).fill(null), ...forecasts.map(f => parseFloat(f.predicted))],
          borderColor: '#8b5cf6',
          borderDash: [5, 5],
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle' } }
        },
        scales: {
          x: { grid: { color: 'rgba(51, 65, 85, 0.5)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(51, 65, 85, 0.5)' }, ticks: { color: '#64748b', callback: v => '$' + v } }
        }
      }
    });

    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    const hourlyData = ${JSON.stringify(analytics.pageViews.byHour)};

    new Chart(trafficCtx, {
      type: 'bar',
      data: {
        labels: Array.from({length: 24}, (_, i) => i + ':00'),
        datasets: [{
          label: 'Page Views',
          data: hourlyData,
          backgroundColor: hourlyData.map((_, i) => {
            const peakHours = ${JSON.stringify(analytics.predictions.seasonality.peakHours)};
            return peakHours.includes(i) ? 'rgba(52, 211, 153, 0.8)' : 'rgba(59, 130, 246, 0.6)';
          }),
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { grid: { color: 'rgba(51, 65, 85, 0.5)' }, ticks: { color: '#64748b' } }
        }
      }
    });

    // Device Chart
    const deviceCtx = document.getElementById('deviceChart').getContext('2d');
    const deviceData = ${JSON.stringify(analytics.devices.types)};

    new Chart(deviceCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(deviceData),
        datasets: [{
          data: Object.values(deviceData),
          backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 11 } } }
        },
        cutout: '65%',
      }
    });

    // Browser Chart
    const browserCtx = document.getElementById('browserChart').getContext('2d');
    const browserData = ${JSON.stringify(analytics.devices.browsers)};
    const sortedBrowsers = Object.entries(browserData).sort((a, b) => b[1] - a[1]).slice(0, 5);

    new Chart(browserCtx, {
      type: 'doughnut',
      data: {
        labels: sortedBrowsers.map(b => b[0]),
        datasets: [{
          data: sortedBrowsers.map(b => b[1]),
          backgroundColor: ['#f59e0b', '#22d3ee', '#34d399', '#f87171', '#94a3b8'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', padding: 15, font: { size: 11 } } }
        },
        cutout: '65%',
      }
    });
  </script>
</body>
</html>`;
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

  // User analytics API
  app.get(`${basePath}/users`, (req, res) => {
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

  // Business metrics API
  app.get(`${basePath}/business`, (req, res) => {
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

  // Funnel analytics API
  app.get(`${basePath}/funnels`, (req, res) => {
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

  // LTV (Customer Lifetime Value) API
  app.get(`${basePath}/ltv`, (req, res) => {
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

  // RFM Analysis API
  app.get(`${basePath}/rfm`, (req, res) => {
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

  // Cohort Analysis API
  app.get(`${basePath}/cohorts`, (req, res) => {
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

  // Predictions API
  app.get(`${basePath}/predictions`, (req, res) => {
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

  // Customer Segments API
  app.get(`${basePath}/segments`, (req, res) => {
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

  // Insights API
  app.get(`${basePath}/insights`, (req, res) => {
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

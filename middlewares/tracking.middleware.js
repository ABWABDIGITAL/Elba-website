// middlewares/tracking.middleware.js

import { trackPageView } from "../services/analytics.service.js";

/**
 * Track page views
 */
export const trackPageViewMiddleware = (req, res, next) => {
  // Skip tracking for health checks and static assets
  if (req.path.startsWith('/health') || req.path.startsWith('/static')) {
    return next();
  }

  // Track page view
  trackPageView(req).catch(console.error);

  next();
};

/**
 * Track user registration
 */
export const trackUserRegistration = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    if (res.statusCode === 201 && req.path === '/api/auth/register') {
      const user = body.data?.user;
      if (user) {
        trackEvent({
          eventName: 'user_registered',
          eventCategory: 'user',
          userId: user.id,
          sessionId: req.sessionId || req.cookies?.sessionId,
          properties: {
            registrationMethod: req.body.method || 'email'
          }
        }).catch(console.error);
      }
    }
    return originalSend.apply(this, arguments);
  };

  next();
};

/**
 * Track user login
 */
export const trackUserLogin = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    if (res.statusCode === 200 && req.path === '/api/auth/login') {
      const user = body.data?.user;
      if (user) {
        trackEvent({
          eventName: 'user_logged_in',
          eventCategory: 'user',
          userId: user.id,
          sessionId: req.sessionId || req.cookies?.sessionId,
          properties: {
            loginMethod: req.body.method || 'phone'
          }
        }).catch(console.error);
      }
    }
    return originalSend.apply(this, arguments);
  };

  next();
};
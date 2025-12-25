/**
 * Server Monitor Middleware
 *
 * A comprehensive, reusable security and analytics monitoring module for Express.js applications.
 *
 * Features:
 * - Request analytics (total, success rate, response times, endpoints)
 * - Security threat detection (SQL injection, XSS, path traversal, brute force)
 * - Suspicious user agent detection (scanners, bots)
 * - Auto-blocking of malicious IPs
 * - Common error tracking
 * - Visual dashboard and API endpoints
 *
 * Usage:
 *   import { setupMonitoring } from './middlewares/serverMonitor.middleware.js';
 *   setupMonitoring(app, { mongoClient: client }); // Call before your routes
 *
 * Endpoints created:
 *   GET  /health          - Simple health check
 *   GET  /status          - Detailed JSON status
 *   GET  /status/page     - Visual HTML dashboard
 *   GET  /status/analytics - Analytics API
 *   GET  /status/security  - Security API
 *   DELETE /status/security/unblock/:ip - Unblock an IP
 *   POST /status/security/clear - Clear security stats
 */

import os from "os";

// ═══════════════════════════════════════════════════════════════
// 📊 ANALYTICS TRACKING
// ═══════════════════════════════════════════════════════════════

const analytics = {
  startTime: Date.now(),
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byMethod: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 },
    byStatus: {},
    byEndpoint: {},
  },
  responseTime: {
    total: 0,
    count: 0,
    min: Infinity,
    max: 0,
  },
  errors: [],
  warnings: [],
};

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY TRACKING
// ═══════════════════════════════════════════════════════════════

const security = {
  threats: [],
  blockedIPs: new Map(),
  suspiciousIPs: new Map(),
  stats: {
    totalThreats: 0,
    sqlInjection: 0,
    xss: 0,
    pathTraversal: 0,
    bruteForce: 0,
    botActivity: 0,
    invalidInput: 0,
    rateLimitHits: 0,
    suspiciousUserAgents: 0,
    scanningAttempts: 0,
  },
  failedLogins: new Map(),
  commonErrors: {
    '400': { count: 0, description: 'Bad Request - Malformed syntax' },
    '401': { count: 0, description: 'Unauthorized - Authentication required' },
    '403': { count: 0, description: 'Forbidden - Access denied' },
    '404': { count: 0, description: 'Not Found - Resource missing' },
    '405': { count: 0, description: 'Method Not Allowed' },
    '429': { count: 0, description: 'Too Many Requests - Rate limited' },
    '500': { count: 0, description: 'Internal Server Error' },
    '502': { count: 0, description: 'Bad Gateway' },
    '503': { count: 0, description: 'Service Unavailable' },
  },
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ATTACK PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════

const attackPatterns = {
  sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b.*\b(FROM|INTO|WHERE|TABLE|DATABASE)\b)|(['";].*(--))|(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  xss: /(<script[\s\S]*?>[\s\S]*?<\/script>)|(<[^>]*\s(on\w+)\s*=)|javascript\s*:|(<iframe|<object|<embed|<svg\s+onload)/i,
  pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c)/i,
  commandInjection: /[;&|`$]|\$\(|\)\s*{|}\s*;/,
  sensitiveFiles: /\.(env|htaccess|htpasswd|git|svn|config|ini|log|bak|sql|db)$/i,
  suspiciousPaths: /(\/admin|\/wp-admin|\/phpmyadmin|\/cpanel|\/\.git|\/\.env|\/config|\/backup|\/shell|\/cmd|\/exec)/i,
};

// Suspicious user agents (security scanners, automated tools)
const suspiciousUserAgents = /(nikto|sqlmap|nmap|masscan|zgrab|dirbuster|gobuster|wfuzz|hydra|burp|zap|acunetix|nessus|openvas|python-requests|go-http-client|java\/|libwww)/i;

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

const logThreat = (type, ip, details, severity = 'medium') => {
  security.stats.totalThreats++;
  security.stats[type] = (security.stats[type] || 0) + 1;

  const threat = {
    timestamp: new Date().toISOString(),
    type,
    severity,
    ip,
    details,
  };

  if (security.threats.length >= 100) security.threats.shift();
  security.threats.push(threat);

  // Track suspicious IPs
  const ipCount = (security.suspiciousIPs.get(ip) || 0) + 1;
  security.suspiciousIPs.set(ip, ipCount);

  // Auto-block after 10 threats from same IP
  if (ipCount >= 10 && !security.blockedIPs.has(ip)) {
    security.blockedIPs.set(ip, {
      blockedAt: new Date().toISOString(),
      reason: `Auto-blocked after ${ipCount} security violations`,
      threatCount: ipCount,
    });
  }

  console.warn(`🚨 SECURITY: [${severity.toUpperCase()}] ${type} from ${ip}: ${details}`);
};

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

const securityMiddleware = (req, res, next) => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const path = req.path;
  const query = JSON.stringify(req.query);
  const fullUrl = req.originalUrl;

  // Check if IP is blocked
  if (security.blockedIPs.has(ip)) {
    security.stats.totalThreats++;
    return res.status(403).json({
      success: false,
      message: 'Access denied - Your IP has been blocked due to suspicious activity',
    });
  }

  // Check for suspicious user agents (scanners, bots)
  if (suspiciousUserAgents.test(userAgent)) {
    logThreat('suspiciousUserAgents', ip, `Suspicious UA: ${userAgent.substring(0, 100)}`, 'low');
  }

  // Check for SQL injection attempts
  if (attackPatterns.sqlInjection.test(fullUrl) || attackPatterns.sqlInjection.test(query)) {
    logThreat('sqlInjection', ip, `SQL injection attempt: ${fullUrl.substring(0, 200)}`, 'high');
  }

  // Check for XSS attempts
  if (attackPatterns.xss.test(fullUrl) || attackPatterns.xss.test(query)) {
    logThreat('xss', ip, `XSS attempt: ${fullUrl.substring(0, 200)}`, 'high');
  }

  // Check for path traversal
  if (attackPatterns.pathTraversal.test(path)) {
    logThreat('pathTraversal', ip, `Path traversal attempt: ${path}`, 'high');
  }

  // Check for sensitive file access
  if (attackPatterns.sensitiveFiles.test(path)) {
    logThreat('scanningAttempts', ip, `Sensitive file access: ${path}`, 'medium');
  }

  // Check for suspicious paths (common attack vectors)
  if (attackPatterns.suspiciousPaths.test(path)) {
    logThreat('scanningAttempts', ip, `Suspicious path access: ${path}`, 'medium');
  }

  next();
};

// ═══════════════════════════════════════════════════════════════
// 📈 ANALYTICS MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

const analyticsMiddleware = (loginPath = '/auth/login') => (req, res, next) => {
  const startTime = Date.now();
  const ip = getClientIP(req);
  analytics.requests.total++;
  analytics.requests.byMethod[req.method] = (analytics.requests.byMethod[req.method] || 0) + 1;

  // Track endpoint
  const endpoint = req.path.split('/').slice(0, 4).join('/');
  analytics.requests.byEndpoint[endpoint] = (analytics.requests.byEndpoint[endpoint] || 0) + 1;

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Update response time stats
    analytics.responseTime.total += duration;
    analytics.responseTime.count++;
    analytics.responseTime.min = Math.min(analytics.responseTime.min, duration);
    analytics.responseTime.max = Math.max(analytics.responseTime.max, duration);

    // Track status codes
    const statusCode = res.statusCode;
    analytics.requests.byStatus[statusCode] = (analytics.requests.byStatus[statusCode] || 0) + 1;

    // Track common errors
    if (security.commonErrors[statusCode]) {
      security.commonErrors[statusCode].count++;
    }

    // Track rate limit hits
    if (statusCode === 429) {
      security.stats.rateLimitHits++;
      logThreat('rateLimitHits', ip, `Rate limit exceeded: ${req.method} ${req.path}`, 'low');
    }

    // Track failed login attempts (brute force detection)
    if (req.path.includes(loginPath) && statusCode === 401) {
      const failCount = (security.failedLogins.get(ip) || 0) + 1;
      security.failedLogins.set(ip, failCount);
      if (failCount >= 5) {
        logThreat('bruteForce', ip, `${failCount} failed login attempts`, 'high');
      }
    }

    if (statusCode >= 200 && statusCode < 400) {
      analytics.requests.success++;
      // Clear failed login count on successful auth
      if (req.path.includes(loginPath)) {
        security.failedLogins.delete(ip);
      }
    } else if (statusCode >= 400) {
      analytics.requests.errors++;
      // Log errors (keep last 50)
      if (analytics.errors.length >= 50) analytics.errors.shift();
      analytics.errors.push({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: statusCode,
        duration: `${duration}ms`,
        ip: ip,
      });
    }

    // Generate warnings for slow requests
    if (duration > 1000) {
      if (analytics.warnings.length >= 20) analytics.warnings.shift();
      analytics.warnings.push({
        type: 'slow_request',
        timestamp: new Date().toISOString(),
        message: `Slow request: ${req.method} ${req.path} took ${duration}ms`,
      });
    }
  });

  next();
};

// ═══════════════════════════════════════════════════════════════
// 🔍 REQUEST BODY SECURITY CHECK
// ═══════════════════════════════════════════════════════════════

const bodySecurityMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const ip = getClientIP(req);
    const bodyStr = JSON.stringify(req.body);

    if (attackPatterns.sqlInjection.test(bodyStr)) {
      logThreat('sqlInjection', ip, `SQL injection in body: ${req.path}`, 'high');
    }
    if (attackPatterns.xss.test(bodyStr)) {
      logThreat('xss', ip, `XSS in request body: ${req.path}`, 'high');
    }
  }
  next();
};

// ═══════════════════════════════════════════════════════════════
// 🌐 STATUS PAGE HTML GENERATOR
// ═══════════════════════════════════════════════════════════════

const generateStatusPage = async (mongoClient, appName = 'API Server') => {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  let dbStatus = "healthy";
  let dbLatency = "N/A";
  let dbStats = null;

  if (mongoClient) {
    try {
      const start = Date.now();
      await mongoClient.db().admin().ping();
      dbLatency = `${Date.now() - start}ms`;
      const db = mongoClient.db();
      dbStats = await db.stats();
    } catch {
      dbStatus = "unhealthy";
    }
  } else {
    dbStatus = "not configured";
  }

  // Calculate analytics
  const avgResponseTime = analytics.responseTime.count > 0
    ? (analytics.responseTime.total / analytics.responseTime.count).toFixed(0)
    : 0;
  const errorRate = analytics.requests.total > 0
    ? ((analytics.requests.errors / analytics.requests.total) * 100).toFixed(2)
    : 0;
  const successRate = analytics.requests.total > 0
    ? ((analytics.requests.success / analytics.requests.total) * 100).toFixed(2)
    : 0;

  // Generate system warnings
  const systemWarnings = [...analytics.warnings];
  const memPercent = (usedMem / totalMem) * 100;
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (memPercent > 90) {
    systemWarnings.unshift({ type: 'critical', message: `System memory usage critical: ${memPercent.toFixed(1)}%` });
  } else if (memPercent > 80) {
    systemWarnings.unshift({ type: 'warning', message: `High system memory usage: ${memPercent.toFixed(1)}%` });
  }

  if (heapPercent > 85) {
    systemWarnings.unshift({ type: 'warning', message: `High heap memory usage: ${heapPercent.toFixed(1)}%` });
  }

  if (loadAvg[0] > cpus.length * 2) {
    systemWarnings.unshift({ type: 'critical', message: `CPU load very high: ${loadAvg[0].toFixed(2)}` });
  } else if (loadAvg[0] > cpus.length) {
    systemWarnings.unshift({ type: 'warning', message: `High CPU load: ${loadAvg[0].toFixed(2)}` });
  }

  if (errorRate > 10) {
    systemWarnings.unshift({ type: 'critical', message: `High error rate: ${errorRate}%` });
  } else if (errorRate > 5) {
    systemWarnings.unshift({ type: 'warning', message: `Elevated error rate: ${errorRate}%` });
  }

  if (dbStatus === 'unhealthy') {
    systemWarnings.unshift({ type: 'critical', message: 'Database connection failed' });
  }

  // Top endpoints
  const topEndpoints = Object.entries(analytics.requests.byEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="15">
  <title>${appName} - Server Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #fff; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .card-full { grid-column: 1 / -1; }
    .card h2 { font-size: 0.875rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
    .stat { margin-bottom: 1rem; }
    .stat-label { font-size: 0.875rem; color: #64748b; }
    .stat-value { font-size: 1.25rem; font-weight: 600; color: #fff; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .status-healthy { background: #065f46; color: #34d399; }
    .status-unhealthy { background: #7f1d1d; color: #f87171; }
    .status-degraded { background: #78350f; color: #fbbf24; }
    .progress-bar { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .progress-green { background: linear-gradient(90deg, #10b981, #34d399); }
    .progress-yellow { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .progress-red { background: linear-gradient(90deg, #ef4444, #f87171); }
    .progress-blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .services-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .service-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #0f172a; border-radius: 8px; }
    .service-name { font-weight: 500; }
    .service-latency { color: #64748b; font-size: 0.875rem; margin-left: 0.5rem; }
    .timestamp { text-align: center; color: #64748b; margin-top: 2rem; font-size: 0.875rem; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .warning-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; }
    .warning-item { padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
    .warning-critical { background: #7f1d1d; border-left: 3px solid #ef4444; }
    .warning-warning { background: #78350f; border-left: 3px solid #f59e0b; }
    .warning-info { background: #1e3a5f; border-left: 3px solid #3b82f6; }
    .no-warnings { color: #34d399; font-size: 0.875rem; padding: 1rem; text-align: center; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    @media (max-width: 768px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
    .metric-box { background: #0f172a; border-radius: 8px; padding: 1rem; text-align: center; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .metric-label { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
    .metric-green { color: #34d399; }
    .metric-red { color: #f87171; }
    .metric-blue { color: #60a5fa; }
    .endpoint-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .endpoint-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #0f172a; border-radius: 6px; font-size: 0.875rem; }
    .endpoint-path { font-family: monospace; color: #94a3b8; }
    .endpoint-count { font-weight: 600; color: #60a5fa; }
    .error-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 150px; overflow-y: auto; }
    .error-item { padding: 0.5rem 0.75rem; background: #7f1d1d20; border-radius: 6px; font-size: 0.75rem; font-family: monospace; }
    .status-codes { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .status-code { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .status-2xx { background: #065f46; color: #34d399; }
    .status-3xx { background: #1e3a5f; color: #60a5fa; }
    .status-4xx { background: #78350f; color: #fbbf24; }
    .status-5xx { background: #7f1d1d; color: #f87171; }
    .section-title { font-size: 1.25rem; color: #fff; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>${appName}</h1>
        <p class="subtitle">Server Performance & Analytics Dashboard</p>
      </div>
      <div>
        <span class="status-badge status-${systemWarnings.some(w => w.type === 'critical') ? 'unhealthy' : systemWarnings.some(w => w.type === 'warning') ? 'degraded' : 'healthy'}">
          ${systemWarnings.some(w => w.type === 'critical') ? 'Critical Issues' : systemWarnings.some(w => w.type === 'warning') ? 'Warnings Active' : 'All Systems Operational'}
        </span>
      </div>
    </div>

    <!-- Request Analytics -->
    <div class="card card-full">
      <h2>Request Analytics</h2>
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-value">${analytics.requests.total.toLocaleString()}</div>
          <div class="metric-label">Total Requests</div>
        </div>
        <div class="metric-box">
          <div class="metric-value metric-green">${successRate}%</div>
          <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric-box">
          <div class="metric-value metric-red">${analytics.requests.errors.toLocaleString()}</div>
          <div class="metric-label">Errors</div>
        </div>
        <div class="metric-box">
          <div class="metric-value metric-blue">${avgResponseTime}ms</div>
          <div class="metric-label">Avg Response Time</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <!-- Warnings & Alerts -->
      <div class="card">
        <h2>Warnings & Alerts</h2>
        ${systemWarnings.length > 0 ? `
          <div class="warning-list">
            ${systemWarnings.slice(0, 10).map(w => `
              <div class="warning-item warning-${w.type || 'info'}">
                ${w.type === 'critical' ? '🔴' : w.type === 'warning' ? '🟡' : '🔵'} ${w.message}
              </div>
            `).join('')}
          </div>
        ` : '<div class="no-warnings">✓ No warnings - All systems healthy</div>'}
      </div>

      <!-- Response Times -->
      <div class="card">
        <h2>Response Times</h2>
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">Average</span>
            <span class="stat-value">${avgResponseTime}ms</span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">Minimum</span>
            <span class="stat-value">${analytics.responseTime.min === Infinity ? 0 : analytics.responseTime.min}ms</span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">Maximum</span>
            <span class="stat-value">${analytics.responseTime.max}ms</span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">Status Codes</div>
          <div class="status-codes" style="margin-top: 0.5rem;">
            ${Object.entries(analytics.requests.byStatus).map(([code, count]) => `
              <span class="status-code status-${code.startsWith('2') ? '2xx' : code.startsWith('3') ? '3xx' : code.startsWith('4') ? '4xx' : '5xx'}">${code}: ${count}</span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Top Endpoints -->
      <div class="card">
        <h2>Top Endpoints</h2>
        <div class="endpoint-list">
          ${topEndpoints.length > 0 ? topEndpoints.map(([path, count]) => `
            <div class="endpoint-item">
              <span class="endpoint-path">${path || '/'}</span>
              <span class="endpoint-count">${count}</span>
            </div>
          `).join('') : '<div style="color: #64748b; text-align: center;">No requests yet</div>'}
        </div>
      </div>

      <!-- Request Methods -->
      <div class="card">
        <h2>Request Methods</h2>
        ${Object.entries(analytics.requests.byMethod).filter(([,v]) => v > 0).map(([method, count]) => `
          <div class="stat">
            <div class="stat-row">
              <span class="stat-label">${method}</span>
              <span class="stat-value">${count}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill progress-blue" style="width: ${analytics.requests.total > 0 ? ((count/analytics.requests.total)*100).toFixed(1) : 0}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <h3 class="section-title">System Resources</h3>
    <div class="grid">
      <div class="card">
        <h2>Server Info</h2>
        <div class="stat">
          <div class="stat-label">Uptime</div>
          <div class="stat-value">${formatUptime(process.uptime())}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Node.js Version</div>
          <div class="stat-value">${process.version}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Platform</div>
          <div class="stat-value">${os.type()} ${os.arch()}</div>
        </div>
        <div class="stat">
          <div class="stat-label">PID</div>
          <div class="stat-value">${process.pid}</div>
        </div>
      </div>

      <div class="card">
        <h2>Memory Usage</h2>
        <div class="stat">
          <div class="stat-label">System Memory</div>
          <div class="stat-value">${formatBytes(usedMem)} / ${formatBytes(totalMem)}</div>
          <div class="progress-bar">
            <div class="progress-fill ${memPercent > 90 ? 'progress-red' : memPercent > 70 ? 'progress-yellow' : 'progress-green'}" style="width: ${memPercent.toFixed(1)}%"></div>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">Heap Used</div>
          <div class="stat-value">${formatBytes(memUsage.heapUsed)} / ${formatBytes(memUsage.heapTotal)}</div>
          <div class="progress-bar">
            <div class="progress-fill ${heapPercent > 85 ? 'progress-yellow' : 'progress-green'}" style="width: ${heapPercent.toFixed(1)}%"></div>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">RSS (Total Process Memory)</div>
          <div class="stat-value">${formatBytes(memUsage.rss)}</div>
        </div>
      </div>

      <div class="card">
        <h2>CPU Info</h2>
        <div class="stat">
          <div class="stat-label">Cores</div>
          <div class="stat-value">${cpus.length} cores</div>
        </div>
        <div class="stat">
          <div class="stat-label">Model</div>
          <div class="stat-value" style="font-size: 0.875rem;">${cpus[0]?.model || 'Unknown'}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Load Average (1m, 5m, 15m)</div>
          <div class="stat-value">${loadAvg.map(l => l.toFixed(2)).join(' / ')}</div>
          <div class="progress-bar">
            <div class="progress-fill ${loadAvg[0] > cpus.length * 2 ? 'progress-red' : loadAvg[0] > cpus.length ? 'progress-yellow' : 'progress-green'}" style="width: ${Math.min((loadAvg[0] / cpus.length) * 50, 100).toFixed(1)}%"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Services</h2>
        <div class="services-list">
          <div class="service-item">
            <div>
              <span class="service-name">MongoDB</span>
              <span class="service-latency">${dbLatency}</span>
            </div>
            <span class="status-badge status-${dbStatus === 'healthy' ? 'healthy' : 'unhealthy'}">${dbStatus}</span>
          </div>
          ${dbStats ? `
          <div class="service-item">
            <div><span class="service-name">DB Size</span></div>
            <span style="color: #60a5fa; font-weight: 600;">${formatBytes(dbStats.dataSize || 0)}</span>
          </div>
          <div class="service-item">
            <div><span class="service-name">Collections</span></div>
            <span style="color: #60a5fa; font-weight: 600;">${dbStats.collections || 0}</span>
          </div>
          ` : ''}
          <div class="service-item">
            <div><span class="service-name">Redis</span></div>
            <span class="status-badge ${process.env.REDIS_URL ? 'status-healthy' : 'status-degraded'}">${process.env.REDIS_URL ? 'configured' : 'not configured'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Security Section -->
    <h3 class="section-title">Security & Threat Detection</h3>
    <div class="card card-full">
      <h2>Threat Overview</h2>
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-value ${security.stats.totalThreats > 0 ? 'metric-red' : ''}">${security.stats.totalThreats}</div>
          <div class="metric-label">Total Threats</div>
        </div>
        <div class="metric-box">
          <div class="metric-value ${security.stats.sqlInjection > 0 ? 'metric-red' : ''}">${security.stats.sqlInjection}</div>
          <div class="metric-label">SQL Injection</div>
        </div>
        <div class="metric-box">
          <div class="metric-value ${security.stats.xss > 0 ? 'metric-red' : ''}">${security.stats.xss}</div>
          <div class="metric-label">XSS Attempts</div>
        </div>
        <div class="metric-box">
          <div class="metric-value ${security.stats.bruteForce > 0 ? 'metric-red' : ''}">${security.stats.bruteForce}</div>
          <div class="metric-label">Brute Force</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <!-- Attack Types -->
      <div class="card">
        <h2>Attack Types Detected</h2>
        <div class="services-list">
          <div class="service-item">
            <span class="service-name">Path Traversal</span>
            <span class="status-badge ${security.stats.pathTraversal > 0 ? 'status-unhealthy' : 'status-healthy'}">${security.stats.pathTraversal}</span>
          </div>
          <div class="service-item">
            <span class="service-name">Scanning Attempts</span>
            <span class="status-badge ${security.stats.scanningAttempts > 0 ? 'status-degraded' : 'status-healthy'}">${security.stats.scanningAttempts}</span>
          </div>
          <div class="service-item">
            <span class="service-name">Suspicious User Agents</span>
            <span class="status-badge ${security.stats.suspiciousUserAgents > 0 ? 'status-degraded' : 'status-healthy'}">${security.stats.suspiciousUserAgents}</span>
          </div>
          <div class="service-item">
            <span class="service-name">Rate Limit Hits</span>
            <span class="status-badge ${security.stats.rateLimitHits > 0 ? 'status-degraded' : 'status-healthy'}">${security.stats.rateLimitHits}</span>
          </div>
        </div>
      </div>

      <!-- Blocked IPs -->
      <div class="card">
        <h2>Blocked IPs (${security.blockedIPs.size})</h2>
        ${security.blockedIPs.size > 0 ? `
          <div class="endpoint-list">
            ${Array.from(security.blockedIPs.entries()).slice(0, 5).map(([ip, data]) => `
              <div class="endpoint-item" style="background: #7f1d1d20;">
                <span class="endpoint-path">${ip}</span>
                <span style="color: #f87171; font-size: 0.75rem;">${data.threatCount} violations</span>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color: #34d399; text-align: center; padding: 1rem;">No blocked IPs</div>'}
      </div>

      <!-- Common Errors -->
      <div class="card">
        <h2>Common Error Codes</h2>
        <div class="services-list">
          ${Object.entries(security.commonErrors).filter(([,v]) => v.count > 0).map(([code, data]) => `
            <div class="service-item">
              <div>
                <span class="service-name">${code}</span>
                <span class="service-latency">${data.description}</span>
              </div>
              <span class="status-badge status-${code.startsWith('4') ? 'degraded' : 'unhealthy'}">${data.count}</span>
            </div>
          `).join('') || '<div style="color: #34d399; text-align: center; padding: 0.5rem;">No errors recorded</div>'}
        </div>
      </div>

      <!-- Suspicious IPs -->
      <div class="card">
        <h2>Suspicious IPs (Top 5)</h2>
        ${security.suspiciousIPs.size > 0 ? `
          <div class="endpoint-list">
            ${Array.from(security.suspiciousIPs.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([ip, count]) => `
                <div class="endpoint-item" style="background: ${count >= 10 ? '#7f1d1d20' : count >= 5 ? '#78350f20' : '#0f172a'};">
                  <span class="endpoint-path">${ip}</span>
                  <span style="color: ${count >= 10 ? '#f87171' : count >= 5 ? '#fbbf24' : '#60a5fa'}; font-weight: 600;">${count} threats</span>
                </div>
              `).join('')}
          </div>
        ` : '<div style="color: #34d399; text-align: center; padding: 1rem;">No suspicious activity</div>'}
      </div>
    </div>

    <!-- Recent Threats -->
    ${security.threats.length > 0 ? `
    <h3 class="section-title">Recent Security Threats</h3>
    <div class="card">
      <div class="error-list">
        ${security.threats.slice(-10).reverse().map(t => `
          <div class="error-item" style="background: ${t.severity === 'high' ? '#7f1d1d30' : t.severity === 'medium' ? '#78350f30' : '#1e3a5f30'};">
            <span style="color: ${t.severity === 'high' ? '#f87171' : t.severity === 'medium' ? '#fbbf24' : '#60a5fa'};">[${t.severity.toUpperCase()}]</span>
            <span style="color: #94a3b8;">${t.type}</span> from <span style="color: #e2e8f0;">${t.ip}</span> - ${t.details.substring(0, 80)} - ${t.timestamp}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${analytics.errors.length > 0 ? `
    <h3 class="section-title">Recent Errors</h3>
    <div class="card">
      <div class="error-list">
        ${analytics.errors.slice(-10).reverse().map(e => `
          <div class="error-item">
            <span style="color: #f87171;">[${e.status}]</span> ${e.method} ${e.path} ${e.ip ? `from ${e.ip}` : ''} - ${e.duration} - ${e.timestamp}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <p class="timestamp">Last updated: ${new Date().toISOString()} (auto-refreshes every 15s)</p>
  </div>
</body>
</html>`;
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN SETUP FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Setup monitoring middleware and endpoints
 * @param {Express} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {MongoClient} options.mongoClient - MongoDB client for DB stats (optional)
 * @param {string} options.appName - Application name for dashboard (default: 'API Server')
 * @param {string} options.loginPath - Path to login endpoint for brute force detection (default: '/auth/login')
 * @param {string} options.basePath - Base path for status endpoints (default: '')
 */
export const setupMonitoring = (app, options = {}) => {
  const {
    mongoClient = null,
    appName = 'API Server',
    loginPath = '/auth/login',
    basePath = '',
  } = options;

  // Apply security middleware (must be first)
  app.use(securityMiddleware);

  // Apply analytics middleware
  app.use(analyticsMiddleware(loginPath));

  // Health check endpoint
  app.get(`${basePath}/health`, (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: formatUptime(process.uptime()),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Detailed status endpoint
  app.get(`${basePath}/status`, async (req, res) => {
    const memUsage = process.memoryUsage();
    let dbStatus = "healthy";

    if (mongoClient) {
      try {
        await mongoClient.db().admin().ping();
      } catch {
        dbStatus = "unhealthy";
      }
    } else {
      dbStatus = "not configured";
    }

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: formatUptime(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      memory: {
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        rss: formatBytes(memUsage.rss),
      },
      database: dbStatus,
      requests: {
        total: analytics.requests.total,
        success: analytics.requests.success,
        errors: analytics.requests.errors,
      },
      security: {
        threats: security.stats.totalThreats,
        blockedIPs: security.blockedIPs.size,
      },
    });
  });

  // Visual status page
  app.get(`${basePath}/status/page`, async (req, res) => {
    const html = await generateStatusPage(mongoClient, appName);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  // Analytics API endpoint
  app.get(`${basePath}/status/analytics`, (req, res) => {
    const avgResponseTime = analytics.responseTime.count > 0
      ? analytics.responseTime.total / analytics.responseTime.count
      : 0;

    res.json({
      uptime: formatUptime((Date.now() - analytics.startTime) / 1000),
      requests: analytics.requests,
      responseTime: {
        average: `${avgResponseTime.toFixed(0)}ms`,
        min: `${analytics.responseTime.min === Infinity ? 0 : analytics.responseTime.min}ms`,
        max: `${analytics.responseTime.max}ms`,
      },
      recentErrors: analytics.errors.slice(-10),
      warnings: analytics.warnings.slice(-10),
    });
  });

  // Security API endpoint
  app.get(`${basePath}/status/security`, (req, res) => {
    res.json({
      summary: {
        totalThreats: security.stats.totalThreats,
        blockedIPs: security.blockedIPs.size,
        suspiciousIPs: security.suspiciousIPs.size,
      },
      stats: security.stats,
      commonErrors: security.commonErrors,
      blockedIPs: Object.fromEntries(security.blockedIPs),
      suspiciousIPs: Object.fromEntries(
        Array.from(security.suspiciousIPs.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
      ),
      recentThreats: security.threats.slice(-20).reverse(),
      failedLogins: Object.fromEntries(
        Array.from(security.failedLogins.entries())
          .filter(([, count]) => count >= 3)
      ),
    });
  });

  // Unblock IP endpoint
  app.delete(`${basePath}/status/security/unblock/:ip`, (req, res) => {
    const ip = req.params.ip;
    if (security.blockedIPs.has(ip)) {
      security.blockedIPs.delete(ip);
      security.suspiciousIPs.delete(ip);
      res.json({ success: true, message: `IP ${ip} has been unblocked` });
    } else {
      res.status(404).json({ success: false, message: `IP ${ip} is not blocked` });
    }
  });

  // Clear security stats endpoint
  app.post(`${basePath}/status/security/clear`, (req, res) => {
    security.threats.length = 0;
    security.suspiciousIPs.clear();
    security.failedLogins.clear();
    Object.keys(security.stats).forEach(key => security.stats[key] = 0);
    Object.keys(security.commonErrors).forEach(key => security.commonErrors[key].count = 0);
    res.json({ success: true, message: 'Security stats cleared (blocked IPs preserved)' });
  });

  console.log(`📊 Server monitoring enabled - Dashboard: ${basePath}/status/page`);
};

// Export individual components for advanced usage
export {
  securityMiddleware,
  analyticsMiddleware,
  bodySecurityMiddleware,
  analytics,
  security,
  getClientIP,
  logThreat,
  formatBytes,
  formatUptime,
};

export default setupMonitoring;

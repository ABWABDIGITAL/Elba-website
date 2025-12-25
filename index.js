import express from "express";
import "dotenv/config";
import path from "path";
import os from "os";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import categoryRoutes from "./routes/categories.route.js";
import brandRoutes from "./routes/brand.route.js";
import productRoutes from "./routes/product.route.js";
import userRoutes from "./routes/user.route.js";
import reviewRoutes from "./routes/review.route.js";
import cartRoutes from "./routes/cart.route.js";
import orderRoutes from "./routes/order.route.js";
import errorMiddleware from "./middlewares/error.middleware.js"
import homeRoutes from "./routes/home.route.js";
import couponRoutes from "./routes/coupon.route.js";
import branchRoutes from "./routes/branches.route.js";
import roleRoutes from "./routes/role.route.js";
import adminRoutes from "./routes/admin.route.js";
import notificationRoutes from "./routes/notification.route.js";
import blogRoutes from "./routes/blog.route.js";
import staticPageRoutes from "./routes/staticPage.route.js";
import emailPosterRoutes from "./routes/emailPoster.route.js";
import favoriteRoutes from "./routes/favorite.route.js";
import newsletterRoutes from "./routes/newsletter.route.js";
import addressRoutes from "./routes/address.route.js";
import paymentRoutes from "./routes/payment.routes.js";
import profileRoutes from "./routes/profile.route.js";
import settingsRoutes from "./routes/settings.route.js";
import chatRoutes from "./routes/chat.route.js";
import searchRoutes from "./routes/search.routes.js";
import communicationRoutes from "./routes/communicationInfo.route.js";
import seedRoles , { seedAdmin } from "./config/seedRoles.js";
import runSeeder from "./config/seeder.js";

import cors from "cors";
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGO_URI);
// Set to true to run seeder on startup (disable after first run)
const RUN_SEEDER = process.env.RUN_SEEDER === "true";

connectDB().then(async () => {
//   Seed default roles on startup
  await seedRoles();
 await seedAdmin(); 
//   Run comprehensive seeder if enabled
  if (RUN_SEEDER) {
    await runSeeder();
  }
});

const app = express();

const PORT = process.env.PORT || 3000;

// Request analytics tracking
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

// Analytics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
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

    if (statusCode >= 200 && statusCode < 400) {
      analytics.requests.success++;
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
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to format uptime
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

// Simple health check endpoint
app.get("/health", async (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    services: {
      server: { status: "healthy" },
      database: { status: "unknown" },
    },
  };

  try {
    await client.db().admin().ping();
    healthCheck.services.database = { status: "healthy" };
  } catch (error) {
    healthCheck.services.database = { status: "unhealthy", error: error.message };
    healthCheck.status = "DEGRADED";
  }

  const statusCode = healthCheck.status === "OK" ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Comprehensive performance metrics endpoint
app.get("/status", async (req, res) => {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Calculate CPU usage
  const cpuUsage = cpus.map((cpu, index) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return {
      core: index,
      model: cpu.model,
      speed: `${cpu.speed} MHz`,
      usage: `${(((total - idle) / total) * 100).toFixed(1)}%`,
    };
  });

  const status = {
    status: "OK",
    timestamp: new Date().toISOString(),
    server: {
      name: "Alba E-Commerce API",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: formatUptime(process.uptime()),
    },
    system: {
      hostname: os.hostname(),
      osType: os.type(),
      osRelease: os.release(),
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model || "Unknown",
      loadAverage: os.loadavg().map((l) => l.toFixed(2)),
    },
    memory: {
      system: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        usagePercent: `${((usedMem / totalMem) * 100).toFixed(1)}%`,
      },
      process: {
        rss: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external),
        heapUsagePercent: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)}%`,
      },
    },
    cpu: cpuUsage,
    services: {
      database: { status: "checking..." },
      redis: { status: process.env.REDIS_URL ? "configured" : "not configured" },
      smtp: { status: process.env.SMTP_HOST ? "configured" : "not configured" },
    },
    network: {
      port: PORT,
      interfaces: Object.entries(os.networkInterfaces())
        .filter(([name]) => !name.includes("lo"))
        .map(([name, addrs]) => ({
          name,
          addresses: addrs
            .filter((a) => a.family === "IPv4")
            .map((a) => a.address),
        }))
        .filter((i) => i.addresses.length > 0),
    },
  };

  // Check MongoDB
  try {
    const dbStart = Date.now();
    await client.db().admin().ping();
    const dbLatency = Date.now() - dbStart;
    status.services.database = {
      status: "healthy",
      latency: `${dbLatency}ms`,
    };
  } catch (error) {
    status.services.database = {
      status: "unhealthy",
      error: error.message,
    };
    status.status = "DEGRADED";
  }

  status.responseTime = `${Date.now() - startTime}ms`;

  const statusCode = status.status === "OK" ? 200 : 503;
  res.status(statusCode).json(status);
});

// Visual status page (HTML)
app.get("/status/page", async (req, res) => {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  let dbStatus = "healthy";
  let dbLatency = "N/A";
  let dbStats = null;
  try {
    const start = Date.now();
    await client.db().admin().ping();
    dbLatency = `${Date.now() - start}ms`;
    // Get database stats
    const db = client.db();
    dbStats = await db.stats();
  } catch {
    dbStatus = "unhealthy";
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

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="15">
  <title>Alba E-Commerce - Server Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #fff; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
    .grid-wide { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .card-full { grid-column: 1 / -1; }
    .card h2 { font-size: 0.875rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .stat { margin-bottom: 1rem; }
    .stat-label { font-size: 0.875rem; color: #64748b; }
    .stat-value { font-size: 1.25rem; font-weight: 600; color: #fff; }
    .stat-value.large { font-size: 2rem; }
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
    .main-status { display: flex; align-items: center; gap: 1rem; }
    .warning-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; }
    .warning-item { padding: 0.75rem; border-radius: 8px; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
    .warning-critical { background: #7f1d1d; border-left: 3px solid #ef4444; }
    .warning-warning { background: #78350f; border-left: 3px solid #f59e0b; }
    .warning-info { background: #1e3a5f; border-left: 3px solid #3b82f6; }
    .no-warnings { color: #34d399; font-size: 0.875rem; padding: 1rem; text-align: center; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .metric-box { background: #0f172a; border-radius: 8px; padding: 1rem; text-align: center; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .metric-label { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
    .metric-green { color: #34d399; }
    .metric-red { color: #f87171; }
    .metric-blue { color: #60a5fa; }
    .metric-yellow { color: #fbbf24; }
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
        <h1>Alba E-Commerce API</h1>
        <p class="subtitle">Server Performance & Analytics Dashboard</p>
      </div>
      <div class="main-status">
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
            <span class="status-badge status-${dbStatus}">${dbStatus}</span>
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
          <div class="service-item">
            <div><span class="service-name">SMTP</span></div>
            <span class="status-badge ${process.env.SMTP_HOST ? 'status-healthy' : 'status-degraded'}">${process.env.SMTP_HOST ? 'configured' : 'not configured'}</span>
          </div>
        </div>
      </div>
    </div>

    ${analytics.errors.length > 0 ? `
    <h3 class="section-title">Recent Errors</h3>
    <div class="card">
      <div class="error-list">
        ${analytics.errors.slice(-10).reverse().map(e => `
          <div class="error-item">
            <span style="color: #f87171;">[${e.status}]</span> ${e.method} ${e.path} - ${e.duration} - ${e.timestamp}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <p class="timestamp">Last updated: ${new Date().toISOString()} (auto-refreshes every 15s)</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// Analytics API endpoint
app.get("/status/analytics", (req, res) => {
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

app.use("/api/v1/auth" , authRoutes);
app.use("/api/v1/home" , homeRoutes);
app.use("/api/v1/products" , productRoutes);
app.use("/api/v1/categories" , categoryRoutes);
app.use("/api/v1/brands" , brandRoutes);
app.use("/api/v1/users" , userRoutes);
app.use("/api/v1/reviews" , reviewRoutes);
app.use("/api/v1/cart" , cartRoutes);
app.use("/api/v1/orders" , orderRoutes);
app.use("/api/v1/coupons" , couponRoutes);
app.use("/api/v1/branches" , branchRoutes);
app.use("/api/v1/roles" , roleRoutes);
app.use("/api/v1/admin" , adminRoutes);
app.use("/api/v1/notifications" , notificationRoutes);
app.use("/api/v1/blogs" , blogRoutes);
app.use("/api/v1/pages" , staticPageRoutes);
app.use("/api/v1/emailPosters" , emailPosterRoutes);
app.use("/api/v1" , favoriteRoutes);
app.use("/api/v1/newsletter" , newsletterRoutes);
app.use("/api/v1/addresses" , addressRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/staticPages", staticPageRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/communicationInfo", communicationRoutes);
app.use("/uploads" , express.static(path.join(process.cwd(), "uploads")));
app.use(errorMiddleware);
app.listen(PORT, "0.0.0.0", () => {
    console.log("MongoDB connected");
    console.log(`Server running on port ${PORT}`);
    console.log(`Accepting connections from all network interfaces (0.0.0.0)`);
});

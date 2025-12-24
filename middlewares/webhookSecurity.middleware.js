// middlewares/webhookSecurity.middleware.js
import crypto from "crypto";
import PaymentLog from "../models/paymentLog.model.js";

// ═══════════════════════════════════════════════════════════════
// 🌐 IP WHITELIST - Only Allow MyFatoorah Servers
// ═══════════════════════════════════════════════════════════════

// Get these IPs from MyFatoorah documentation or support
const MYFATOORAH_ALLOWED_IPS = [
  // Production IPs
  "51.116.75.174",
  "51.116.75.175",
  "51.116.74.174",
  "51.116.74.175",
  // Sandbox IPs (remove in production)
  "51.116.72.0/24",
  // Add more as provided by MyFatoorah
];

// For development/testing - REMOVE IN PRODUCTION
const DEVELOPMENT_IPS = [
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
];

export const verifyWebhookIP = async (req, res, next) => {
  try {
    // Get client IP (handle proxies)
    const clientIP = getClientIP(req);
    
    // Check if IP is whitelisted
    const isAllowed = isIPWhitelisted(clientIP);
    
    if (!isAllowed) {
      // Log unauthorized attempt
      await logSecurityEvent({
        type: "webhook_ip_rejected",
        ip: clientIP,
        payload: sanitizePayload(req.body),
        userAgent: req.headers["user-agent"],
      });
      
      console.error(`⚠️ Webhook rejected - Unauthorized IP: ${clientIP}`);
      
      // Return generic error (don't reveal why it failed)
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Attach IP to request for logging
    req.webhookIP = clientIP;
    next();
    
  } catch (error) {
    console.error("IP verification error:", error);
    return res.status(500).json({ message: "Verification failed" });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔐 SIGNATURE VERIFICATION - Verify Request is from MyFatoorah
// ═══════════════════════════════════════════════════════════════

export const verifyWebhookSignature = async (req, res, next) => {
  try {
    const signature = req.headers["myfatoorah-signature"] || 
                      req.headers["x-myfatoorah-signature"];
    
    const webhookSecret = process.env.MYFATOORAH_WEBHOOK_SECRET;
    
    // Check if webhook secret is configured
    if (!webhookSecret) {
      console.error("❌ MYFATOORAH_WEBHOOK_SECRET not configured!");
      
      // In production, reject all webhooks if secret not configured
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({ message: "Server configuration error" });
      }
      
      // In development, allow without signature (with warning)
      console.warn("⚠️ Development mode: Skipping signature verification");
      return next();
    }
    
    // Signature is required in production
    if (!signature) {
      await logSecurityEvent({
        type: "webhook_signature_missing",
        ip: req.webhookIP,
        payload: sanitizePayload(req.body),
      });
      
      console.error("⚠️ Webhook rejected - Missing signature");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Create expected signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("base64");
    
    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    // Buffers must be same length for timingSafeEqual
    const isValid = 
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    
    if (!isValid) {
      await logSecurityEvent({
        type: "webhook_signature_invalid",
        ip: req.webhookIP,
        payload: sanitizePayload(req.body),
      });
      
      console.error("⚠️ Webhook rejected - Invalid signature");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Signature valid
    req.signatureVerified = true;
    next();
    
  } catch (error) {
    console.error("Signature verification error:", error);
    return res.status(500).json({ message: "Verification failed" });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIP(req) {
  // Handle various proxy setups
  const forwardedFor = req.headers["x-forwarded-for"];
  
  if (forwardedFor) {
    // Get the first IP in the chain (original client)
    return forwardedFor.split(",")[0].trim();
  }
  
  return (
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

function isIPWhitelisted(ip) {
  // Normalize IP (handle IPv6-mapped IPv4)
  const normalizedIP = ip.replace(/^::ffff:/, "");
  
  // Check production IPs
  if (MYFATOORAH_ALLOWED_IPS.includes(normalizedIP)) {
    return true;
  }
  
  // Check development IPs (only in non-production)
  if (process.env.NODE_ENV !== "production") {
    if (DEVELOPMENT_IPS.includes(normalizedIP) || 
        DEVELOPMENT_IPS.includes(ip)) {
      return true;
    }
  }
  
  // Check CIDR ranges (e.g., "51.116.72.0/24")
  for (const allowedIP of MYFATOORAH_ALLOWED_IPS) {
    if (allowedIP.includes("/") && isIPInRange(normalizedIP, allowedIP)) {
      return true;
    }
  }
  
  return false;
}

function isIPInRange(ip, cidr) {
  try {
    const [range, bits] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    
    const ipNum = ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    const rangeNum = range.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function sanitizePayload(payload) {
  if (!payload) return {};
  
  // Only keep non-sensitive fields for logging
  const sanitized = {
    Event: payload.Event,
    EventId: payload.EventId,
  };
  
  if (payload.Data) {
    sanitized.Data = {
      InvoiceId: payload.Data.InvoiceId,
      InvoiceStatus: payload.Data.InvoiceStatus,
      UserDefinedField: payload.Data.UserDefinedField,
    };
  }
  
  return sanitized;
}

async function logSecurityEvent(event) {
  try {
    await PaymentLog.create({
      eventType: event.type,
      ip: event.ip,
      payload: event.payload,
      userAgent: event.userAgent,
      status: "security_alert",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}
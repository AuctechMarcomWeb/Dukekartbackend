import rateLimit from "express-rate-limit";

// Helper to create a rate limiter (in-memory store)
const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    handler: (req, res, next, options) => {
      console.log(`🚫 Rate limit hit | IP: ${req.ip} | Route: ${req.originalUrl} | Limit: ${options.max} req/${windowMs / 1000}s`);
      res.status(429).json({ success: false, message: options.message.message });
    },
    skip: (req) => {
      console.log(`✅ Request allowed | IP: ${req.ip} | Route: ${req.originalUrl}`);
      return false; // false = mat skip karo, limit apply karo
    },
  });

// General API limiter — all routes
export const generalLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100,            // 100 requests per IP
  "Too many requests, please try again after 15 minutes."
);

// Strict limiter — OTP / auth routes (brute force protection)
export const authLimiter = createLimiter(
  5 * 60 * 1000,  // 5 minutes
  10,             // 10 requests per IP
  "Too many auth attempts, please try again after 5 minutes."
);

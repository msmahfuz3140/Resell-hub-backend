const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter (generous limits for development & smooth UX)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 1000 : 10000, // 10,000 requests in dev
  skip: () => process.env.NODE_ENV !== "production", // Skip rate limiting in development
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth routes rate limiter
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  skip: () => process.env.NODE_ENV !== "production",
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  skip: () => process.env.NODE_ENV !== "production",
  message: {
    success: false,
    message: "Upload limit reached. Please try again after 1 hour.",
  },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };

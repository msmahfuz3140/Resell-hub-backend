const { sendError } = require("../utils/response");

/**
 * Global error handler middleware
 * Must be registered LAST in app.use() chain
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // ─── Mongoose Validation Error ────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    const fieldErrors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    errors = fieldErrors.map((e) => e.message);
    message = errors[0] || "Validation failed";
  }

  // ─── Mongoose Duplicate Key (unique constraint) ─
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `${capitalizeFirst(field)} '${value}' already exists.`;
  }

  // ─── Mongoose Cast Error (bad ObjectId) ────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // ─── JWT Errors ────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired. Please login again.";
  }
  if (err.name === "NotBeforeError") {
    statusCode = 401;
    message = "Token not yet active.";
  }

  // ─── Multer Errors ─────────────────────────────
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File too large. Maximum size is 5MB.";
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    statusCode = 400;
    message = "Too many files. Maximum is 5 images.";
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    message = `Unexpected field: ${err.field}`;
  }

  // ─── MongoDB Connection Errors ─────────────────
  if (err.name === "MongoNetworkError" || err.name === "MongoServerError") {
    statusCode = 503;
    message = "Database connection error. Please try again later.";
  }

  // ─── Stripe Errors ─────────────────────────────
  if (err.type === "StripeCardError") {
    statusCode = 400;
    message = err.message;
  }
  if (err.type === "StripeInvalidRequestError") {
    statusCode = 400;
    message = "Invalid payment request.";
  }

  // ─── Development: log full error ──────────────
  if (process.env.NODE_ENV === "development") {
    console.error("\n❌ ERROR ─────────────────────────────────────");
    console.error(`Status : ${statusCode}`);
    console.error(`Message: ${message}`);
    console.error(`URL    : ${req.method} ${req.originalUrl}`);
    console.error(`Stack  :`, err.stack);
    console.error("─────────────────────────────────────────────\n");
  } else {
    // Production: minimal logging
    console.error(
      `[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.originalUrl} - ${message}`
    );
  }

  return sendError(res, statusCode, message, errors);
};

/**
 * 404 Not Found handler
 * Must be registered BEFORE errorHandler but AFTER all routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async error wrapper — eliminates try/catch in controllers
 * Usage: router.get("/", asyncHandler(myController))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── Helper ───────────────────────────────────────
const capitalizeFirst = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1);

module.exports = { errorHandler, notFound, asyncHandler };

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { connectDB, disconnectDB } = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

// ─── Route imports ────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const messageRoutes = require("./routes/messageRoutes");

// ─── Connect Database ─────────────────────────────
connectDB();

// ─── App ──────────────────────────────────────────
const app = express();

// ─── Security Middleware ──────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Managed separately in production
  })
);

// ─── CORS ─────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Total-Count"],
  })
);

// ─── Body Parsers ─────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Request Logging ──────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ─── Global Rate Limiter ──────────────────────────
app.use("/api", apiLimiter);

// ─── Trust Proxy (for rate limiting behind reverse proxy) ─
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ─── Health Check ─────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 ReSell Hub API is running!",
    environment: process.env.NODE_ENV,
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ─── API Routes ───────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);

// ─── 404 Handler ──────────────────────────────────
app.use(notFound);

// ─── Global Error Handler ─────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║      🛍️  ReSell Hub API Server v2.0          ║
╠══════════════════════════════════════════════╣
║  Port       : ${PORT}                             ║
║  Environment: ${process.env.NODE_ENV?.padEnd(10) || "development "}              ║
║  URL        : http://localhost:${PORT}            ║
║  Health     : http://localhost:${PORT}/health     ║
╚══════════════════════════════════════════════╝
  `);
});

// ─── Graceful Shutdown ────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n⚡ ${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("🔒 HTTP server closed");
    await disconnectDB();
    console.log("✅ Graceful shutdown complete");
    process.exit(0);
  });

  // Force shutdown after 30s if graceful fails
  setTimeout(() => {
    console.error("⚠️  Force shutdown after timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Unhandled Errors ─────────────────────────────
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Promise Rejection:", reason);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

module.exports = app;

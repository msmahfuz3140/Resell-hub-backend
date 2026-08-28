const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("♻️  Using existing MongoDB connection");
    return;
  }

  try {
    const options = {
      // Connection pool
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,

      // Retry on transient errors
      retryWrites: true,
      retryReads: true,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    isConnected = true;

    console.log(`
  ✅ MongoDB Connected
     Host    : ${conn.connection.host}
     Database: ${conn.connection.name}
     State   : ${conn.connection.readyState === 1 ? "Connected" : "Unknown"}
    `);

    try {
      const { seedDatabase } = require("../seeds/seed");
      await seedDatabase();
    } catch (e) {
      console.warn("⚠️  Seed skipped:", e.message);
    }

    // ─── Connection event listeners ───────────────
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err.message);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
      isConnected = true;
    });

    mongoose.connection.on("close", () => {
      console.log("🔒 MongoDB connection closed");
      isConnected = false;
    });
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);

    // Retry logic for startup failures
    if (process.env.NODE_ENV !== "test") {
      console.log("🔄 Retrying MongoDB connection in 5 seconds...");
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

/**
 * Gracefully close MongoDB connection
 * Called on process shutdown
 */
const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  console.log("🔒 MongoDB connection closed gracefully");
};

module.exports = { connectDB, disconnectDB };

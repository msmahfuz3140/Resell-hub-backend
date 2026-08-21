const mongoose = require("mongoose");

// ─── Main Payment Schema ───────────────────────────

const paymentSchema = new mongoose.Schema(
  {
    // ─── Relation ─────────────────────────────
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer ID is required"],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller ID is required"],
    },

    // ─── Transaction IDs ──────────────────────
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      unique: true,
      trim: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    stripeChargeId: {
      type: String,
      default: null,
    },
    stripeSessionId: {
      type: String,
      default: null,
    },

    // ─── Amount ───────────────────────────────
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "BDT",
      uppercase: true,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellerAmount: {
      type: Number,
      required: [true, "Seller amount is required"],
      min: 0,
    },

    // ─── Payment Method ───────────────────────
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["stripe", "cash", "bank_transfer"],
        message: "{VALUE} is not a valid payment method",
      },
    },
    paymentGateway: {
      type: String,
      enum: ["stripe", "manual"],
      default: "stripe",
    },

    // ─── Status ───────────────────────────────
    paymentStatus: {
      type: String,
      required: [true, "Payment status is required"],
      enum: {
        values: [
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled",
          "refunded",
          "partially_refunded",
        ],
        message: "{VALUE} is not a valid payment status",
      },
      default: "pending",
    },

    // ─── Dates ────────────────────────────────
    paymentDate: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },

    // ─── Refund Info ──────────────────────────
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReason: {
      type: String,
      default: null,
      maxlength: [500, "Refund reason cannot exceed 500 characters"],
    },
    stripeRefundId: {
      type: String,
      default: null,
    },

    // ─── Webhook ──────────────────────────────
    webhookEventId: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ─── Notes ────────────────────────────────
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────
paymentSchema.virtual("isSuccessful").get(function () {
  return this.paymentStatus === "completed";
});

paymentSchema.virtual("isRefunded").get(function () {
  return (
    this.paymentStatus === "refunded" ||
    this.paymentStatus === "partially_refunded"
  );
});

// ─── Indexes ──────────────────────────────────────
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ buyerId: 1, createdAt: -1 });
paymentSchema.index({ sellerId: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });

// ─── Pre-save: Auto-generate transaction ID ────────
paymentSchema.pre("save", function (next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    this.transactionId = `TXN-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);

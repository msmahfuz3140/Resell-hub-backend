const mongoose = require("mongoose");

// ─── Participant Info Sub-schema ──────────────────
// Denormalized snapshot so order history doesn't break if user updates profile

const participantInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    photo: { type: String, default: null },
    location: {
      city: { type: String, default: null },
      country: { type: String, default: "Bangladesh" },
    },
  },
  { _id: false }
);

// ─── Product Snapshot Sub-schema ──────────────────
const productSnapshotSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: { type: String, required: true },
    image: { type: String, default: null },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    condition: { type: String, required: true },
  },
  { _id: false }
);

// ─── Shipping Address Sub-schema ──────────────────
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: null },
    postalCode: { type: String, default: null },
    country: { type: String, default: "Bangladesh" },
  },
  { _id: false }
);

// ─── Main Order Schema ────────────────────────────

const orderSchema = new mongoose.Schema(
  {
    // ─── Unique Order Number ──────────────────
    orderNumber: {
      type: String,
      unique: true,
      // Auto-generated in pre-save
    },

    // ─── Participants ─────────────────────────
    buyerInfo: {
      type: participantInfoSchema,
      required: [true, "Buyer information is required"],
    },
    sellerInfo: {
      type: participantInfoSchema,
      required: [true, "Seller information is required"],
    },

    // ─── Product ──────────────────────────────
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    productSnapshot: {
      type: productSnapshotSchema,
      required: [true, "Product snapshot is required"],
    },

    // ─── Financials ───────────────────────────
    amount: {
      type: Number,
      required: [true, "Order amount is required"],
      min: [0, "Amount cannot be negative"],
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

    // ─── Payment Status ───────────────────────
    paymentStatus: {
      type: String,
      enum: {
        values: ["unpaid", "pending", "paid", "failed", "refunded", "partially_refunded"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ["stripe", "cash", "bank_transfer"],
        message: "{VALUE} is not a valid payment method",
      },
      default: "stripe",
    },

    // ─── Order Status ─────────────────────────
    orderStatus: {
      type: String,
      enum: {
        values: [
          "placed",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "completed",
          "cancelled",
          "disputed",
        ],
        message: "{VALUE} is not a valid order status",
      },
      default: "placed",
    },

    // ─── Shipping ─────────────────────────────
    shippingAddress: {
      type: shippingAddressSchema,
      default: null,
    },
    trackingNumber: {
      type: String,
      default: null,
    },

    // ─── Notes ────────────────────────────────
    buyerNote: {
      type: String,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: null,
    },
    sellerNote: {
      type: String,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },

    // ─── Timeline ─────────────────────────────
    confirmedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    // ─── Review Status ────────────────────────
    isReviewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────
orderSchema.virtual("isCompleted").get(function () {
  return this.orderStatus === "completed";
});

orderSchema.virtual("isCancelled").get(function () {
  return this.orderStatus === "cancelled";
});

// ─── Indexes ──────────────────────────────────────
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ "buyerInfo.userId": 1, createdAt: -1 });
orderSchema.index({ "sellerInfo.userId": 1, createdAt: -1 });
orderSchema.index({ productId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// ─── Pre-save: Generate order number ──────────────
orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.orderNumber = `RSH-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);

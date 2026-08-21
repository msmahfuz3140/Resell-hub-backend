const mongoose = require("mongoose");

// ─── Reviewer Info Sub-schema ─────────────────────
const reviewerInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

// ─── Main Review Schema ───────────────────────────

const reviewSchema = new mongoose.Schema(
  {
    // ─── Who wrote this review ────────────────
    reviewerInfo: {
      type: reviewerInfoSchema,
      required: [true, "Reviewer information is required"],
    },

    // ─── Who is being reviewed ─────────────────
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewee ID is required"],
    },

    // ─── What product ────────────────────────
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },

    // ─── Which order (verified purchase) ─────
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
    },

    // ─── Review Content ──────────────────────
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number (1-5)",
      },
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },

    // ─── Flags ───────────────────────────────
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },

    // ─── Seller Reply ────────────────────────
    sellerReply: {
      comment: {
        type: String,
        maxlength: [500, "Reply cannot exceed 500 characters"],
        default: null,
      },
      repliedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────
reviewSchema.index({ "reviewerInfo.userId": 1, orderId: 1 }, { unique: true }); // One review per order
reviewSchema.index({ revieweeId: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// ─── Post-save: Update seller rating ──────────────
reviewSchema.post("save", async function () {
  const User = mongoose.model("User");

  const stats = await mongoose.model("Review").aggregate([
    { $match: { revieweeId: this.revieweeId, isVisible: true } },
    {
      $group: {
        _id: "$revieweeId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(this.revieweeId, {
      "rating.average": Math.round(stats[0].avgRating * 10) / 10,
      "rating.count": stats[0].count,
    });
  }
});

// ─── Post-remove: Recalculate rating ──────────────
reviewSchema.post("deleteOne", { document: true }, async function () {
  const User = mongoose.model("User");
  const stats = await mongoose.model("Review").aggregate([
    { $match: { revieweeId: this.revieweeId, isVisible: true } },
    {
      $group: {
        _id: "$revieweeId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(this.revieweeId, {
      "rating.average": Math.round(stats[0].avgRating * 10) / 10,
      "rating.count": stats[0].count,
    });
  } else {
    await User.findByIdAndUpdate(this.revieweeId, {
      "rating.average": 0,
      "rating.count": 0,
    });
  }
});

module.exports = mongoose.model("Review", reviewSchema);

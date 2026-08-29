const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter user ID is required"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Reported product ID is required"],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      required: [true, "Report reason is required"],
      enum: {
        values: [
          "scam",
          "counterfeit",
          "inappropriate_content",
          "wrong_category",
          "prohibited_item",
          "misleading_price",
          "other",
        ],
        message: "{VALUE} is not a valid report reason",
      },
    },
    description: {
      type: String,
      required: [true, "Report description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "investigating", "resolved", "dismissed"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: null,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
    actionTaken: {
      type: String,
      enum: ["none", "warning_issued", "product_removed", "seller_banned"],
      default: "none",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ productId: 1 });
reportSchema.index({ reporterId: 1 });

module.exports = mongoose.model("Report", reportSchema);

const mongoose = require("mongoose");

// ─── Sub-schemas ──────────────────────────────────

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
    },
    publicId: {
      type: String,
      required: [true, "Image public ID is required"],
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const sellerInfoSchema = new mongoose.Schema(
  {
    sellerId: {
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
    phone: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    isVerifiedSeller: {
      type: Boolean,
      default: false,
    },
    location: {
      city: { type: String, default: null },
      country: { type: String, default: "Bangladesh" },
    },
  },
  { _id: false }
);

// ─── Main Product Schema ───────────────────────────

const productSchema = new mongoose.Schema(
  {
    // ─── Core Info ──────────────────────────────
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
      default: null,
    },

    // ─── Category & Condition ───────────────────
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "Electronics",
          "Clothing",
          "Furniture",
          "Books",
          "Sports",
          "Vehicles",
          "Home & Garden",
          "Toys",
          "Jewelry",
          "Art",
          "Music",
          "Other",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    condition: {
      type: String,
      required: [true, "Product condition is required"],
      enum: {
        values: ["New", "Like New", "Good", "Fair", "Poor"],
        message: "{VALUE} is not a valid condition",
      },
    },

    // ─── Images ─────────────────────────────────
    images: {
      type: [imageSchema],
      validate: {
        validator: function (v) {
          return v.length >= 1 && v.length <= 8;
        },
        message: "Product must have between 1 and 8 images",
      },
    },

    // ─── Seller Info (denormalized for performance) ─
    sellerInfo: {
      type: sellerInfoSchema,
      required: [true, "Seller information is required"],
    },

    // ─── Inventory ──────────────────────────────
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },

    // ─── Status ─────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ["active", "sold", "pending", "rejected", "draft", "archived"],
        message: "{VALUE} is not a valid status",
      },
      default: "active",
    },

    // ─── Location ───────────────────────────────
    location: {
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: { type: String, default: null },
      country: { type: String, default: "Bangladesh" },
    },

    // ─── Extra Fields ───────────────────────────
    isFeatured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    negotiable: {
      type: Boolean,
      default: false,
    },
    meetupPreference: {
      type: String,
      enum: ["In-person", "Delivery", "Both"],
      default: "Both",
    },

    // ─── Admin ──────────────────────────────────
    rejectionReason: {
      type: String,
      default: null,
    },
    soldAt: {
      type: Date,
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
productSchema.virtual("favoritesCount").get(function () {
  return this.favorites ? this.favorites.length : 0;
});

productSchema.virtual("discountPercent").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  return this.images.find((img) => img.isPrimary) || this.images[0];
});

// ─── Indexes ──────────────────────────────────────
productSchema.index({ title: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ "sellerInfo.sellerId": 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, status: 1 });
productSchema.index({ "location.city": 1, status: 1 });
productSchema.index({ status: 1, createdAt: -1 });

// ─── Pre-save: Set primary image ──────────────────
productSchema.pre("save", function () {
  if (this.images && this.images.length > 0) {
    const hasPrimary = this.images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      this.images[0].isPrimary = true;
    }
  }
});

module.exports = mongoose.model("Product", productSchema);

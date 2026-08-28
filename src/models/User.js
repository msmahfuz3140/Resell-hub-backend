const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ─── Basic Info ───────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // ─── Profile Photo ────────────────────────────
    photo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },

    // ─── Role & Status ────────────────────────────
    role: {
      type: String,
      enum: {
        values: ["buyer", "seller", "admin"],
        message: "Role must be buyer, seller, or admin",
      },
      default: "buyer",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "banned"],
        message: "Status must be active, inactive, or banned",
      },
      default: "active",
    },

    // ─── Contact Info ─────────────────────────────
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,15}$/, "Please provide a valid phone number"],
      default: null,
    },

    // ─── Location ─────────────────────────────────
    location: {
      address: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: "Bangladesh" },
      postalCode: { type: String, default: null },
    },

    // ─── Seller Profile ───────────────────────────
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: null,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },

    // ─── Auth Provider ────────────────────────────
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      default: null,
      select: false,
    },

    // ─── Verification ─────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // ─── Password Reset ───────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ─── Session ──────────────────────────────────
    refreshToken: {
      type: String,
      select: false,
    },
    lastLoginAt: {
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
userSchema.virtual("photoUrl").get(function () {
  return this.photo?.url || null;
});

userSchema.virtual("fullLocation").get(function () {
  const loc = this.location;
  if (!loc) return null;
  return [loc.city, loc.state, loc.country].filter(Boolean).join(", ");
});

// ─── Indexes ──────────────────────────────────────
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// ─── Pre-save Hooks ───────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  // Prevent double-hashing if already a bcrypt hash
  if (/^\$2[abxy]\$\d+\$/.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ─── Instance Methods ─────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isSeller = function () {
  return this.role === "seller" || this.role === "admin";
};

userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

userSchema.methods.isBanned = function () {
  return this.status === "banned";
};

// ─── toJSON - Remove sensitive fields ─────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.googleId;
  return obj;
};

module.exports = mongoose.model("User", userSchema);

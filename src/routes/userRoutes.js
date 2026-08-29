const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  getUserReviews,
  updateProfile,
  getUserListings,
  getMyFavorites,
  changePassword,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { upload, handleUploadError } = require("../middleware/upload");
const {
  updateProfileValidation,
  changePasswordValidation,
  mongoIdParam,
  paginationValidation,
} = require("../middleware/validation");

// ─── Current User Routes ──────────────────────────

// @route   GET /api/users/me/favorites
// @desc    Get current user's favorite products
// @access  Private
router.get("/me/favorites", protect, paginationValidation, getMyFavorites);

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put(
  "/me",
  protect,
  upload.single("photo"),
  handleUploadError,
  updateProfileValidation,
  updateProfile
);

// @route   PUT /api/users/me/password
// @desc    Change current user password
// @access  Private
router.put(
  "/me/password",
  protect,
  changePasswordValidation,
  changePassword
);

// ─── Public User Routes ───────────────────────────

// @route   GET /api/users/:id
// @desc    Get public user profile
// @access  Public
router.get("/:id", mongoIdParam("id"), getUserProfile);

// @route   GET /api/users/:id/listings
// @desc    Get user's product listings
// @access  Public
router.get(
  "/:id/listings",
  mongoIdParam("id"),
  paginationValidation,
  getUserListings
);

// @route   GET /api/users/:id/reviews
// @desc    Get seller's customer reviews
// @access  Public
router.get(
  "/:id/reviews",
  mongoIdParam("id"),
  paginationValidation,
  getUserReviews
);

module.exports = router;

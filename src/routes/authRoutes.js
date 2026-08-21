const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  registerValidation,
  loginValidation,
} = require("../middleware/validation");

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post("/register", authLimiter, registerValidation, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", authLimiter, loginValidation, login);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", protect, logout);

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post("/refresh", refreshToken);

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get("/me", protect, getMe);

module.exports = router;

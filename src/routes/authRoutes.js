const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  logout,
  refreshToken,
  getMe,
  switchRole,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  registerValidation,
  loginValidation,
  validate,
} = require("../middleware/validation");
const { body } = require("express-validator");

// ─── Public Routes ────────────────────────────────

// @route   POST /api/auth/register
router.post("/register", authLimiter, registerValidation, register);

// @route   POST /api/auth/login
router.post("/login", authLimiter, loginValidation, login);

// @route   POST /api/auth/google
router.post(
  "/google",
  authLimiter,
  [
    body("idToken")
      .notEmpty()
      .withMessage("Google ID token is required"),
    validate,
  ],
  googleAuth
);

// @route   POST /api/auth/refresh
router.post("/refresh", refreshToken);

// ─── Private Routes ───────────────────────────────

// @route   POST /api/auth/logout
router.post("/logout", protect, logout);

// @route   GET /api/auth/me
router.get("/me", protect, getMe);

// @route   PUT /api/auth/role
router.put(
  "/role",
  protect,
  [
    body("role")
      .isIn(["buyer", "seller"])
      .withMessage("Role must be buyer or seller"),
    validate,
  ],
  switchRole
);

module.exports = router;

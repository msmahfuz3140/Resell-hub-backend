const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  sendTokenCookies,
  clearTokenCookies,
} = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const jwt = require("jsonwebtoken");

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "buyer" } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 409, "An account with this email already exists.");
  }

  // Only allow buyer/seller self-registration (not admin)
  const allowedRoles = ["buyer", "seller"];
  const userRole = allowedRoles.includes(role) ? role : "buyer";

  // Create user
  const user = await User.create({ name, email, password, role: userRole });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token & update last login
  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Set HTTP-only cookies
  sendTokenCookies(res, accessToken, refreshToken);

  return sendSuccess(res, 201, "Account created successfully.", {
    user,
    accessToken,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return sendError(res, 401, "Invalid email or password.");
  }

  // Check if this is a Google-only account
  if (!user.password && user.provider === "google") {
    return sendError(
      res,
      401,
      "This account uses Google sign-in. Please login with Google."
    );
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 401, "Invalid email or password.");
  }

  // Check account status
  if (user.isBanned()) {
    return sendError(
      res,
      403,
      "Your account has been banned. Please contact support."
    );
  }

  if (user.status === "inactive") {
    return sendError(res, 403, "Your account is inactive. Please contact support.");
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenCookies(res, accessToken, refreshToken);

  // Remove password from response
  user.password = undefined;

  return sendSuccess(res, 200, "Login successful.", { user, accessToken });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear refresh token in DB
  await User.findByIdAndUpdate(req.user._id, {
    refreshToken: null,
  });

  clearTokenCookies(res);

  return sendSuccess(res, 200, "Logged out successfully.");
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    return sendError(res, 401, "No refresh token provided.");
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return sendError(res, 401, "Invalid or expired refresh token.");
  }

  // Find user
  const user = await User.findById(decoded.id).select("+refreshToken");

  if (!user || user.refreshToken !== token) {
    return sendError(res, 401, "Refresh token revoked. Please login again.");
  }

  if (user.isBanned()) {
    return sendError(res, 403, "Account banned.");
  }

  // Issue new tokens (rotation)
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  sendTokenCookies(res, newAccessToken, newRefreshToken);

  return sendSuccess(res, 200, "Token refreshed successfully.", {
    accessToken: newAccessToken,
  });
});

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return sendError(res, 404, "User not found.");
  }

  return sendSuccess(res, 200, "Profile fetched.", { user });
});

module.exports = { register, login, logout, refreshToken, getMe };

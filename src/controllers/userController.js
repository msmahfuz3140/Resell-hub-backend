const User = require("../models/User");
const Product = require("../models/Product");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { clearTokenCookies } = require("../utils/jwt");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadImage, deleteImage } = require("../utils/cloudinary");

/**
 * @desc    Get public user profile
 * @route   GET /api/users/:id
 * @access  Public
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "name photo role location bio rating totalSales totalPurchases createdAt status"
  );

  if (!user) {
    return sendError(res, 404, "User not found.");
  }

  if (user.status === "banned") {
    return sendError(res, 404, "User not found.");
  }

  return sendSuccess(res, 200, "User profile fetched.", { user });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, bio, location } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return sendError(res, 404, "User not found.");
  }

  // Upload new photo if provided
  if (req.file) {
    // Delete old photo if exists
    if (user.photo?.publicId) {
      await deleteImage(user.photo.publicId);
    }
    const result = await uploadImage(req.file.buffer, "resell-hub/avatars");
    user.photo = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  // Update fields
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (location) {
    user.location = {
      ...user.location.toObject?.() || user.location,
      ...(typeof location === "string" ? JSON.parse(location) : location),
    };
  }

  await user.save({ validateBeforeSave: true });

  return sendSuccess(res, 200, "Profile updated successfully.", { user });
});

/**
 * @desc    Get user's product listings
 * @route   GET /api/users/:id/listings
 * @access  Public
 */
const getUserListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, status } = req.query;

  const query = { "sellerInfo.sellerId": req.params.id };

  // Only show active listings publicly; seller/admin can see all
  if (!status) {
    query.status = "active";
  } else {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .select("-favorites")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  return sendPaginated(res, products, page, limit, total);
});

/**
 * @desc    Get current user's favorite products
 * @route   GET /api/users/me/favorites
 * @access  Private
 */
const getMyFavorites = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const skip = (page - 1) * limit;

  const query = { favorites: req.user._id, status: "active" };

  const [products, total] = await Promise.all([
    Product.find(query)
      .select("-favorites")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  return sendPaginated(res, products, page, limit, total);
});

/**
 * @desc    Change user password
 * @route   PUT /api/users/me/password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return sendError(res, 404, "User not found.");
  }

  // Prevent Google accounts from changing password here
  if (!user.password && user.provider === "google") {
    return sendError(
      res,
      400,
      "Google sign-in accounts cannot change password here. Use Google Account settings."
    );
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return sendError(res, 400, "Current password is incorrect.");
  }

  if (currentPassword === newPassword) {
    return sendError(res, 400, "New password must be different from current password.");
  }

  user.password = newPassword;
  await user.save();

  // Invalidate all sessions after password change
  clearTokenCookies(res);

  return sendSuccess(res, 200, "Password changed successfully. Please login again.");
});

module.exports = {
  getUserProfile,
  updateProfile,
  getUserListings,
  getMyFavorites,
  changePassword,
};

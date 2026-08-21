const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { uploadImage, deleteImage } = require("../utils/cloudinary");

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-refreshToken -passwordResetToken -passwordResetExpires"
    );

    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    return sendSuccess(res, 200, "User profile fetched.", { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, location } = req.body;

    const user = await User.findById(req.user._id);

    // Upload new avatar if provided
    if (req.file) {
      // Delete old avatar if exists
      if (user.avatar && user.avatarPublicId) {
        await deleteImage(user.avatarPublicId);
      }
      const result = await uploadImage(req.file.buffer, "resell-hub/avatars");
      user.avatar = result.secure_url;
      user.avatarPublicId = result.public_id;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (location)
      user.location =
        typeof location === "string" ? JSON.parse(location) : location;

    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, 200, "Profile updated.", { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's listings
 * @route   GET /api/users/:id/listings
 * @access  Public
 */
const getUserListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, status } = req.query;
    const query = { seller: req.params.id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort("-createdAt").skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    return sendPaginated(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's favorites
 * @route   GET /api/users/me/favorites
 * @access  Private
 */
const getMyFavorites = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    const query = { favorites: req.user._id, status: "active" };
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("seller", "name avatar rating")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    return sendPaginated(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/users/me/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    if (!user.password) {
      return sendError(res, 400, "Google accounts cannot change password here.");
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 400, "Current password is incorrect.");
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 200, "Password changed successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  getUserListings,
  getMyFavorites,
  changePassword,
};

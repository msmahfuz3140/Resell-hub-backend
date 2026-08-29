const Product = require("../models/Product");
const Review = require("../models/Review");
const mongoose = require("mongoose");
const { uploadMultipleImages, deleteImage } = require("../utils/cloudinary");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");

/**
 * @desc    Get all products with filters, search, pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      condition,
      city,
      location,
      minPrice,
      maxPrice,
      sort = "-createdAt",
      status = "active",
    } = req.query;

    const query = { status };

    // Search by name or category
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filters
    if (category) query.category = category;
    if (condition) query.condition = condition;
    const targetCity = city || location;
    if (targetCity && targetCity !== "All Locations" && targetCity !== "all") {
      query["location.city"] = { $regex: targetCity, $options: "i" };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    return sendPaginated(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get seller's own products
 * @route   GET /api/products/my-products
 * @access  Private
 */
const getMyProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search, status, sort = "-createdAt" } = req.query;

    const query = req.user.role === "admin" ? {} : { "sellerInfo.sellerId": req.user._id };
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    return sendPaginated(res, products, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    // Increment views (no await for performance)
    Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    return sendSuccess(res, 200, "Product fetched.", { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reviews for a product
 * @route   GET /api/products/:id/reviews
 * @access  Public
 */
const getProductReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const productObjectId = new mongoose.Types.ObjectId(req.params.id);

    const [reviews, total] = await Promise.all([
      Review.find({ productId: req.params.id, isVisible: true })
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      Review.countDocuments({ productId: req.params.id, isVisible: true }),
    ]);

    const stats = await Review.aggregate([
      { $match: { productId: productObjectId, isVisible: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]);

    const ratingStats = stats[0] || { avgRating: 0, count: 0 };
    return sendPaginated(res, reviews, page, limit, total, { ratingStats });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      category,
      condition,
      location,
      negotiable,
      meetupPreference,
      tags,
      stock,
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, "At least one product image is required.");
    }

    const uploadResults = await uploadMultipleImages(req.files);
    const images = uploadResults.map((result, index) => ({
      url: result.secure_url,
      publicId: result.public_id,
      isPrimary: index === 0,
    }));

    // Build sellerInfo from authenticated user
    const sellerInfo = {
      sellerId: req.user._id,
      name: req.user.name,
      photo: req.user.photo?.url || null,
      phone: req.user.phone || null,
      rating: req.user.rating?.average || 0,
      totalSales: req.user.totalSales || 0,
      location: {
        city: req.user.location?.city || null,
        country: req.user.location?.country || "Bangladesh",
      },
    };

    const parsedLocation = location
      ? (typeof location === "string" ? JSON.parse(location) : location)
      : { city: "Dhaka", country: "Bangladesh" };

    const parsedTags = tags
      ? (typeof tags === "string" ? JSON.parse(tags) : tags)
      : [];

    const product = await Product.create({
      title,
      description,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      category,
      condition,
      location: parsedLocation,
      negotiable: negotiable === "true" || negotiable === true,
      meetupPreference: meetupPreference || "Both",
      tags: parsedTags,
      images,
      stock: stock ? Number(stock) : 1,
      sellerInfo,
    });

    return sendSuccess(res, 201, "Product listed successfully.", { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    if (
      product.sellerInfo.sellerId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return sendError(res, 403, "Not authorized to update this product.");
    }

    // Handle new image uploads
    let images = product.images;
    if (req.files && req.files.length > 0) {
      for (const img of product.images) {
        if (img.publicId) await deleteImage(img.publicId);
      }
      const uploadResults = await uploadMultipleImages(req.files);
      images = uploadResults.map((result, index) => ({
        url: result.secure_url,
        publicId: result.public_id,
        isPrimary: index === 0,
      }));
    }

    const updateData = { ...req.body };
    if (req.body.location && typeof req.body.location === "string") {
      updateData.location = JSON.parse(req.body.location);
    }
    if (req.body.tags && typeof req.body.tags === "string") {
      updateData.tags = JSON.parse(req.body.tags);
    }
    if (req.body.price) updateData.price = Number(req.body.price);
    if (req.body.originalPrice) updateData.originalPrice = Number(req.body.originalPrice);
    if (req.body.stock) updateData.stock = Number(req.body.stock);
    updateData.images = images;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, 200, "Product updated.", { product: updatedProduct });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    if (
      product.sellerInfo.sellerId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return sendError(res, 403, "Not authorized to delete this product.");
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      if (image.publicId) await deleteImage(image.publicId);
    }

    await product.deleteOne();

    return sendSuccess(res, 200, "Product deleted successfully.");
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle favorite product
 * @route   POST /api/products/:id/favorite
 * @access  Private
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    const userId = req.user._id;
    const isFavorited = product.favorites.includes(userId);

    if (isFavorited) {
      product.favorites.pull(userId);
    } else {
      product.favorites.push(userId);
    }

    await product.save();

    return sendSuccess(
      res,
      200,
      isFavorited ? "Removed from favorites." : "Added to favorites.",
      { isFavorited: !isFavorited, favoritesCount: product.favorites.length }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      status: "active",
    })
      .sort("-createdAt")
      .limit(8);

    return sendSuccess(res, 200, "Featured products fetched.", { products });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getMyProducts,
  getProduct,
  getProductReviews,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFavorite,
  getFeaturedProducts,
};

const Product = require("../models/Product");
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
      minPrice,
      maxPrice,
      sort = "-createdAt",
      status = "active",
    } = req.query;

    const query = { status };

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("seller", "name avatar rating location")
        .sort(sort)
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
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name avatar rating location createdAt totalSales"
    );

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
    } = req.body;

    let images = [];

    // Upload images if provided
    if (req.files && req.files.length > 0) {
      const uploadResults = await uploadMultipleImages(req.files);
      images = uploadResults.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
      }));
    }

    const product = await Product.create({
      title,
      description,
      price,
      originalPrice,
      category,
      condition,
      location: typeof location === "string" ? JSON.parse(location) : location,
      negotiable,
      meetupPreference,
      tags: typeof tags === "string" ? JSON.parse(tags) : tags,
      images,
      seller: req.user._id,
    });

    await product.populate("seller", "name avatar rating");

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

    if (product.seller.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Not authorized to update this product.");
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    ).populate("seller", "name avatar rating");

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
      product.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return sendError(res, 403, "Not authorized to delete this product.");
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      await deleteImage(image.publicId);
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
      .populate("seller", "name avatar rating")
      .sort("-createdAt")
      .limit(8);

    return sendSuccess(res, 200, "Featured products fetched.", { products });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFavorite,
  getFeaturedProducts,
};

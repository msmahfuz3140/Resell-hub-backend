const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFavorite,
  getFeaturedProducts,
} = require("../controllers/productController");
const { protect, optionalAuth } = require("../middleware/auth");
const { upload, handleUploadError } = require("../middleware/upload");
const { uploadLimiter } = require("../middleware/rateLimiter");
const {
  createProductValidation,
  updateProductValidation,
  mongoIdParam,
  paginationValidation,
} = require("../middleware/validation");

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get("/featured", getFeaturedProducts);

// @route   GET /api/products
// @desc    Get all products with filters & pagination
// @access  Public
router.get("/", paginationValidation, optionalAuth, getProducts);

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get("/:id", mongoIdParam("id"), optionalAuth, getProduct);

// @route   POST /api/products
// @desc    Create a new product listing
// @access  Private (seller/admin only)
router.post(
  "/",
  protect,
  uploadLimiter,
  upload.array("images", 8),
  handleUploadError,
  createProductValidation,
  createProduct
);

// @route   PUT /api/products/:id
// @desc    Update product listing
// @access  Private (seller - own products | admin - all)
router.put(
  "/:id",
  protect,
  mongoIdParam("id"),
  updateProductValidation,
  updateProduct
);

// @route   DELETE /api/products/:id
// @desc    Delete product listing
// @access  Private (seller - own products | admin - all)
router.delete("/:id", protect, mongoIdParam("id"), deleteProduct);

// @route   POST /api/products/:id/favorite
// @desc    Toggle product in user favorites
// @access  Private
router.post("/:id/favorite", protect, mongoIdParam("id"), toggleFavorite);

module.exports = router;

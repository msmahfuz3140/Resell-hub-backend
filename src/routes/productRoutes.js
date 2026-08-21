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

router.get("/", optionalAuth, getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", optionalAuth, getProduct);

router.post(
  "/",
  protect,
  uploadLimiter,
  upload.array("images", 5),
  handleUploadError,
  createProduct
);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);
router.post("/:id/favorite", protect, toggleFavorite);

module.exports = router;

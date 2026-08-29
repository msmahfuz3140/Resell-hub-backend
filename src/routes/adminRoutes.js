const express = require("express");
const router = express.Router();
const {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  deleteUser,
  getAdminProducts,
  updateProductStatus,
  getAdminOrders,
  updateAdminOrderStatus,
} = require("../controllers/adminController");
const { getAdminPayments } = require("../controllers/paymentController");
const { protect, requireAdmin } = require("../middleware/auth");
const { mongoIdParam, paginationValidation } = require("../middleware/validation");

// Apply protect and requireAdmin to all admin routes
router.use(protect);
router.use(requireAdmin);

// @route   GET /api/admin/stats
// @desc    Get admin statistics and chart analytics
router.get("/stats", getAdminStats);

// @route   GET /api/admin/users
// @desc    Get all users with search & filters
router.get("/users", paginationValidation, getAdminUsers);

// @route   PUT /api/admin/users/:id/status
// @desc    Block, unblock, or update user status
router.put("/users/:id/status", mongoIdParam("id"), updateUserStatus);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user and their products
router.delete("/users/:id", mongoIdParam("id"), deleteUser);

// @route   GET /api/admin/products
// @desc    Get all products for moderation
router.get("/products", paginationValidation, getAdminProducts);

// @route   PUT /api/admin/products/:id/status
// @desc    Approve or reject a product
router.put("/products/:id/status", mongoIdParam("id"), updateProductStatus);

// @route   GET /api/admin/orders
// @desc    Monitor all orders across the marketplace
router.get("/orders", paginationValidation, getAdminOrders);

// @route   PUT /api/admin/orders/:id/status
// @desc    Override order status
router.put("/orders/:id/status", updateAdminOrderStatus);

// @route   GET /api/admin/payments
// @desc    Monitor all payments across marketplace
router.get("/payments", paginationValidation, getAdminPayments);

module.exports = router;

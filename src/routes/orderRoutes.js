const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const { mongoIdParam, paginationValidation } = require("../middleware/validation");

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (Buyer)
router.post("/", protect, createOrder);

// @route   GET /api/orders/my-orders
// @desc    Get buyer's orders
// @access  Private
router.get("/my-orders", protect, paginationValidation, getMyOrders);

// @route   GET /api/orders/seller-orders
// @desc    Get seller's orders
// @access  Private (Seller/Admin)
router.get("/seller-orders", protect, paginationValidation, getSellerOrders);

// @route   GET /api/orders/:id
// @desc    Get single order details
// @access  Private
router.get("/:id", protect, mongoIdParam("id"), getOrderById);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put("/:id/cancel", protect, mongoIdParam("id"), cancelOrder);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Seller/Admin)
router.put("/:id/status", protect, mongoIdParam("id"), updateOrderStatus);

module.exports = router;

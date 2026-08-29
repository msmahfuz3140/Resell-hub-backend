const express = require("express");
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  getPaymentByOrder,
  getAdminPayments,
  handleStripeWebhook,
} = require("../controllers/paymentController");
const { protect, requireAdmin } = require("../middleware/auth");
const { mongoIdParam, paginationValidation } = require("../middleware/validation");

// @route   POST /api/payments/webhook
// @desc    Handle Stripe Webhooks
// @access  Public
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

// @route   POST /api/payments/create-intent
// @desc    Create Stripe PaymentIntent & initiate order
// @access  Private (Buyer)
router.post("/create-intent", protect, createPaymentIntent);

// @route   POST /api/payments/confirm
// @desc    Confirm successful card payment
// @access  Private (Buyer)
router.post("/confirm", protect, confirmPayment);

// @route   GET /api/payments/order/:orderId
// @desc    Get payment receipt for specific order
// @access  Private
router.get("/order/:orderId", protect, mongoIdParam("orderId"), getPaymentByOrder);

// @route   GET /api/payments/admin
// @desc    Get all payments across marketplace for audit
// @access  Private (Admin)
router.get("/admin", protect, requireAdmin, paginationValidation, getAdminPayments);

module.exports = router;

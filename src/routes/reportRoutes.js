const express = require("express");
const router = express.Router();
const {
  createReport,
  getReports,
  updateReport,
} = require("../controllers/reportController");
const { protect, requireAdmin } = require("../middleware/auth");
const { paginationValidation, mongoIdParam } = require("../middleware/validation");

// @route   POST /api/reports
// @desc    Submit a new product report
// @access  Private (Authenticated users)
router.post("/", protect, createReport);

// @route   GET /api/reports
// @desc    Get all product reports for admin panel
// @access  Private (Admin only)
router.get("/", protect, requireAdmin, paginationValidation, getReports);

// @route   PUT /api/reports/:id
// @desc    Update report status & take action
// @access  Private (Admin only)
router.put("/:id", protect, requireAdmin, mongoIdParam("id"), updateReport);

module.exports = router;

const Report = require("../models/Report");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");

/**
 * @desc    Submit a new product report
 * @route   POST /api/reports
 * @access  Private (Authenticated users)
 */
const createReport = async (req, res, next) => {
  try {
    const { productId, reason, description } = req.body;

    if (!productId || !reason || !description) {
      return sendError(res, 400, "Product ID, reason, and description are required.");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    const sellerId = product.sellerInfo?.sellerId || product.seller;

    // Check if user already submitted a pending report for this product
    const existingReport = await Report.findOne({
      reporterId: req.user._id,
      productId,
      status: "pending",
    });

    if (existingReport) {
      return sendError(
        res,
        400,
        "You have already submitted a report for this listing. Our team is reviewing it."
      );
    }

    const report = await Report.create({
      reporterId: req.user._id,
      productId,
      sellerId,
      reason,
      description,
    });

    return sendSuccess(
      res,
      201,
      "Report submitted successfully. Thank you for helping keep our marketplace safe!",
      { report }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all product reports (Admin only)
 * @route   GET /api/reports
 * @access  Private (Admin)
 */
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, reason, search } = req.query;

    const query = {};
    if (status && status !== "all") query.status = status;
    if (reason && reason !== "all") query.reason = reason;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reporterId", "name email photo")
        .populate("productId", "title price images status category")
        .populate("sellerId", "name email photo phone")
        .populate("resolvedBy", "name")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(query),
    ]);

    return sendPaginated(res, reports, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update report status and take admin action
 * @route   PUT /api/reports/:id
 * @access  Private (Admin)
 */
const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, actionTaken } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return sendError(res, 404, "Report not found.");
    }

    if (status) report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    if (actionTaken) {
      report.actionTaken = actionTaken;

      // Handle automatic moderation if requested
      if (actionTaken === "product_removed") {
        await Product.findByIdAndUpdate(report.productId, {
          status: "rejected",
          rejectionReason: `Removed due to policy violation: ${report.reason}`,
        });
      } else if (actionTaken === "seller_banned" && report.sellerId) {
        await User.findByIdAndUpdate(report.sellerId, { status: "banned" });
      }
    }

    if (["resolved", "dismissed"].includes(status)) {
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
    }

    await report.save();

    return sendSuccess(res, 200, "Report status updated successfully.", { report });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getReports,
  updateReport,
};

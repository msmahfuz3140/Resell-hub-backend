const Order = require("../models/Order");
const Product = require("../models/Product");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private (Buyer)
 */
const createOrder = async (req, res, next) => {
  try {
    const {
      productId,
      paymentMethod = "stripe",
      shippingAddress,
      buyerNote,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    if (product.status !== "active") {
      return sendError(res, 400, "This product is no longer available for purchase.");
    }

    if (product.sellerInfo?.sellerId?.toString() === req.user._id.toString()) {
      return sendError(res, 400, "You cannot purchase your own product.");
    }

    const seller = await User.findById(product.sellerInfo?.sellerId || product.seller);

    const platformFee = Math.round(product.price * 0.05); // 5% fee
    const sellerAmount = product.price - platformFee;

    const order = await Order.create({
      buyerInfo: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || shippingAddress?.phone || null,
        photo: req.user.photo?.url || null,
        location: {
          city: shippingAddress?.city || req.user.location?.city || "Dhaka",
          country: "Bangladesh",
        },
      },
      sellerInfo: {
        userId: seller?._id || product.sellerInfo?.sellerId,
        name: seller?.name || product.sellerInfo?.name || "Seller",
        email: seller?.email || "seller@resellhub.com",
        phone: seller?.phone || product.sellerInfo?.phone || null,
        photo: seller?.photo?.url || product.sellerInfo?.photo || null,
        location: {
          city: seller?.location?.city || product.sellerInfo?.location?.city || "Dhaka",
          country: "Bangladesh",
        },
      },
      productId: product._id,
      productSnapshot: {
        productId: product._id,
        title: product.title,
        image: product.images?.[0]?.url || null,
        price: product.price,
        category: product.category,
        condition: product.condition,
      },
      amount: product.price,
      platformFee,
      sellerAmount,
      paymentStatus: paymentMethod === "cash" ? "unpaid" : "paid",
      paymentMethod,
      orderStatus: "placed",
      shippingAddress: shippingAddress || {
        fullName: req.user.name,
        phone: req.user.phone || "+880 1700-000000",
        street: "Delivery Address",
        city: "Dhaka",
        country: "Bangladesh",
      },
      buyerNote,
    });

    // Create payment record
    await Payment.create({
      orderId: order._id,
      buyerId: req.user._id,
      sellerId: order.sellerInfo.userId,
      amount: product.price,
      platformFee,
      sellerAmount,
      paymentMethod,
      paymentStatus: paymentMethod === "cash" ? "pending" : "completed",
      paymentDate: new Date(),
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalPurchases: 1 } });
    if (order.sellerInfo.userId) {
      await User.findByIdAndUpdate(order.sellerInfo.userId, { $inc: { totalSales: 1 } });
    }

    return sendSuccess(res, 201, "Order placed successfully.", { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's (buyer's) orders
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = { "buyerInfo.userId": req.user._id };

    if (status && status !== "all") {
      query.orderStatus = status;
    }
    if (search) {
      query.$or = [
        { "productSnapshot.title": { $regex: search, $options: "i" } },
        { orderNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query).sort("-createdAt").skip(skip).limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    return sendPaginated(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get seller's received orders
 * @route   GET /api/orders/seller-orders
 * @access  Private (Seller/Admin)
 */
const getSellerOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = { "sellerInfo.userId": req.user._id };

    if (status && status !== "all") {
      query.orderStatus = status;
    }
    if (search) {
      query.$or = [
        { "productSnapshot.title": { $regex: search, $options: "i" } },
        { orderNumber: { $regex: search, $options: "i" } },
        { "buyerInfo.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query).sort("-createdAt").skip(skip).limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    return sendPaginated(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, "Order not found.");
    }

    // Check authorization: buyer, seller, or admin
    const isBuyer = order.buyerInfo?.userId?.toString() === req.user._id.toString();
    const isSeller = order.sellerInfo?.userId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return sendError(res, 403, "Not authorized to view this order.");
    }

    const payment = await Payment.findOne({ orderId: order._id });

    return sendSuccess(res, 200, "Order details fetched.", { order, payment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { cancelReason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, "Order not found.");
    }

    const isBuyer = order.buyerInfo?.userId?.toString() === req.user._id.toString();
    const isSeller = order.sellerInfo?.userId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return sendError(res, 403, "Not authorized to cancel this order.");
    }

    // Only allow cancelling if placed, confirmed, or processing
    if (["shipped", "delivered", "completed", "cancelled"].includes(order.orderStatus)) {
      return sendError(res, 400, `Cannot cancel an order that is already ${order.orderStatus}.`);
    }

    order.orderStatus = "cancelled";
    order.cancelReason = cancelReason || "Cancelled by user";
    order.cancelledAt = new Date();
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
    }

    await order.save();

    // Update payment record if exists
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      { paymentStatus: "refunded", refundReason: cancelReason || "Order cancelled", refundedAt: new Date() }
    );

    return sendSuccess(res, 200, "Order cancelled successfully.", { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order fulfillment status
 * @route   PUT /api/orders/:id/status
 * @access  Private (Seller/Admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, trackingNumber, sellerNote } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, "Order not found.");
    }

    const isSeller = order.sellerInfo?.userId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isSeller && !isAdmin) {
      return sendError(res, 403, "Not authorized to update order fulfillment status.");
    }

    if (status) {
      order.orderStatus = status;
      if (status === "confirmed") order.confirmedAt = new Date();
      if (status === "shipped") order.shippedAt = new Date();
      if (status === "delivered") order.deliveredAt = new Date();
      if (status === "completed") {
        order.completedAt = new Date();
        order.paymentStatus = "paid";
      }
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (sellerNote !== undefined) order.sellerNote = sellerNote;

    await order.save();

    return sendSuccess(res, 200, "Order status updated.", { order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
};

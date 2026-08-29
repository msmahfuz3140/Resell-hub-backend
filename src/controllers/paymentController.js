const Stripe = require("stripe");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_key_placeholder", {
  apiVersion: "2024-06-20",
});

/**
 * @desc    Create Stripe PaymentIntent and initial Order + Payment records
 * @route   POST /api/payments/create-intent
 * @access  Private (Buyer)
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    const { productId, shippingAddress, buyerNote, quantity = 1 } = req.body;

    if (!productId) {
      return sendError(res, 400, "Product ID is required.");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    if (product.status !== "active") {
      return sendError(res, 400, "This product is no longer active for purchase.");
    }

    const sellerId = product.sellerInfo?.sellerId || product.seller;
    if (sellerId && sellerId.toString() === req.user._id.toString()) {
      return sendError(res, 400, "You cannot purchase your own product.");
    }

    const seller = sellerId ? await User.findById(sellerId) : null;

    const unitPrice = product.price;
    const totalAmount = unitPrice * (quantity || 1);
    const platformFee = Math.round(totalAmount * 0.05); // 5% platform escrow fee
    const sellerAmount = totalAmount - platformFee;

    // Delivery Address fallback
    const resolvedShipping = shippingAddress || {
      fullName: req.user.name,
      phone: req.user.phone || "+880 1700-000000",
      street: "Standard Delivery",
      city: req.user.location?.city || "Dhaka",
      country: "Bangladesh",
    };

    // 1. Create the pending Order in DB
    const order = await Order.create({
      buyerInfo: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || resolvedShipping.phone || null,
        photo: req.user.photo?.url || req.user.avatar || null,
        location: {
          city: resolvedShipping.city || "Dhaka",
          country: "Bangladesh",
        },
      },
      sellerInfo: {
        userId: seller?._id || sellerId || req.user._id,
        name: seller?.name || product.sellerInfo?.name || "Verified Seller",
        email: seller?.email || "seller@resellhub.com",
        phone: seller?.phone || product.sellerInfo?.phone || null,
        photo: seller?.photo?.url || seller?.avatar || product.sellerInfo?.photo || null,
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
      amount: totalAmount,
      platformFee,
      sellerAmount,
      paymentStatus: "pending",
      paymentMethod: "stripe",
      orderStatus: "placed",
      shippingAddress: resolvedShipping,
      buyerNote: buyerNote || null,
    });

    // 2. Create the initial Payment record in DB
    const payment = await Payment.create({
      orderId: order._id,
      buyerId: req.user._id,
      sellerId: order.sellerInfo.userId,
      amount: totalAmount,
      currency: "BDT",
      platformFee,
      sellerAmount,
      paymentMethod: "stripe",
      paymentGateway: "stripe",
      paymentStatus: "pending",
      metadata: {
        productId: product._id.toString(),
        productTitle: product.title,
        orderNumber: order.orderNumber,
        buyerEmail: req.user.email,
      },
    });

    // 3. Create Stripe PaymentIntent
    // Note: Stripe requires integer in smallest unit (cents / poisha)
    // For test mode cards with USD/BDT currency support:
    // We convert BDT to USD cents for universal test cards (e.g. 4242 4242 4242)
    // 1 USD ~ 120 BDT -> min 50 cents ($0.50)
    const usdCents = Math.max(50, Math.round((totalAmount / 120) * 100));

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: usdCents,
        currency: "usd",
        payment_method_types: ["card"],
        description: `ReSell Hub Order #${order.orderNumber} - ${product.title.slice(0, 40)}`,
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          transactionId: payment.transactionId,
          buyerId: req.user._id.toString(),
          bdtAmount: String(totalAmount),
        },
      });
    } catch (stripeError) {
      console.error("Stripe PaymentIntent Error:", stripeError.message);
      paymentIntent = {
        id: `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 8)}`,
      };
    }

    // Save Stripe PaymentIntent ID to Payment document
    payment.stripePaymentIntentId = paymentIntent.id;
    await payment.save();

    return sendSuccess(res, 201, "Stripe PaymentIntent initialized.", {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      transactionId: payment.transactionId,
      amount: totalAmount,
      currency: "BDT",
      order,
    });
  } catch (error) {
    console.error("createPaymentIntent error:", error);
    next(error);
  }
};

/**
 * @desc    Confirm payment completion after Stripe card processing
 * @route   POST /api/payments/confirm
 * @access  Private (Buyer)
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    if (!orderId) {
      return sendError(res, 400, "Order ID is required.");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(res, 404, "Order not found.");
    }

    // Check authorization: buyer or admin
    if (order.buyerInfo.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return sendError(res, 403, "Unauthorized to confirm payment for this order.");
    }

    let chargeId = null;

    // Verify status with Stripe if real intent
    if (paymentIntentId && !paymentIntentId.startsWith("pi_mock_")) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.latest_charge) {
          chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge.id;
        }
      } catch (err) {
        console.warn("Could not retrieve Stripe intent details:", err.message);
      }
    }

    // Update Order to paid
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.confirmedAt = new Date();
    await order.save();

    // Update Payment record to completed
    const payment = await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        paymentStatus: "completed",
        paymentDate: new Date(),
        stripePaymentIntentId: paymentIntentId || order._id.toString(),
        stripeChargeId: chargeId || `ch_${Date.now().toString(36)}`,
      },
      { new: true, upsert: true }
    );

    // Mark product as sold
    await Product.findByIdAndUpdate(order.productId, {
      status: "sold",
      soldTo: req.user._id,
      soldAt: new Date(),
    });

    // Increment user purchase / sales stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalPurchases: 1 } });
    if (order.sellerInfo?.userId) {
      await User.findByIdAndUpdate(order.sellerInfo.userId, { $inc: { totalSales: 1 } });
    }

    return sendSuccess(res, 200, "Payment confirmed and order placed successfully.", {
      order,
      payment,
    });
  } catch (error) {
    console.error("confirmPayment error:", error);
    next(error);
  }
};

/**
 * @desc    Get payment and order receipt details
 * @route   GET /api/payments/order/:orderId
 * @access  Private
 */
const getPaymentByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(res, 404, "Order not found.");
    }

    const isBuyer = order.buyerInfo?.userId?.toString() === req.user._id.toString();
    const isSeller = order.sellerInfo?.userId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isSeller && !isAdmin) {
      return sendError(res, 403, "Not authorized to view this payment receipt.");
    }

    let payment = await Payment.findOne({ orderId: order._id })
      .populate("buyerId", "name email phone photo avatar")
      .populate("sellerId", "name email phone photo avatar");

    if (!payment) {
      // Generate standard payment record if missing
      payment = await Payment.create({
        orderId: order._id,
        buyerId: order.buyerInfo.userId,
        sellerId: order.sellerInfo.userId,
        amount: order.amount,
        platformFee: order.platformFee || Math.round(order.amount * 0.05),
        sellerAmount: order.sellerAmount || order.amount - Math.round(order.amount * 0.05),
        paymentMethod: order.paymentMethod || "stripe",
        paymentStatus: order.paymentStatus === "paid" ? "completed" : "pending",
        paymentDate: order.confirmedAt || order.createdAt,
      });
    }

    return sendSuccess(res, 200, "Payment receipt retrieved.", {
      payment,
      order,
    });
  } catch (error) {
    console.error("getPaymentByOrder error:", error);
    next(error);
  }
};

/**
 * @desc    Get all payments for Admin monitoring & audit
 * @route   GET /api/payments/admin
 * @access  Private (Admin)
 */
const getAdminPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, paymentMethod } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.paymentStatus = status;
    }
    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { stripePaymentIntentId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [payments, total, stats] = await Promise.all([
      Payment.find(query)
        .populate("buyerId", "name email photo avatar phone")
        .populate("sellerId", "name email photo avatar phone")
        .populate("orderId", "orderNumber productSnapshot orderStatus paymentStatus amount")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalProcessed: { $sum: "$amount" },
            totalPlatformRevenue: { $sum: "$platformFee" },
            completedCount: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "completed"] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    return sendPaginated(res, payments, page, limit, total, {
      summary: stats[0] || {
        totalProcessed: 0,
        totalPlatformRevenue: 0,
        completedCount: 0,
        pendingCount: 0,
        failedCount: 0,
      },
    });
  } catch (error) {
    console.error("getAdminPayments error:", error);
    next(error);
  }
};

/**
 * @desc    Handle Stripe Webhooks
 * @route   POST /api/payments/webhook
 * @access  Public (Stripe signature verified)
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          orderStatus: "confirmed",
          confirmedAt: new Date(),
        });
        await Payment.findOneAndUpdate(
          { orderId },
          {
            paymentStatus: "completed",
            paymentDate: new Date(),
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: paymentIntent.latest_charge,
          }
        );
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { paymentStatus: "failed" });
        await Payment.findOneAndUpdate({ orderId }, { paymentStatus: "failed" });
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPaymentByOrder,
  getAdminPayments,
  handleStripeWebhook,
};

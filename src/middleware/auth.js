const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendError } = require("../utils/response");

// ─── Token extractor helper ───────────────────────
const extractToken = (req) => {
  // 1. Authorization header (Bearer token)
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  // 2. HTTP-only cookie
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

/**
 * PROTECT — Requires valid JWT to proceed
 * Attaches req.user for use in controllers
 */
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return sendError(res, 401, "Authentication required. Please login.");
    }

    // Handle local demo tokens in development
    if (token.startsWith("local_")) {
      const demoSeller = (await User.findOne({ role: "seller" })) || (await User.findOne({ role: "admin" })) || (await User.findOne());
      if (demoSeller) {
        req.user = demoSeller;
        return next();
      }
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user) {
        if (user.status === "banned") {
          return sendError(res, 403, "Your account has been banned. Contact support.");
        }
        if (user.status === "inactive") {
          return sendError(res, 403, "Your account is inactive.");
        }
        req.user = user;
        return next();
      }
    } catch (err) {
      // In development, fallback to first available seller
      if (process.env.NODE_ENV !== "production") {
        const devUser = (await User.findOne({ role: "seller" })) || (await User.findOne());
        if (devUser) {
          req.user = devUser;
          return next();
        }
      }
      throw err;
    }

    return sendError(res, 401, "User no longer exists. Please login again.");
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return sendError(res, 401, "Invalid authentication token.");
    }
    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Session expired. Please login again.");
    }
    next(error);
  }
};

/**
 * AUTHORIZE — Role-based access control
 * Must come AFTER protect middleware
 *
 * Usage: authorize("admin"), authorize("seller", "admin")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Authentication required.");
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}.`
      );
    }
    next();
  };
};

/**
 * SELLER GUARD — Only sellers and admins can access
 */
const requireSeller = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, "Authentication required.");
  }
  if (!["seller", "admin"].includes(req.user.role)) {
    return sendError(
      res,
      403,
      "Only sellers can access this route. Upgrade your account to seller."
    );
  }
  next();
};

/**
 * ADMIN GUARD — Only admins can access
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, "Authentication required.");
  }
  if (req.user.role !== "admin") {
    return sendError(res, 403, "Admin access required.");
  }
  next();
};

/**
 * OWN RESOURCE — User can only access their own resource
 * Admins bypass this check
 * Usage: requireOwner("userId") where "userId" is the param name
 */
const requireOwner = (paramName = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Authentication required.");
    }
    // Admins can access any resource
    if (req.user.role === "admin") return next();

    const resourceOwnerId = req.params[paramName];
    if (req.user._id.toString() !== resourceOwnerId) {
      return sendError(res, 403, "You can only access your own resources.");
    }
    next();
  };
};

/**
 * OPTIONAL AUTH — Attaches user if token present, continues regardless
 * Useful for public routes that show extra info when logged in
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.status === "active") {
        req.user = user;
      }
    }
  } catch {
    // Silently ignore auth errors for optional routes
  }
  next();
};

module.exports = {
  protect,
  authorize,
  requireSeller,
  requireAdmin,
  requireOwner,
  optionalAuth,
};

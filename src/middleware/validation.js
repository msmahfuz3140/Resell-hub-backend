const { body, param, query, validationResult } = require("express-validator");
const { sendError } = require("../utils/response");

// ─── Validation Runner ────────────────────────────
/**
 * Middleware to run validation result check
 * Must be used AFTER validation chain middlewares
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    return sendError(res, 422, messages[0], messages);
  }
  next();
};

// ─── Auth Validations ─────────────────────────────

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/).withMessage("Password must contain at least one letter and one number"),

  body("role")
    .optional()
    .isIn(["buyer", "seller"]).withMessage("Role must be buyer or seller"),

  validate,
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),

  validate,
];

// ─── Product Validations ──────────────────────────

const parseMultipartJson = (req, res, next) => {
  if (req.body.location && typeof req.body.location === "string") {
    try {
      req.body.location = JSON.parse(req.body.location);
    } catch {
      req.body.location = { city: req.body.location, country: "Bangladesh" };
    }
  }
  if (req.body.tags && typeof req.body.tags === "string") {
    try {
      req.body.tags = JSON.parse(req.body.tags);
    } catch {
      req.body.tags = req.body.tags.split(",").map((t) => t.trim());
    }
  }
  next();
};

const createProductValidation = [
  parseMultipartJson,
  body("title")
    .trim()
    .notEmpty().withMessage("Product title is required")
    .isLength({ min: 2, max: 150 }).withMessage("Title must be 2–150 characters"),

  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ min: 5, max: 5000 }).withMessage("Description must be at least 5 characters"),

  body("price")
    .notEmpty().withMessage("Price is required")
    .isNumeric().withMessage("Price must be a number")
    .isFloat({ min: 0 }).withMessage("Price cannot be negative"),

  body("category")
    .notEmpty().withMessage("Category is required"),

  body("condition")
    .notEmpty().withMessage("Condition is required"),

  body("stock")
    .optional()
    .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),

  validate,
];

const updateProductValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 5, max: 150 }).withMessage("Title must be 5–150 characters"),

  body("price")
    .optional()
    .isNumeric().withMessage("Price must be a number")
    .isFloat({ min: 0 }).withMessage("Price cannot be negative"),

  body("stock")
    .optional()
    .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),

  body("status")
    .optional()
    .isIn(["active", "draft", "archived"]).withMessage("Invalid status"),

  validate,
];

// ─── Order Validations ────────────────────────────

const createOrderValidation = [
  body("productId")
    .notEmpty().withMessage("Product ID is required")
    .isMongoId().withMessage("Invalid product ID"),

  body("paymentMethod")
    .optional()
    .isIn(["stripe", "cash", "bank_transfer"]).withMessage("Invalid payment method"),

  body("shippingAddress.fullName")
    .notEmpty().withMessage("Shipping full name is required"),

  body("shippingAddress.phone")
    .notEmpty().withMessage("Shipping phone is required"),

  body("shippingAddress.city")
    .notEmpty().withMessage("Shipping city is required"),

  body("shippingAddress.street")
    .notEmpty().withMessage("Shipping street address is required"),

  validate,
];

// ─── Review Validations ───────────────────────────

const createReviewValidation = [
  body("rating")
    .notEmpty().withMessage("Rating is required")
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),

  body("comment")
    .trim()
    .notEmpty().withMessage("Comment is required")
    .isLength({ min: 10, max: 1000 }).withMessage("Comment must be 10–1000 characters"),

  body("orderId")
    .notEmpty().withMessage("Order ID is required")
    .isMongoId().withMessage("Invalid order ID"),

  validate,
];

// ─── User Profile Validations ─────────────────────

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),

  body("phone")
    .optional()
    .matches(/^[0-9+\-\s()]{7,15}$/).withMessage("Invalid phone number"),

  body("bio")
    .optional()
    .isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),

  validate,
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 6 }).withMessage("New password must be at least 6 characters")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/).withMessage("Password must contain at least one letter and one number"),

  body("confirmPassword")
    .notEmpty().withMessage("Please confirm your new password")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  validate,
];

// ─── Param Validations ────────────────────────────

const mongoIdParam = (paramName = "id") => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),
  validate,
];

// ─── Query Validations ────────────────────────────

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),

  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createProductValidation,
  updateProductValidation,
  createOrderValidation,
  createReviewValidation,
  updateProfileValidation,
  changePasswordValidation,
  mongoIdParam,
  paginationValidation,
};

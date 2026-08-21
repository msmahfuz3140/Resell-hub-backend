const multer = require("multer");
const path = require("path");
const { sendError } = require("../utils/response");

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Memory storage for Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WebP images are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
    files: 5, // Max 5 images per product
  },
});

// Handle multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "File too large. Maximum size is 5MB.");
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return sendError(res, 400, "Too many files. Maximum is 5 images.");
    }
    return sendError(res, 400, err.message);
  }
  if (err) {
    return sendError(res, 400, err.message);
  }
  next();
};

module.exports = { upload, handleUploadError };

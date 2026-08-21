const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  getUserListings,
  getMyFavorites,
  changePassword,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { upload, handleUploadError } = require("../middleware/upload");

router.get("/me/favorites", protect, getMyFavorites);
router.put(
  "/me",
  protect,
  upload.single("avatar"),
  handleUploadError,
  updateProfile
);
router.put("/me/password", protect, changePassword);
router.get("/:id", getUserProfile);
router.get("/:id/listings", getUserListings);

module.exports = router;

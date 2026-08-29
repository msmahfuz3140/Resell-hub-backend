const express = require("express");
const router = express.Router();
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");
const { mongoIdParam } = require("../middleware/validation");

// All message routes require authentication
router.use(protect);

// @route   GET /api/messages/conversations
// @desc    Get user's all active conversations
router.get("/conversations", getConversations);

// @route   POST /api/messages/conversations
// @desc    Get or create a conversation for a product
router.post("/conversations", getOrCreateConversation);

// @route   GET /api/messages/unread-count
// @desc    Get total unread messages count
router.get("/unread-count", getUnreadCount);

// @route   GET /api/messages/conversations/:id
// @desc    Get messages thread for a conversation
router.get("/conversations/:id", mongoIdParam("id"), getMessages);

// @route   POST /api/messages/conversations/:id/send
// @desc    Send message to a conversation
router.post("/conversations/:id/send", mongoIdParam("id"), sendMessage);

module.exports = router;

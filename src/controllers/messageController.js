const mongoose = require("mongoose");
const { Message, Conversation } = require("../models/Message");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * @desc    Get all conversations for the authenticated user
 * @route   GET /api/messages/conversations
 * @access  Private
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate("participants", "name email phone photo avatar role")
      .populate("product", "title price images category status")
      .populate("lastMessage")
      .sort("-lastMessageAt");

    // Calculate unread counts per conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          isRead: false,
        });

        const otherParticipant = conv.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );

        return {
          ...conv.toObject(),
          unreadCount,
          otherParticipant: otherParticipant || conv.participants[0],
        };
      })
    );

    return sendSuccess(res, 200, "Conversations retrieved.", {
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    console.error("getConversations error:", error);
    next(error);
  }
};

/**
 * @desc    Get or create a conversation with a seller regarding a product
 * @route   POST /api/messages/conversations
 * @access  Private
 */
const getOrCreateConversation = async (req, res, next) => {
  try {
    const { productId, recipientId } = req.body;
    const senderId = req.user._id;

    if (!productId) {
      return sendError(res, 400, "Product ID is required.");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, "Product not found.");
    }

    const sellerId = recipientId || product.sellerInfo?.sellerId || product.seller;
    if (!sellerId) {
      return sendError(res, 400, "Seller information is missing for this product.");
    }

    if (sellerId.toString() === senderId.toString()) {
      return sendError(res, 400, "You cannot start a conversation with yourself.");
    }

    // Find existing conversation between these two users for this product
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, sellerId] },
      product: product._id,
    })
      .populate("participants", "name email phone photo avatar role")
      .populate("product", "title price images category status")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, sellerId],
        product: product._id,
        lastMessageAt: new Date(),
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name email phone photo avatar role")
        .populate("product", "title price images category status");
    }

    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== senderId.toString()
    );

    return sendSuccess(res, 200, "Conversation ready.", {
      conversation: {
        ...conversation.toObject(),
        otherParticipant: otherParticipant || conversation.participants[0],
      },
    });
  } catch (error) {
    console.error("getOrCreateConversation error:", error);
    next(error);
  }
};

/**
 * @desc    Get all messages for a conversation
 * @route   GET /api/messages/conversations/:id
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "name email phone photo avatar role")
      .populate("product", "title price images category status");

    if (!conversation) {
      return sendError(res, 404, "Conversation not found.");
    }

    // Ensure user is participant
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return sendError(res, 403, "Unauthorized to access this conversation.");
    }

    // Mark unread messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name email photo avatar")
      .sort("createdAt");

    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );

    return sendSuccess(res, 200, "Messages retrieved.", {
      conversation: {
        ...conversation.toObject(),
        otherParticipant: otherParticipant || conversation.participants[0],
      },
      messages,
    });
  } catch (error) {
    console.error("getMessages error:", error);
    next(error);
  }
};

/**
 * @desc    Send a message in a conversation
 * @route   POST /api/messages/conversations/:id/send
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const { content } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return sendError(res, 400, "Message content cannot be empty.");
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return sendError(res, 404, "Conversation not found.");
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === senderId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return sendError(res, 403, "Unauthorized to send messages in this conversation.");
    }

    // Create the message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content: content.trim(),
    });

    // Update conversation last message & time
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name email photo avatar"
    );

    return sendSuccess(res, 201, "Message sent successfully.", {
      message: populatedMessage,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    next(error);
  }
};

/**
 * @desc    Get total unread message count for current user
 * @route   GET /api/messages/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all conversation IDs where user is participant
    const userConversations = await Conversation.find({
      participants: userId,
      isActive: true,
    }).select("_id");

    const convIds = userConversations.map((c) => c._id);

    const unreadCount = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: userId },
      isRead: false,
    });

    return sendSuccess(res, 200, "Unread count fetched.", {
      unreadCount,
    });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    next(error);
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
};

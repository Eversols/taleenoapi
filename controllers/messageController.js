const Message = require('../models/Message');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all messages between users
// @route   GET /api/v1/messages/:userId
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.id },
      ],
    })
      .sort('createdAt')
      .populate('sender', 'fullName profilePhoto')
      .populate('recipient', 'fullName profilePhoto');

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new message
// @route   POST /api/v1/messages
// @access  Private
exports.createMessage = async (req, res, next) => {
  try {
    // Check if recipient exists and is not the sender
    if (req.body.recipient === req.user.id) {
      return next(
        new ErrorResponse('You cannot send a message to yourself', 400)
      );
    }

    req.body.sender = req.user.id;
    const message = await Message.create(req.body);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete message
// @route   DELETE /api/v1/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is message sender or recipient
    if (
      message.sender.toString() !== req.user.id &&
      message.recipient.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this message`,
          401
        )
      );
    }

    await message.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
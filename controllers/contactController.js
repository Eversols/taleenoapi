const { ContactMessage } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.submit = async (req, res) => {
  try {
    const { name, email, message, subject } = req.body;
    const user_id = req.user ? req.user.id : null; // assuming you use auth middleware

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json(
        sendJson(false, 'Name, email, and message are required')
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(
        sendJson(false, 'Please provide a valid email address')
      );
    }

    // Create the message
    const contactMessage = await ContactMessage.create({
      user_id,
      name,
      email,
      subject,
      message,
    });

    return res.status(201).json(
      sendJson(true, 'Your message has been submitted successfully', {
        id: contactMessage.id,
        user_id: contactMessage.user_id,
        submittedAt: contactMessage.createdAt,
      })
    );

  } catch (err) {
    console.error('Error submitting contact message:', err);
    return res.status(500).json(
      sendJson(false, 'Failed to submit your message', {
        error: err.message,
      })
    );
  }
};
exports.getMyList = async (req, res) => {
  try {
    // Assume you have middleware that sets req.user
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.status(401).json(
        sendJson(false, 'Unauthorized: User not logged in')
      );
    }

    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Fetch only this user's records
    const { rows, count } = await ContactMessage.findAndCountAll({
      where: { user_id: userId },
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(
      sendJson(true, 'Your contact requests fetched successfully', {
        total: count,
        page,
        limit,
        data: rows,
      })
    );
  } catch (err) {
    console.error('Error fetching user contact requests:', err);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch your contact requests', {
        error: err.message,
      })
    );
  }
};
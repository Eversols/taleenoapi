const { ContactMessage } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.submit = async (req, res) => {
  try {
    const { name, email, message } = req.body;

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
      name,
      email,
      message
    });

    return res.status(201).json(
      sendJson(true, 'Your message has been submitted successfully', {
        id: contactMessage.id,
        submittedAt: contactMessage.createdAt
      })
    );

  } catch (err) {
    console.error('Error submitting contact message:', err);
    return res.status(500).json(
      sendJson(false, 'Failed to submit your message', {
        error: err.message
      })
    );
  }
};
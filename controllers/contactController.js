const { ContactMessage } = require('../models');
const { sequelize } = require('../models');
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
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.status(401).json(
        sendJson(false, 'Unauthorized: User not logged in')
      );
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Raw SQL query with JOIN
    const [rows] = await sequelize.query(
      `
      SELECT 
        cm.id,
        cm.user_id,
        cm.name AS contact_name,
        cm.email AS contact_email,
        cm.subject,
        cm.message,
        cm.createdAt,
        cm.updatedAt,
        u.username,
        u.email AS user_email
      FROM contactmessages cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.user_id = :userId
      ORDER BY cm.createdAt DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: { userId, limit, offset },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Count total records for this user
    const [[{ total }]] = await sequelize.query(
      `
      SELECT COUNT(*) AS total 
      FROM contactmessages 
      WHERE user_id = :userId
      `,
      {
        replacements: { userId },
      }
    );

    return res.status(200).json(
      sendJson(true, 'Your contact requests fetched successfully', {
        total,
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

exports.getAdminList = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.status(401).json(
        sendJson(false, 'Unauthorized: User not logged in')
      );
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Fetch all records with JOIN
    const rows = await sequelize.query(
      `
      SELECT 
        cm.id,
        cm.user_id,
        cm.name AS contact_name,
        cm.email AS contact_email,
        cm.subject,
        cm.message,
        cm.createdAt,
        cm.updatedAt,
        u.username,
        u.email AS user_email
      FROM contactmessages cm
      LEFT JOIN users u ON cm.user_id = u.id
      ORDER BY cm.createdAt DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: { limit, offset },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Count total records
    const totalResult = await sequelize.query(
      `SELECT COUNT(*) AS total FROM contactmessages`
    );
    const total = totalResult[0][0].total;

    return res.status(200).json(
      sendJson(true, 'All contact requests fetched successfully', {
        total,
        page,
        limit,
        data: rows,
      })
    );

  } catch (err) {
    console.error('Error fetching contact requests:', err);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch contact requests', {
        error: err.message,
      })
    );
  }
};



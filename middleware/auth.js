const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendJson } = require('../utils/helpers');

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      sendJson(false, 'Authorization token required')
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json(
        sendJson(false, 'User account not found or inactive')
      );
    }
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    // ✅ Check user status
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }

    req.user = user;
    next();
  } catch (err) {
    let message = 'Invalid authentication token';
    if (err.name === 'TokenExpiredError') {
      message = 'Session expired, please login again';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
    }

    return res.status(401).json(
      sendJson(false, message, { error: err.name })
    );
  }
};
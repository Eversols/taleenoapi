const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize');

// ✅ Helper for consistent API responses
const sendResponse = (res, status, success, message, data = {}) => {
  return res.status(status).json({ success, message, ...data });
};

// ✅ Register Admin
exports.register = async (req, res) => {
  try {
    if (!req.body) {
      return sendResponse(res, 400, false, 'Missing request body.');
    }

    const { username, email, phone_number, password } = req.body;

    if (!username || !email || !password) {
      return sendResponse(res, 400, false, 'Username, email, and password are required.');
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return sendResponse(res, 400, false, 'Username or email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      phone_number,
      password: hashedPassword,
      role: 'admin',
      is_verified: true
    });

    return sendResponse(res, 201, true, 'Admin registered successfully', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register Admin Error:', error);
    return sendResponse(res, 500, false, 'Server error', { error: error.message });
  }
};

// ✅ Login Admin
exports.login = async (req, res) => {
  try {
    if (!req.body) {
      return sendResponse(res, 400, false, 'Missing request body.');
    }

    console.log('REQ BODY:', req.body); // 🔍 Debugging

    const { username, password } = req.body;

    if (!username || !password) {
      return sendResponse(res, 400, false, 'Username and password are required.');
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
        role: 'admin'
      }
    });

    if (!user) {
      return sendResponse(res, 401, false, 'Invalid credentials or user is not an admin.');
    }
      const hash = await bcrypt.hash(String(password), 10);
      const isMatch = await bcrypt.compare(String(password), hash);

    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1d' }
    );

    return sendResponse(res, 200, true, 'Login successful', {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Admin Error:', error);
    return sendResponse(res, 500, false, 'Server error', { error: error.message });
  }
};

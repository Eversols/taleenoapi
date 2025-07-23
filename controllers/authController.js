const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Talent, Client } = require('../models');
// const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { generateOTP } = require('../utils/helpers');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, phone_number, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      phone_number,
      password,
      role
    });

    // Generate verification code
    const verificationCode = generateOTP();
    const verificationCodeExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.update({
      verification_code: verificationCode,
      verification_code_expire: verificationCodeExpire
    });

    // Send verification email
    // await sendVerificationEmail(user.email, verificationCode);

    // Create profile based on role
    if (role === 'talent') {
      await Talent.create({
        user_id: user.id,
        full_name: req.body.full_name || '',
        country: req.body.country || '',
        city: req.body.city || '',
        main_talent: req.body.main_talent || '',
        hourly_rate: req.body.hourly_rate || '',
        languages: req.body.languages || [],
        skills: req.body.skills || []
      });
    } else if (role === 'client') {
      await Client.create({
        user_id: user.id,
        full_name: req.body.full_name || '',
        country: req.body.country || '',
        city: req.body.city || ''
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { code } = req.params;

    const user = await User.findOne({
      where: {
        verification_code: code,
        verification_code_expire: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    await user.update({
      is_verified: true,
      verification_code: null,
      verification_code_expire: null
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '10m'
    });

    const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      reset_password_token: resetToken,
      reset_password_expire: resetPasswordExpire
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      where: {
        id: decoded.id,
        reset_password_token: token,
        reset_password_expire: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Update password
    await user.update({
      password,
      reset_password_token: null,
      reset_password_expire: null
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'verification_code', 'verification_code_expire', 'reset_password_token', 'reset_password_expire'] },
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client',
          attributes: { exclude: ['user_id', 'deleted_at'] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user details
exports.updateMe = async (req, res) => {
  try {
    const { username, email, phone_number, password } = req.body;

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone_number) updateData.phone_number = phone_number;
    if (password) updateData.password = password;

    await user.update(updateData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
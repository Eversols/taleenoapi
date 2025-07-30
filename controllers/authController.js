const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Talent, Client } = require('../models');
const { generateOTP, sendJson } = require('../utils/helpers');

exports.register = async (req, res) => {
  try {
    const { name, username, phone_number, role } = req.body;

    if (!name || !username || !phone_number) {
      return res.status(400).json(
        sendJson(false, 'Name, username, and phone number are required.')
      );
    }

    // Check for existing username or phone number
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { phone_number }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json(
        sendJson(false, 'Username or phone number already exists.')
      );
    }

    // Set default email and password
    const defaultEmail = `${username}@gmail.com`;
    const defaultPassword = await bcrypt.hash('123456', 10); // default password

    const user = await User.create({
      username,
      phone_number,
      email: defaultEmail,
      password: defaultPassword,
      role: role || 'client'
    });

    // Generate OTP
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire
    });

    // Create Talent or Client
    if (role === 'talent') {
      await Talent.create({
        user_id: user.id,
        full_name: name
      });
    } else {
      await Client.create({
        user_id: user.id,
        full_name: name
      });
    }

    return res.status(201).json(
      sendJson(true, 'OTP sent to your phone number.', {
        phone_last_4: phone_number.slice(-4),
        otp: otp,
        user_id: user.id
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Verify OTP and complete registration
exports.verifyOTP = async (req, res) => {
  try {
    const { phone_number, code } = req.body;

    const user = await User.findOne({
      where: {
        phone_number,
        verification_code: code,
        verification_code_expire: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json(
        sendJson(false, 'Invalid or expired OTP')
      );
    }

    // Mark user as verified
    await user.update({
      is_verified: true,
      verification_code: null,
      verification_code_expire: null
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    return res.status(201).json(
      sendJson(true, 'Successfully verified token.', {
        token: token,
        id: user.id,
        username: user.username,
        phone_number: user.phone_number,
        role: user.role,
        is_verified: user.is_verified
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Login with phone number (send OTP)
exports.loginWithPhone = async (req, res) => {
  try {
    const { phone_number } = req.body;

    const user = await User.findOne({ where: { phone_number } });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire
    });

    return res.status(200).json(
      sendJson(true, 'OTP sent to your phone number', {
        phone_number: phone_number.slice(-4), // Show last 4 digits for confirmation
        code: user.verification_code
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Verify OTP for login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { phone_number, code } = req.body;

    const user = await User.findOne({
      where: {
        phone_number,
        verification_code: code,
        verification_code_expire: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json(
        sendJson(false, 'Invalid or expired OTP')
      );
    }

    // Clear OTP
    await user.update({
      verification_code: null,
      verification_code_expire: null
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    return res.status(200).json(
      sendJson(true, 'Login successful', {
        token,
        user: {
          id: user.id,
          username: user.username,
          phone_number: user.phone_number,
          role: user.role,
          is_verified: user.is_verified
        }
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    const user = await User.findOne({ where: { phone_number } });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire
    });

    return res.status(200).json(
      sendJson(true, 'New OTP sent to your phone number', {
        phone_number: phone_number.slice(-4)
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'verification_code', 'verification_code_expire'] },
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client',
          attributes: { exclude: ['user_id', 'deleted_at'] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    return res.status(200).json(
      sendJson(true, 'User retrieved successfully', {
        user
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, gender, age, country, city, languages, hourly_rate } = req.body;

    const user = await User.findByPk(req.user.id, {
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client'
        }
      ]
    });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    // Update user profile based on role
    if (req.user.role === 'talent') {
      await user.talent.update({
        full_name,
        gender,
        age,
        country,
        city,
        languages,
        hourly_rate
      });
    } else {
      await user.client.update({
        full_name,
        gender,
        age,
        country,
        city
      });
    }

    return res.status(200).json(
      sendJson(true, 'Profile updated successfully', {
        user
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Talent, Client, Follow , Skill,sequelize} = require('../models');
const { generateOTP, sendJson } = require('../utils/helpers');

exports.register = async (req, res) => {
  try {
    const { username, phone_number, role } = req.body;

    if (!username || !phone_number) {
      return res.status(400).json(
        sendJson(false, 'Username and phone number are required.')
      );
    }

    // Always generate full name from username
    const usernameParts = username.split(/[\._]/); // split by . or _
    const full_name = usernameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

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
    const defaultPassword = await bcrypt.hash('123456', 10);

    const user = await User.create({
      username,
      phone_number,
      email: defaultEmail,
      password: defaultPassword,
      role: role || 'client'
    });

    // Generate OTP
    // const otp = generateOTP();
    const otp = "1234";
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire
    });

    // Create Talent or Client with full_name
    if (role === 'talent') {
      await Talent.create({
        user_id: user.id,
        full_name
      });
    } else {
      await Client.create({
        user_id: user.id,
        full_name
      });
    }

    return res.status(201).json(
      sendJson(true, 'OTP sent to your phone number.', {
        phone_last_4: phone_number.slice(-4),
        otp,
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
        verification_code_expire: { [Op.gt]: new Date() }
      },
      include: [
        {
          association: 'talent',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        },
        {
          association: 'client',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        }
      ]
    });

    if (!user) {
      return res.status(400).json({ status: false, message: 'Invalid or expired OTP' });
    }

    // mark verified
    await user.update({
      is_verified: true,
      verification_code: null,
      verification_code_expire: null
    });

    // counts
    const [followersCount, followingsCount] = await Promise.all([
      Follow.count({ where: { followingId: user.id } }),
      Follow.count({ where: { followerId: user.id } })
    ]);

    // token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    // 👉 Fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // 👉 Attach skill names to talent
    let talentData = null;
    if (user.role === 'talent' && user.talent) {
      talentData = {
        ...user.talent.toJSON(),
        skills: (user.talent.skills || []).map(s => ({
          id: s.id,
          name: skillsMap[s.id] || null,  // map id → name
          rate: s.rate
        }))
      };
    }

    // response
    const userData = {
      token,
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      on_board: user.on_board,
      notification_alert: user.notification_alert,
      followers: followersCount,
      followings: followingsCount,
      userInfo: user.role === "talent" ? talentData : user.client
    };

    return res.status(201).json({
      status: true,
      message: 'Successfully verified',
      data: userData
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error during verification',
      error: error.message
    });
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
    if (user.is_blocked) {
      return res.status(403).json(
        sendJson(false, 'Your account has been blocked. Please contact support.')
      );
    }
    // Generate OTP
    // const otp = generateOTP();
    const otp = "1234";
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

    if (user.is_blocked) {
      return res.status(403).json(
        sendJson(false, 'Your account has been blocked. Please contact support.')
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
    // const otp = generateOTP();
    const otp = "1234";
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
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    // ✅ Correct way to get uploaded file
    let profile_photo = null;
    if (req.file && req.file.filename) {
      profile_photo = `/uploads/${req.file.filename}`;
    }

    // Update based on role
    if (req.user.role === 'talent') {
      await user.talent.update({
        full_name,
        gender,
        age,
        country,
        city,
        languages,
        hourly_rate,
        profile_photo
      });
    } else {
      await user.update({ on_board: 1 });
      await user.client.update({
        full_name,
        gender,
        age,
        country,
        city,
        profile_photo
      });
      
    }

    return res.status(200).json(
      sendJson(true, 'Profile updated successfully', { user })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', { error: error.message })
    );
  }
};
exports.updateTalentDetails = async (req, res) => {
  try {
    const { skills, experience_level, availability } = req.body;

    // Validate required fields
    if (!skills && !experience_level && !availability) {
      return res.status(400).json(
        sendJson(false, 'At least one field (skills, experience_level, or availability) is required for update')
      );
    }

    // Fetch talent with user data
    const user = await User.findByPk(req.user.id, {
      include: [{
        association: 'talent',
        attributes: ['id', 'skills', 'experience_level', 'availability']
      }],
      attributes: ['id', 'username', 'email']
    });
    
    if (!user || !user.talent) {
      return res.status(404).json(
        sendJson(false, 'Talent profile not found')
      );
    }

    // Prepare update data
    const updateData = {};
    if (skills) updateData.skills = skills;
    if (experience_level) updateData.experience_level = experience_level;
    if (availability) updateData.availability = JSON.stringify(availability);

    // Update talent details
    await Talent.update(updateData, {
      where: { id: user.talent.id }
    });

    // Fetch updated talent data
    const updatedTalent = await Talent.findByPk(user.talent.id, {
      attributes: ['id', 'skills', 'experience_level', 'availability'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });
    await user.update({ on_board: 1 });
    // Parse availability if it exists
    const responseData = {
      ...updatedTalent.get({ plain: true }),
      availability: updatedTalent.availability ? JSON.parse(updatedTalent.availability) : null
    };

    return res.status(200).json(
      sendJson(true, 'Talent details updated successfully', {
        talent: responseData
      })
    );

  } catch (error) {
    console.error('Error updating talent details:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to update talent details', {
        error: error.message
      })
    );
  }
};
exports.Setnotificationalert = async (req, res) => {
  try {
    // Fetch user by ID
    let user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json(
      sendJson(false, 'Talent profile not found',)
    );
    }

    // Toggle notification_alert
    const newAlertValue = user.notification_alert == '1' ? 0 : 1;
    await user.update({ notification_alert: newAlertValue });

    // Fetch updated user with full details and relations
    const updatedUser = await User.findOne({
      where: { id: user.id },
      include: [
        {
          model: Client,  // adjust according to your associations
          as: "client"
        },
        {
          model: Talent, // adjust according to your associations
          as: "talent"
        }
      ]
    });

     return res.status(200).json(
      sendJson(true, 'Talent details updated successfully', {
         data: updatedUser
      })
    );


  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to update talent details',)
    );
  }
};

// Delete User API
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find user with relations
    const user = await User.findByPk(userId, {
      include: [
        { model: Talent, as: 'talent' },
        { model: Client, as: 'client' }
      ]
    });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    // Delete associated talent/client
    if (user.role === 'talent' && user.talent) {
      await user.talent.destroy({ force: true });
    } else if (user.role === 'client' && user.client) {
      await user.client.destroy({ force: true });
    }

    // Finally delete the user itself
    await user.destroy({ force: true });

    return res.status(200).json(
      sendJson(true, 'User deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to delete user', {
        error: error.message
      })
    );
  }
};

// Block or Unblock User API
exports.blockUser = async (req, res) => {
  try {
    const { user_id } = req.body; // 👈 ID of user to block/unblock (for admin)
    const user = await User.findByPk(user_id);

    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    // Toggle block status
    const newStatus = user.is_blocked ? 0 : 1;
    await user.update({ is_blocked: newStatus });

    return res.status(200).json(
      sendJson(true, `User ${newStatus ? 'blocked' : 'unblocked'} successfully`, {
        user_id: user.id,
        is_blocked: newStatus
      })
    );
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to block/unblock user', {
        error: error.message
      })
    );
  }
};



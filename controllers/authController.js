const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Talent, Client, Follow , Skill,Block,Media,Booking,Review,Like,BookingSlot,sequelize} = require('../models');
const { generateOTP, sendJson } = require('../utils/helpers');
const path = require("path");
const fs = require("fs");

exports.register = async (req, res) => {
  try {
    const { username, phone_number, role ,availability} = req.body;

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
      role: role || 'client',
      availability
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
    if (user.deletedAt) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
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
const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
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
      availability: user.availability,
      followers: followersCount,
      followings: followingsCount,
      userInfo: user.role === "talent"
  ? {
      ...talentData,
      profile_photo: talentData?.profile_photo
        ? `${BASE_URL}${talentData.profile_photo}`
        : null
    }
  : user.client
    ? {
        ...user.client.toJSON(), // ✅ convert Sequelize instance → plain object
        profile_photo: user.client.profile_photo
          ? `${BASE_URL}${user.client.profile_photo}`
          : null
      }
    : null

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
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
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
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
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
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
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
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
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
    const { full_name, gender, age, country, city, languages, hourly_rate, interests ,availability,skills} = req.body;

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
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
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
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    let profile_photo = req.file?.filename ? `${BASE_URL}/uploads/${req.file.filename}` : null;
     await user.update({
        availability
      });
    // Update based on role
        // Parse languages properly
    let parsedLanguages = [];

    if (Array.isArray(languages)) {
      // Case: ["1,2"] OR ["1","2"]
      parsedLanguages = languages
        .map(v => v.toString().split(",")) // split comma-separated values
        .flat()
        .map(v => v.trim())
        .filter(v => v !== "")
        .map(Number)
        .filter(v => !isNaN(v));
    } else if (typeof languages === "string") {
      // Case: "1,2"
      parsedLanguages = languages
        .split(",")
        .map(v => v.trim())
        .filter(v => v !== "")
        .map(Number);
    }


    if (req.user.role === 'talent') {
      await user.talent.update({
        full_name,
        gender,
        age,
        country,
        city,
        languages:parsedLanguages,
        hourly_rate,
        skills
        // profile_photo
      });
    } else {
      await user.update({ on_board: 1 });
      await user.client.update({
        full_name,
        gender,
        age,
        country,
        city,
        interests,
         languages:parsedLanguages,
        // profile_photo
      });
    }

    // Reload updated client/talent
    await user.reload({
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client'
        }
      ]
    });

    // Prepare interests for response
    const talents = await Talent.findAll();
    const TalentsMap = {};
    talents.forEach(t => {
      TalentsMap[t.id] = t.full_name;
    });

    let clientInterests = [];
    if (req.user.role === 'client' && user.client?.interests) {
      const interestIds = Array.isArray(user.client.interests)
        ? user.client.interests
            .map(i => i.toString().split(','))
            .flat()
            .map(id => parseInt(id))
            .filter(id => !isNaN(id))
        : [];

      clientInterests = interestIds.map(id => ({
        id,
        name: TalentsMap[id] || null
      }));
    }

        // 👉 Fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // 👉 Attach skill names to talent
    let talentData = [];
    if (user.role === 'talent' && user.talent) {
      talentData = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,  // map id → name
        rate: s.rate
      }));
    }

    const userData = user.toJSON();

    // ✅ Build unified userInfo
    let userInfo = req.user.role === 'talent' ? userData.talent : userData.client;
    if (req.user.role === 'client') userInfo.interests = clientInterests;
    if (req.user.role === 'talent') userInfo.skills = talentData;

    // ✅ Final shaped response
    const response = {
      id: userData.id,
      username: userData.username,
      phone_number: userData.phone_number,
      email: userData.email,
      role: userData.role,
      is_verified: userData.is_verified,
      on_board: userData.on_board,
      notification_alert: userData.notification_alert,
      followers: 0,   // replace with real DB count if needed
      followings: 1,  // replace with real DB count if needed
      availability: userData.availability,
      userInfo
    };

    return res.status(200).json(
      sendJson(true, 'Profile updated successfully', response)
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
    if (experience_level) updateData.experience_level = experience_level;
    if (availability) updateData.availability = JSON.stringify(availability);

    // Update talent details
    await Talent.update(updateData, {
      where: { id: user.talent.id }
    });

    // Fetch updated talent data
    const updatedTalent = await Talent.findByPk(user.talent.id, {
      attributes: ['id', 'experience_level', 'availability'],
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
    const { notification_alert } = req.body;

    if (!user) {
      return res.status(404).json(
      sendJson(false, 'Talent profile not found',)
    );
    }

    // Toggle notification_alert
    const newAlertValue = notification_alert;
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
    const { user_id } = req.body;   // 👈 user being blocked/unblocked
    const blockerId = req.user.id;  // 👈 current logged-in user (admin or talent/client)

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    // Check if block already exists
    const existingBlock = await Block.findOne({
      where: { blocker_id: blockerId, blocked_id: user_id }
    });

    if (existingBlock) {
      // ✅ Unblock
      await existingBlock.destroy();
      await user.update({ is_blocked: 0 });

      return res.status(200).json(
        sendJson(true, 'User unblocked successfully', {
          user_id: user.id,
          is_blocked: 0
        })
      );
    } else {
      // ✅ Block
      await Block.create({
        blocker_id: blockerId,
        blocked_id: user_id
      });
      await user.update({ is_blocked: 1 });

      return res.status(200).json(
        sendJson(true, 'User blocked successfully', {
          user_id: user.id,
          is_blocked: 1
        })
      );
    }
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to block/unblock user', {
        error: error.message
      })
    );
  }
};
exports.uploadProfileImage = async (req, res) => {
  const BASE_URL = process.env.APP_URL?.replace(/\/$/, "") || "";
  try {
    if (!req.file) {
      return res.status(400).json(sendJson(false, "No image uploaded"));
    }

    // ✅ Add original extension to the uploaded file
    const ext = path.extname(req.file.originalname);
    const finalFileName = req.file.filename + ext;
    const finalPath = path.join(path.dirname(req.file.path), finalFileName);

    // ✅ If file already exists → remove it
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }

    // ✅ Rename uploaded file to include extension
    fs.renameSync(req.file.path, finalPath);

    let profile_photo = `/uploads/${finalFileName}`;

    // ✅ Save into DB
    const user = await User.findByPk(req.user.id, {
      include: [
        { association: req.user.role === "talent" ? "talent" : "client" },
      ],
    });

    if (!user) {
      // Clean up uploaded file if user not found
      try {
        fs.unlinkSync(finalPath);
      } catch (err) {
        console.warn("Cleanup failed:", err.message);
      }
      return res.status(404).json(sendJson(false, "User not found"));
    }

    if (req.user.role === "talent") {
      await user.talent.update({ profile_photo });
    } else {
      await user.client.update({ profile_photo });
    }

    
    const fullurlimg = `${BASE_URL}${profile_photo}`;

    return res
      .status(200)
      .json(sendJson(true, "Profile photo updated successfully", { fullurlimg }));
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        const ext = path.extname(req.file.originalname);
        const finalPath = path.join(path.dirname(req.file.path), req.file.filename + ext);
        fs.unlinkSync(finalPath);
      } catch (err) {
        console.warn("Cleanup failed:", err.message);
      }
    }
    console.error("Profile image upload error:", error);
    return res
      .status(500)
      .json(sendJson(false, "Server error", { error: error.message }));
  }
};

// DELETE /api/talent/skills/:id
exports.deleteSkill = async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);

    const talent = await Talent.findOne({ where: { user_id: req.user.id } });

    if (!talent) {
      return res.status(404).json(sendJson(false, "Talent not found"));
    }

    // Parse skills
    let skills = [];
    if (Array.isArray(talent.skills)) {
      skills = talent.skills;
    } else if (typeof talent.skills === "string") {
      try {
        skills = JSON.parse(talent.skills);
      } catch (e) {
        skills = [];
      }
    }

    // Filter skill by ID
    const updatedSkills = skills.filter(s => parseInt(s.id) !== skillId);

    // Save back
    await talent.update({ skills: updatedSkills });

    return res.status(200).json(
      sendJson(true, "Skill deleted successfully", { skills: updatedSkills })
    );
  } catch (error) {
    console.error("Delete skill error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to delete skill", { error: error.message })
    );
  }
};
// DELETE /api/client/interests/:id
exports.deleteInterest = async (req, res) => {
  try {
    const interestId = parseInt(req.params.id);

    const client = await Client.findOne({ where: { user_id: req.user.id } });

    if (!client) {
      return res.status(404).json(sendJson(false, "Client not found"));
    }

    let interests = [];

    if (Array.isArray(client.interests)) {
      // Example: ["17,18"]
      interests = client.interests
        .map(i => i.toString().split(",")) // split "17,18" → ["17","18"]
        .flat()
        .map(i => parseInt(i))
        .filter(i => !isNaN(i));
    } else if (typeof client.interests === "string") {
      // Example: "17,18"
      interests = client.interests
        .split(",")
        .map(i => parseInt(i))
        .filter(i => !isNaN(i));
    }

    // Remove the one we want
    const updatedInterests = interests.filter(i => i !== interestId);

    // Save back in same format (string array with comma-separated values)
    const saveFormat = [updatedInterests.join(",")];

    await client.update({ interests: saveFormat });

    return res.status(200).json(
      sendJson(true, "Interest deleted successfully", { interests: saveFormat })
    );
  } catch (error) {
    console.error("Delete interest error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to delete interest", { error: error.message })
    );
  }
};

// Get all clients with full details
exports.getAllClients = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, "") || "";

    // Fetch all users with role=client including their client info
    const clients = await User.findAll({
      where: { role: "client" },
      attributes: { exclude: ["password", "verification_code", "verification_code_expire"] },
      include: [
        {
          model: Client,
          as: "client",
          attributes: { exclude: ["user_id", "createdAt", "updatedAt", "deleted_at"] },
        },
      ],
      paranoid: false, // include soft-deleted users
    });

    if (!clients || clients.length === 0) {
      return res.status(404).json(sendJson(false, "No clients found"));
    }

    // Fetch all talents (for mapping interests → names)
    const talents = await Talent.findAll({ attributes: ["id", "full_name"] });
    const TalentsMap = {};
    talents.forEach((t) => {
      TalentsMap[t.id] = t.full_name;
    });

    // Shape response data
    const response = clients.map((u) => {
      const clientInfo = u.client ? u.client.toJSON() : {};

      // 👉 Parse interests
      let clientInterests = [];
      if (clientInfo.interests) {
        const interestIds = Array.isArray(clientInfo.interests)
          ? clientInfo.interests
              .map((i) => i.toString().split(","))
              .flat()
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id))
          : typeof clientInfo.interests === "string"
          ? clientInfo.interests
              .split(",")
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id))
          : [];

        clientInterests = interestIds.map((id) => ({
          id,
          name: TalentsMap[id] || null,
        }));
      }

      return {
        id: u.id,
        username: u.username,
        phone_number: u.phone_number,
        status: u.status,
        email: u.email,
        role: u.role,
        is_verified: u.is_verified,
        on_board: u.on_board,
        notification_alert: u.notification_alert,
        availability: u.availability,
        deleted_at: u.deleted_at,
        userInfo: {
          ...clientInfo,
          interests: clientInterests,
          profile_photo: clientInfo.profile_photo
            ? `${BASE_URL}${clientInfo.profile_photo}`
            : null,
        },
      };
    });

    return res.status(200).json(sendJson(true, "Clients retrieved successfully", response));
  } catch (error) {
    console.error("Get clients error:", error);
    return res
      .status(500)
      .json(sendJson(false, "Server error while retrieving clients", { error: error.message }));
  }
};
exports.detailsUser = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ status: false, message: "id and role are required" });
    }

    // fetch user
    let user = await User.findOne({
      where: { id },
      include: [
        {
          association: "talent",
          attributes: { exclude: ["user_id", "createdAt", "updatedAt"] }
        },
        {
          association: "client",
          attributes: { exclude: ["user_id", "createdAt", "updatedAt"] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // ✅ Convert user to plain JSON
    user = user.toJSON();

    // counts
    const [followersCount, followingsCount] = await Promise.all([
      Follow.count({ where: { followingId: user.id } }),
      Follow.count({ where: { followerId: user.id } })
    ]);

    // fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ["id", "name"] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    let mediaItems = await Media.findAll({
      where: {
        userId: id
      },
      order: [["id", "DESC"]]
    });

    // ✅ Convert mediaItems to plain JSON
    mediaItems = mediaItems.map(m => m.toJSON());

    // attach skill names if talent
    let talentData = null;
    if (user.role === "talent" && user.talent) {
      talentData = {
        ...user.talent,
        skills: (user.talent.skills || []).map((s) => ({
          id: s.id,
          name: skillsMap[s.id] || null,
          rate: s.rate
        }))
      };
    }

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, "") || "";

    // Corrected media URL mapping
    mediaItems.forEach((media) => {
      if (media.fileUrl && !media.fileUrl.startsWith("http")) {
        media.fileUrl = `${BASE_URL}${media.fileUrl}`;
      }
    });

    // ✅ Reviews with rating breakdown
    let reviews = await Review.findAll({
      where: { reviewed_id: id },
      include: [
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "username", "role"],
          include: [
            { association: "talent", attributes: ["profile_photo"] },
            { association: "client", attributes: ["profile_photo"] }
          ]
        },
        { model: Booking, as: "booking", attributes: ["id", "note"] }
      ],
      order: [["created_at", "DESC"]]
    });

    // ✅ Convert reviews to plain JSON
    reviews = reviews.map(r => r.toJSON());

    // Attach extra fields (profile photo, date, likes)
    const loggedInUserId = req.user?.id || null;

    for (const rev of reviews) {
      const reviewer = rev.reviewer;

      if (reviewer) {
        let photo = null;
        if (reviewer.role === "talent" && reviewer.talent?.profile_photo) {
          photo = `${BASE_URL}${reviewer.talent.profile_photo}`;
        } else if (reviewer.role === "client" && reviewer.client?.profile_photo) {
          photo = `${BASE_URL}${reviewer.client.profile_photo}`;
        }
        rev.reviewer = {
          ...reviewer,
          profile_photo: photo
        };
      }

      rev.createdAtFormatted = new Date(rev.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });

      const likesCount = await Like.count({
        where: { talent_id: rev.reviewed_id, type: "like" }
      });

      let userLiked = false;
      if (loggedInUserId) {
        const existingLike = await Like.findOne({
          where: { user_id: loggedInUserId, talent_id: rev.reviewed_id, type: "like" }
        });
        userLiked = !!existingLike;
      }

      rev.likesCount = likesCount;
      rev.userLiked = userLiked;
    }

    const totalReviews = reviews.length;
    let rating = 0;
    let ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      reviews.forEach((rev) => {
        const r = rev.rating || 0;
        rating += r;
        if (ratingBreakdown[r] !== undefined) {
          ratingBreakdown[r] += 1;
        }
      });

      rating = parseFloat((rating / totalReviews).toFixed(1));

      Object.keys(ratingBreakdown).forEach((star) => {
        ratingBreakdown[star] = Math.round((ratingBreakdown[star] / totalReviews) * 100);
      });
    }

    let bookings = await Booking.findAll({
      where: {
        [Op.or]: [{ talent_id: id }, { client_id: id }]
      },
      attributes: [
        "id",
        "note",
        "amount",
        "status",
        "booking_date",
        "time_slot",
        "payment_status",
        "currency",
        "total_price",
        "created_at"
      ],
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "username"],
          include: [{ association: "client", attributes: ["profile_photo"] }]
        },
        {
          model: User,
          as: "talent",
          attributes: ["id", "username"],
          include: [{ association: "talent", attributes: ["profile_photo"] }]
        },
        {
          model: BookingSlot,
          as: "slots",   // ✅ New include
          attributes: ["id", "slot", "slot_date"]
        }
      ],
      order: [["created_at", "DESC"]]
    });


        // ✅ Convert bookings to plain JSON
        bookings = bookings.map(b => b.toJSON());

    const formattedBookings = bookings.map((b) => {
      return {
        ...(b.get ? b.get({ plain: true }) : b),
        createdAtFormatted: new Date(b.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }),
        client: b.client
          ? {
              ...b.client,
              profile_photo: b.client.client?.profile_photo
                ? `${BASE_URL}${b.client.client.profile_photo}`
                : null,
            }
          : null,
        talent: b.talent
          ? {
              ...b.talent,
              profile_photo: b.talent.talent?.profile_photo
                ? `${BASE_URL}${b.talent.talent.profile_photo}`
                : null,
            }
          : null,
        slots: b.slots ? b.slots.map(s => ({
          id: s.id,
          slot: s.slot,
          slot_date: s.slot_date
        })) : []
      };
    });


    const userData = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      on_board: user.on_board,
      notification_alert: user.notification_alert,
      availability: user.availability,
      followers: followersCount,
      followings: followingsCount,
      mediaItems,
      reviews,
      rating,
      totalReviews,
      ratingBreakdown,
      userInfo:
        user.role === "talent"
          ? {
              ...talentData,
              profile_photo: talentData?.profile_photo
                ? `${BASE_URL}${talentData.profile_photo}`
                : null
            }
          : user.client
          ? {
              ...user.client,
              profile_photo: user.client.profile_photo
                ? `${BASE_URL}${user.client.profile_photo}`
                : null
            }
          : null,
      bookings: formattedBookings
    };

    return res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      data: userData
    });
  } catch (error) {
    console.error("detailsUser API error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error fetching user details",
      error: error.message
    });
  }
};
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res.status(400).json(sendJson(false, 'User ID and status are required'));
    }

    const allowedStatuses = ['pending', 'approved', 'rejected', 'blocked'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json(sendJson(false, 'Invalid status value'));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    user.status = status;
    await user.save();

    // ✅ SendJson for every status
    return res.status(200).json(
      sendJson(true, `User status updated to ${status}`, {
        userId: user.id,
        status: user.status
      })
    );

  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to update user status', { error: error.message })
    );
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json(sendJson(false, "User ID is required"));
    }

    // Include soft-deleted users
    const user = await User.findByPk(userId, { paranoid: false });
    if (!user) {
      return res.status(404).json(sendJson(false, "User not found"));
    }

    if (user.deleted_at) {
      // ✅ Already soft-deleted → restore
      await user.restore();
      return res.json(sendJson(true, "User restored successfully", { userId }));
    } else {
      // ✅ Not deleted → soft delete
      await user.destroy();
      return res.json(sendJson(true, "User soft deleted successfully", { userId }));
    }
  } catch (error) {
    console.error("Toggle delete/restore error:", error);
    return res
      .status(500)
      .json(
        sendJson(false, "Failed to update user status", { error: error.message })
      );
  }
};
exports.getDashboardCounts = async (req, res) => {
  try {
    // Count clients (including soft deleted)
    const totalClients = await User.count({
      where: { role: "client" },
      paranoid: false, // count even if deleted_at is not null
    });

    // Count talents
    const totalTalents = await User.count({
      where: { role: "talent" },
      paranoid: false, // count even if deleted_at is not null
    });

    // Count bookings
    const totalBookings = await Booking.count({
      paranoid: false,
    });

    return res.status(200).json(
      sendJson(true, "Counts retrieved successfully", {
        bookings: totalBookings,
        talents: totalTalents,
        clients: totalClients,
      })
    );
  } catch (error) {
    console.error("❌ Get Dashboard Counts Error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to retrieve counts", {
        error: error.message,
      })
    );
  }
  
};
